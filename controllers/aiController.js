// controllers/aiController.js
// controller functions for AI suggestions
let users = global.users || [];
let entries = global.entries || [];

module.exports.aiSuggestion = (req, res) => {
  const user = users.find(u => u.id === req.session.userId);

  const payload = {
    baseline: user.baseline,
    latestEntry: entries
      .filter(e => e.userId === user.id)
      .sort((a,b) => new Date(b.date) - new Date(a.date))[0] || null,
    desiredDifficulty: user.baseline?.difficultyPreference || 5
  };

  res.json({ message: "LLM integration coming soon!", payload });
};
