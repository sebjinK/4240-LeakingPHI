// controllers/aiController.js
const pool = require('../config');
require("dotenv").config();
const { chatCompletion } = require('../helpers/hfChat');
const { InferenceClient } = require("@huggingface/inference");

const client = new InferenceClient(process.env.HF_TOKEN);
const MODEL_ID = process.env.HF_MODEL_ID || "Qwen/Qwen2.5-0.5B-Instruct:featherless-ai";


const safeString = (value) => {
  if (value === undefined || value === null) return "not provided";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};


/* -------------------------------------------------------------------------- */
/*                          Local Prompt Builders                             */
/* -------------------------------------------------------------------------- */

// BUILD SYSTEM PROMPT — built from baseline, preferences, and goals tables
function buildBasisSystemPrompt() {
  return safeString(`
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
`.trim());
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

  return safeString(`
      USER PROFILE (from baseline):
      - Age (years): ${safeString(age_years)}
      - Gender: ${safeString(gender)}
      - Height: ${safeString(height)}
      - Weight: ${safeString(user_weight)}
      - Medical conditions: ${safeString(medical_condition)}

      LIFESTYLE & PREFERENCES:
      - Activity level: ${safeString(activity_level)}
      - Dietary preferences: ${safeString(dietary_preferences)}
      - Enjoyment / preferred exercise types: ${safeString(exercise_enjoyment)}
      - Desired difficulty of suggestions (1–10): ${safeString(intensity)}

      GOALS:
      - Primary goal: ${safeString(primary_goal)}
      - Short-term goal(s): ${safeString(short_goal)}
      - Long-term goal(s): ${safeString(long_goal)}
      - Target exercise days per week: ${safeString(days_goal)}

      Here is my daily check-in:

      - Sleep hours: ${safeString(sleepHours)}
      - Hydration: ${safeString(hydration)}
      - Meals: ${safeString(meals)}

      Exercise:
      - Exercise type: ${safeString(exerciseType)}
      - Exercise duration: ${safeString(exerciseDuration)}
      - Felt during workout: ${safeString(workoutFeelingDuring)}
      - Felt after workout: ${safeString(workoutFeelingAfter)}

      Mood & Energy:
      - Energy level: ${safeString(energyLevel)}

      Reflection:
      - What worked well: ${safeString(workedWell)}
      - Did I follow the most recent suggesion?: ${safeString(followed)}
      - Other notes: ${safeString(otherNotes)}

      Previous suggestion (from your system):
      - Last suggestion text: ${safeString(suggestion)}
      - My rating of that suggestion (or difficulty/effectiveness): ${safeString(rating)}

      Please generate feedback following the output format you were instructed to use.

      Please respond ONLY using the specified tags:
      <FEEDBACK>
      [Your supportive feedback here]
      </FEEDBACK>
      <FOCUS>
      [one word: sleep | hydration | exercise | mood | nutrition]
      </FOCUS>

      Do not add anything outside these tags.

      `.trim());
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
  const conn = await pool.getConnection();
  const rows = await conn.query(
    "SELECT id, suggestion, rating FROM suggestions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  conn.release();
  return rows[0] || null;
}

async function getUserIntake(userId) {
  const conn = await pool.getConnection();
  const baselineRows = await conn.query("SELECT CAST(age_years AS CHAR) AS age_years, gender, height, user_weight, medical_condition, activity_level, dietary_preferences FROM baseline WHERE user_id = ?", [userId]);
  const preferencesRows = await conn.query("SELECT CAST(intensity AS CHAR) AS intensity, exercise_enjoyment FROM preferences WHERE user_id = ?", [userId]);
  const goalsRows = await conn.query("SELECT primary_goal, short_goal, long_goal, CAST(days_goal AS CHAR) AS days_goal FROM goals WHERE user_id = ?", [userId]);


  const baseline = baselineRows[0] || null;
  const preferences = preferencesRows[0] || null;
  const goals = goalsRows[0] || null;

  conn.release();
  return { baseline, preferences, goals };
}

async function dailyPrompt(req, res) {
  const conn = await pool.getConnection();

  try {
    const userId = req.session.userId;

    // Fetch user intake data
    const { baseline, goals, preferences } = await getUserIntake(userId);
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

    const systemPrompt = buildBasisSystemPrompt();
    const userPrompt = buildDailyUserPrompt(daily, lastSuggestion, baseline, preferences, goals);

      // Call the local Qwen model via FastAPI

      // Qwen local /generate expects a JSON array of messages (not an object with `messages`)
      const assistUrl = process.env.ASSIST_API_URL || 'http://localhost:5005/generate';
      const assistResponse = await fetch(assistUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]),
      });


      if (!assistResponse.ok) {
        const errText = await assistResponse.text();
        throw new Error("Qwen error: " + assistResponse.status + " " + errText);
      }

      const assistData = await assistResponse.json();

      // Extract only the assistant's response (not the full chat transcript)
      let full = assistData.generated_text || assistData.assistant || JSON.stringify(assistData);
      
      // The generated_text includes the full chat. Extract only the assistant's final reply.
      // Format is typically: "system\n...\nuser\n...\nassistant\n<FEEDBACK>...</FEEDBACK>\n<FOCUS>...</FOCUS>"
      const assistantMatch = full.match(/assistant\s*\n([\s\S]*?)$/i);
      if (assistantMatch && assistantMatch[1]) {
        full = assistantMatch[1].trim();
      }

  const feedback = parseTag(full, "FEEDBACK") || full.trim();
  const focus = parseTag(full, "FOCUS") || "none specified"

    const fullFeedback = `${feedback}\n\nWe suggest you focus on: ${focus}`;

    return res.json({
      ok: true,
      fullFeedback
    });

  } catch (err) {
      console.error("[dailyPrompt] ERROR:", err.message || err);
      if (err.stack) console.error("[dailyPrompt] Stack:", err.stack);
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
    const userId = req.session.userId;
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
