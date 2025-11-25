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

// SYSTEM PROMPT — created from intake answers
function buildBasisSystemPrompt(intake = {}) {
  const {
    age,
    gender,
    height,
    weight,
    medicalConditions,
    difficulty,
    activityLevel,
    exerciseType,
    mealsPerDay,
    dietPreferences,
    primaryGoal,
    shortTermGoals,
    longTermGoals,
    exerciseDaysPerWeek,
    motivation,
    selfHealthRating,
    goalConfidence
  } = intake;

  return `
You are the AI Health Habit Tracker, a friendly wellness assistant. Your response will be under 4000 characters and no more.

USER PROFILE (from initial intake):
- Age: ${age ?? "unknown"}
- Gender: ${gender ?? "unknown"}
- Height: ${height ?? "unknown"}
- Weight: ${weight ?? "unknown"}
- Medical conditions: ${medicalConditions || "none given"}

LIFESTYLE & PREFERENCES:
- Activity level: ${activityLevel ?? "unknown"}
- Preferred exercise type: ${exerciseType ?? "unknown"}
- Meals per day: ${mealsPerDay ?? "unknown"}
- Dietary preferences: ${dietPreferences || "none"}
- Desired difficulty of suggestions (1–10): ${difficulty ?? "not specified"}

GOALS:
- Primary goal: ${primaryGoal || "not specified"}
- Short-term goals: ${shortTermGoals || "not specified"}
- Long-term goals: ${longTermGoals || "not specified"}
- Target exercise days per week: ${exerciseDaysPerWeek ?? "not specified"}
- Motivation: ${motivation || "not specified"}

SELF-ASSESSMENT:
- Health rating (1–10): ${selfHealthRating ?? "not specified"}
- Confidence in reaching goals (1–10): ${goalConfidence ?? "not specified"}

YOUR ROLE:
- Be supportive and non-judgmental.
- When given a daily log, acknowledge what the user did today.
- Mention progress toward their goals only when appropriate.
- Provide 1–2 small, realistic, personalized suggestions.
- Match the intensity of suggestions to the user's desired difficulty.
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
function buildDailyUserPrompt(daily = {}, lastSuggestion = {}) {
  const {
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
    otherNotes
  } = daily;

  const { previousFeedback, previousFocus, previousFollowed } = lastSuggestion;

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

Previous suggestion:
- Last focus: ${previousFocus || "none"}
- Last suggestion text: ${previousFeedback || "none"}
- Did I follow it? ${previousFollowed || "not provided"}

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

    const stream = client.chatCompletionStream({
      model: MODEL_ID,
      messages: [
        { role: "system", content: sysPrompt },
        {
          role: "user",
          content: "Create the baseline summary and plan in the required format.",
        },
      ],
    });

    for await (const chunk of stream) {
      full += chunk.choices?.[0]?.delta?.content ?? "";
    }

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

    const stream = client.chatCompletionStream({
      model: MODEL_ID,
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    for await (const chunk of stream) {
      full += chunk.choices?.[0]?.delta?.content ?? "";
    }

    const feedback = parseTag(full, "FEEDBACK") || full.trim();
    const focus = parseTag(full, "FOCUS") || "general";

    res.json({
      ok: true,
      feedback,
      focus,
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
