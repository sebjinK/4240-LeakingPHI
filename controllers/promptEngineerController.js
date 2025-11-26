// controllers/aiController.js
const pool = require('../config');
require("dotenv").config();

const { InferenceClient } = require("@huggingface/inference");

const db = require("../db"); // ← if you want DB storage later

const client = new InferenceClient(process.env.HF_TOKEN);
const MODEL_ID =
  process.env.HF_MODEL_ID || "Qwen/Qwen2.5-1.5B-Instruct:featherless-ai";

/* -------------------------------------------------------------------------- */
/*                          Local Prompt Builders                             */
/* -------------------------------------------------------------------------- */

// BUILD SYSTEM PROMPT — built from baseline, preferences, and goals tables
function buildBasisSystemPrompt() {
  return `
You are the Fitness Buddy, a friendly wellness assistant.

YOUR ROLE:
- Be supportive and non-judgmental.
- When given a daily log, acknowledge what the user did today.
- Mention progress toward their goals only when appropriate.
- Provide 1–2 small, realistic, personalized suggestions that fit their goals and preferences.
- Match the intensity of suggestions loosely to the "intensity" preference.
- Do NOT offer medical diagnoses or emergency advice.
- STRICTLY adhere to any stated medical conditions, especially injuries and dietary restrictions.
- DO NOT recommend anything that goes against stated medical conditions or dietary restrictions.

OUTPUT FORMAT (MANDATORY):
You MUST respond using this exact structure to EVERY daily check-in:

<FEEDBACK>
[2–7 sentences of friendly, personalized, supportive feedback]
</FEEDBACK>
<FOCUS>
[one word: sleep | hydration | exercise | mood | nutrition ]
</FOCUS>

Do not add anything outside these tags.
`.trim();
}

// DAILY USER PROMPT — today's check-in + last suggestion (from suggestions table)
function buildDailyUserPrompt(
  daily = {},
  lastSuggestion = {},
  baseline = {},
  preferences = {},
  goals = {}) {
  const {
    // daily log values – you can map these from your `entries` table or request body
    sleepHours,
    hydration,
    meals,
    exerciseType,
    exerciseDuration,
    energyLevel,
    workoutFeelingDuring,
    workoutFeelingAfter,
    workedWell,
    followed,
    otherNotes,
  } = daily;

  // From `suggestions` table: suggestion (TEXT), rating (VARCHAR(10))
  const {
    suggestion,  // text of previous suggestion
    rating,      // how the user rated it (difficulty/effectiveness)
  } = lastSuggestion;

  const {
    age_years,
    gender,
    height,
    user_weight,
    medical_condition,
    activity_level,
    dietary_preferences,
  } = baseline;

  const {
    intensity,              // maps to preferences.intensity
    exercise_enjoyment,     // maps to preferences.exercise_enjoyment
  } = preferences;

  const {
    primary_goal,
    short_goal,
    long_goal,
    days_goal,
  } = goals;

  return `
USER PROFILE (from baseline):
- Age (years): ${age_years ?? "unknown"}
- Gender: ${gender ?? "unknown"}
- Height: ${height ?? "unknown"}
- Weight: ${user_weight ?? "unknown"}
- Medical conditions: ${medical_condition || "none given"}

LIFESTYLE & PREFERENCES:
- Activity level: ${activity_level ?? "unknown"}
- Dietary preferences: ${dietary_preferences || "none"}
- Enjoyment / preferred exercise types: ${exercise_enjoyment || "not specified"}
- Desired difficulty of suggestions (1–10): ${intensity ?? "not specified"}

GOALS:
- Primary goal: ${primary_goal || "not specified"}
- Short-term goal(s): ${short_goal || "not specified"}
- Long-term goal(s): ${long_goal || "not specified"}
- Target exercise days per week: ${days_goal ?? "not specified"}

Here is my daily check-in:

- Sleep hours: ${sleepHours ?? "not provided"}
- Hydration: ${hydration ?? "not provided"}
- Meals: ${meals || "not provided"}

Exercise:
- Exercise type: ${exerciseType || "none"}
- Exercise duration: ${exerciseDuration ?? "not provided"}
- Felt during workout: ${workoutFeelingDuring || "not provided"}
- Felt after workout: ${workoutFeelingAfter || "not provided"}

Mood & Energy:
- Energy level: ${energyLevel ?? "not provided"}

Reflection:
- What worked well: ${workedWell || "not provided"}
- Did I follow the most recent suggesion?: ${followed || "not provided"}
- Other notes: ${otherNotes || "none"}

Previous suggestion (from your system):
- Last suggestion text: ${suggestion || "none"}
- My rating of that suggestion (or difficulty/effectiveness): ${rating || "not provided"}

Please generate feedback following the output format you were instructed to use.

Please respond ONLY using the specified tags:
<FEEDBACK>
[Your supportive feedback here]
</FEEDBACK>
<FOCUS>
[one word: sleep | hydration | exercise | mood | nutrition]
</FOCUS>

Do not add anything outside these tags.

`.trim();
}




