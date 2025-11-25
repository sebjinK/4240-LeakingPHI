// controllers/aiController.js
require("dotenv").config();
const { InferenceClient } = require("@huggingface/inference");
// const db = require("../db"); // ← if you want DB storage later

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

// DAILY USER PROMPT — today’s check-in answers
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

async function systemPrompt(req, res) {
  try {
    const intake = req.body.intake || {};
    const sysPrompt = buildBasisSystemPrompt(intake);

    let full = "";
    const result = await client.chatCompletion({
    model: MODEL_ID,
    messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Create the baseline summary and plan" }
    ]
    });

    full = result.choices[0].message.content || "";

    const baselineSummary = parseTag(full, "BASELINE_SUMMARY") || full.trim();
    const baselinePlan = parseTag(full, "BASELINE_PLAN");
    const baselineFocus = parseTag(full, "BASELINE_FOCUS") || "general";

    res.json({
      ok: true,
      baselineSummary,
      baselinePlan,
      baselineFocus,
    });
  } catch (err) {
    console.error("BASIS ERROR:", err);
    res.status(500).json({ ok: false, error: "Failed to generate basis output." });
  }
}

async function dailyPrompt(req, res) {
  try {
    const intake = req.body.intake || {};
    const daily = req.body.daily || {};
    const lastSuggestion = req.body.lastSuggestion || {};

    const sysPrompt = buildBasisSystemPrompt(intake);
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
  }
}

async function aiSuggestion(req, res) {
  res.json({
    ok: true,
    message: "Not implemented yet — connect this to your DB.",
  });
}

module.exports = {
  systemPrompt,
  dailyPrompt,
  aiSuggestion,
};
