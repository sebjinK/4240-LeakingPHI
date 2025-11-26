// controllers/aiController.js
const pool = require('../config');
require("dotenv").config();

const { InferenceClient } = require("@huggingface/inference");

const db = require("../db"); // ← if you want DB storage later

const client = new InferenceClient(process.env.HF_TOKEN);
const MODEL_ID =
  process.env.HF_MODEL_ID || "Qwen/Qwen2.5-1.5B-Instruct:featherless-ai";

/* -------------------------------------------------------------------------- */
/*                          🔥 PROMPT BUILDERS HERE 🔥                         */
/* -------------------------------------------------------------------------- */

// SYSTEM PROMPT — built from baseline, preferences, and goals tables
function buildBasisSystemPrompt(
  baseline = {},
  preferences = {},
  goals = {}
) {
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
You are the AI Health Habit Tracker, a friendly wellness assistant.

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

YOUR ROLE:
- Be supportive and non-judgmental.
- When given a daily log, acknowledge what the user did today.
- Mention progress toward their goals only when appropriate.
- Provide 1–2 small, realistic, personalized suggestions that fit their goals and preferences.
- Match the intensity of suggestions loosely to the "intensity" preference.
- Do NOT offer medical diagnoses or emergency advice.

OUTPUT FORMAT (MANDATORY):
You MUST respond using this exact structure to EVERY daily check-in:

<FEEDBACK>
[2–5 sentences of friendly, personalized, supportive feedback]
</FEEDBACK>
<FOCUS>
[one word: sleep | water | exercise | mood | nutrition | general]
</FOCUS>

Do not add anything outside these tags.
`.trim();
}

// DAILY USER PROMPT — today's check-in + last suggestion (from suggestions table)
function buildDailyUserPrompt(daily = {}, lastSuggestion = {}) {
  const {
    // daily log values – you can map these from your `entries` table or request body
    sleepHours,
    waterCups,
    meals,
    drinks,
    didExercise,
    exerciseType,
    exerciseMinutes,
    mood,
    energyLevel,
    feelingToday,
    workoutFeelingDuring,
    workoutFeelingAfter,
    workedWell,
    challenges,
    otherNotes,
  } = daily;

  // From `suggestions` table: suggestion (TEXT), rating (VARCHAR(10))
  const {
    suggestion,  // text of previous suggestion
    rating,      // how the user rated it (difficulty/effectiveness)
  } = lastSuggestion;

  return `
Here is my daily check-in:

- Sleep hours: ${sleepHours ?? "not provided"}
- Water cups: ${waterCups ?? "not provided"}
- Meals: ${meals || "not provided"}
- Drinks: ${drinks || "not provided"}

Exercise:
- Did I exercise? ${didExercise ?? "not provided"}
- Exercise type: ${exerciseType || "none"}
- Exercise minutes: ${exerciseMinutes ?? "not provided"}
- Felt during workout: ${workoutFeelingDuring || "not provided"}
- Felt after workout: ${workoutFeelingAfter || "not provided"}

Mood & Energy:
- Mood today: ${mood ?? "not provided"}
- Energy level: ${energyLevel ?? "not provided"}
- General feeling today: ${feelingToday || "not provided"}

Reflection:
- What worked well: ${workedWell || "not provided"}
- Challenges: ${challenges || "not provided"}
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
[one word: sleep | water | exercise | mood | nutrition | general]
</FOCUS>

Do not add anything outside these tags.

`.trim();
}


/* -------------------------------------------------------------------------- */
/*                     🔥 REMAINDER OF YOUR CONTROLLERS 🔥                    */
/* -------------------------------------------------------------------------- */

// helper to extract tagged content
function parseTag(text, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

async function getLastSuggestion(userId) {
    const [rows] = await db.query(
    "SELECT suggestion, rating FROM suggestions WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0] || null;
}

async function getUserIntake(userId) {
  const [[baselineRows], [preferencesRows], [goalsRows]] = await Promise.all([
    db.query("SELECT age_years, gender, height, user_weight, medical_condition, activity_level, dietary_prefrences FROM baseline WHERE user_id = ?", [userId]),
    db.query("SELECT intensity, exercise_enjoyment FROM preferences WHERE user_id = ?", [userId]),
    db.query("SELECT primary_goal, short_goal, long_goal, days_goal FROM goals WHERE user_id = ?", [userId]),
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
    const suggestion = await getLastSuggestion(userId);
    if (!suggestion) {
        return res.status(400).json({ ok: false, error: "No previous suggestion found for user." });
    }
    if (!suggestion.rating) {
        return res.status(400).json({ ok: false, error: "Previous suggestion has no rating." });
    }
    let lastSuggestion = {
        ...suggestion.suggestion,
        ...suggestion.rating
    };
    
    // fetch daily log from request body
    const daily = req.body.daily;
    if (!daily) {
        return res.status(400).json({ ok: false, error: "Daily log data is required." });
    }

    const systemPrompt = buildBasisSystemPrompt(intake);
    const userPrompt = buildDailyUserPrompt(daily, lastSuggestion);

    let full = "";

    const result = await client.chatCompletion({
      model: MODEL_ID,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    full = result.choices[0].message.content || "";

    const feedback = parseTag(full, "FEEDBACK") || full.trim();
    const focus = parseTag(full, "FOCUS") || "general";

    res.json({
      ok: true,
      feedback,
      focus
    });
  } catch (err) {
        console.error("DAILY ERROR:", err);
        res.status(500).json({ ok: false, error: "Failed to generate daily output." });
  } finally {
        conn.release();
  }
}

async function aiSuggestion(req, res) {
    const conn = await pool.getConnection();
    try {
        const userId = req.query.userId;
        
        // Fetch suggestion from DB (you need to implement this function)
        const suggestion = await getLastSuggestion(userId);

        if (!suggestion) {
            return res.json({ ok: true, error: "No suggestion found for user." });
        }

        res.json({
            ok: true,
            suggestion: suggestions.suggestion,
            rating: suggestions.rating
        })

    } catch (err) {
        console.error("AI SUGGESTION ERROR:", err);
        res.status(500).json({ ok: false, error: "Failed to get AI suggestion." });
    } finally {
        conn.release();
    }
}

module.exports = {
  systemPrompt,
  dailyPrompt,
  aiSuggestion,
};