/* -------------------------------------------------------------------------- */
/*                           Controllers/Local Helpers                        */
/* -------------------------------------------------------------------------- */

// helper to extract tagged content
function parseTag(text, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

async function getLastSuggestion(userId) {
  const [rows] = await db.query(
    "SELECT id, suggestion, rating FROM suggestions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  return rows[0] || null;
}

async function getUserIntake(userId) {
  const [[baselineRows], [preferencesRows], [goalsRows]] = await Promise.all([
    db.query("SELECT CAST(age_years AS CHAR) AS age_years, gender, height, user_weight, medical_condition, activity_level, dietary_prefrences FROM baseline WHERE user_id = ?", [userId]),
    db.query("SELECT CAST(intensity AS CHAR) AS intensity, exercise_enjoyment FROM preferences WHERE user_id = ?", [userId]),
    db.query("SELECT primary_goal, short_goal, long_goal, CAST(days_goal AS CHAR) AS days_goal FROM goals WHERE user_id = ?", [userId]),
  ]);

  const baseline = baselineRows[0] || null;
  const preferences = preferencesRows[0] || null;
  const goals = goalsRows[0] || null;

  return { baseline, preferences, goals };
}

async function dailyPrompt(req, res) {
  const conn = await pool.getConnection();

  try {
    const userId = req.body.userId;

    // Fetch user intake data
    const intakeData = await getUserIntake(userId);
    const intake = {
      ...intakeData.baseline,
      ...intakeData.preferences,
      ...intakeData.goals
    };
    // fetch last suggestion from DB
    const suggestionRow = await getLastSuggestion(userId);

    const lastSuggestion = {
      suggestion: suggestionRow?.suggestion || null,
      rating: suggestionRow?.rating || null
    };

    // fetch daily log from request body
    const daily = req.body.daily;
    if (!daily) {
      return res.status(400).json({ ok: false, error: "Daily log data is required." });
    }

    const systemPrompt = buildBasisSystemPrompt(intake);
    const userPrompt = buildDailyUserPrompt(daily, lastSuggestion);

    const result = await client.chatCompletion({
      model: MODEL_ID,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const full = result.choices[0].message.content || "";

    const feedback = parseTag(full, "FEEDBACK") || full.trim();
    const focus = parseTag(full, "FOCUS") || "none specified"

    const fullFeedback = `${feedback}\n\nWe suggest you focus on: ${focus}`;

    return res.json({
      ok: true,
      fullFeedback
    });

  } catch (err) {
    console.error("DAILY ERROR:", err);
    res.status(500).json({ ok: false, error: "Failed to generate daily output." });
  } finally {
    conn.release();
  }
}

async function getSuggestion(req, res) {
  const conn = await pool.getConnection();
  try {
    const userId = req.query.userId;

    // Fetch suggestion from DB 
    const suggestion = await getLastSuggestion(userId);

    if (!suggestion) {
      return res.json({ ok: true, error: "No suggestion found for user." });
    }

    return res.json({
      ok: true,
      suggestion: suggestion.suggestion,
      rating: suggestion.rating,
      id: suggestion.id
    })

  } catch (err) {
    console.error("RECENT SUGGESTION ERROR:", err);
    res.status(500).json({ ok: false, error: "Failed to get most recent suggestion." });
  } finally {
    conn.release();
  }
}

async function setRating(req, res) {
  const conn = await pool.getConnection();
  try {
    const userId = req.query.userId;
    const suggestionId = req.query.suggestionId;
    const rating = req.query.rating;

    await conn.execute(
      `UPDATE suggestions SET rating = ? WHERE user_id = ? and id = ?`,
      [rating, userId, suggestionId,]
    );

  } catch (err) {
    console.error("Error setting rating: ", err);
    res.status(500).json({ OK: false, error: "Failed to set rating." });
  } finally {
    conn.release();
  }
}

module.exports = {
  dailyPrompt,
  getSuggestion,
  setRating
};
