// controllers/dashboardController.js
const pool = require('../config');

exports.showDashboard = async (req, res) => {
  try {
    const conn = await pool.getConnection();

    // ---- Get user ----
    const users = await conn.query(
      'SELECT id, name, email FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (!users.length) {
      conn.release();
      return res.redirect('/login');
    }
    const user = users[0];

    // ---- Get baseline (aliased to match EJS field names) ----
    const baselineRows = await conn.query(
      `SELECT
         goal_sleep            AS goalSleep,
         goal_water            AS goalWater,
         goal_exercise_minutes AS goalExerciseMinutes,
         goal_mood             AS goalMood,
         difficulty_preference AS difficultyPreference
       FROM baseline
       WHERE user_id = ?`,
      [req.session.userId]
    );
    const baseline = baselineRows.length ? baselineRows[0] : null;

    // ---- Get recent entries (aliased to match dashboard.ejs) ----
    const entries = await conn.query(
      `SELECT
         id,
         date,
         sleep_hours      AS sleepHours,
         water_cups       AS waterCups,
         exercise_minutes AS exerciseMinutes,
         mood,
         notes
       FROM entries
       WHERE user_id = ?
       ORDER BY date DESC`,
      [req.session.userId]
    );

    conn.release();

    res.render('dashboard', {
      user,
      baseline,
      entries
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Dashboard failed');
  }
};
