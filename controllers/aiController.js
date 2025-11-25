// controllers/aiController.js
// controller functions for AI suggestions
const pool = require('../config');

module.exports.aiSuggestion = async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [baselineRows, entriesRows] = await Promise.all([
      conn.query('SELECT * FROM baseline WHERE user_id = ?', [req.session.userId]),
      conn.query('SELECT * FROM entries WHERE user_id = ? ORDER BY date DESC LIMIT 1', [req.session.userId])
    ]);

    conn.release();

    const baseline = baselineRows[0] || null;
    const latestEntry = entriesRows[0] || null;

    const payload = {
      baseline,
      latestEntry,
      desiredDifficulty: baseline?.difficulty_preference || 5
    };

    res.json({ message: "LLM integration coming soon!", payload });
  } catch (err) {
    console.error('aiSuggestion error:', err);
    res.status(500).json({ message: "Error generating AI suggestion." });
  }
};
