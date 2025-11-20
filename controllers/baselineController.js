// controllers/baselineController.js
const pool = require('../config');

// Show the baseline form (pre-filled if it exists)
exports.showBaseline = async (req, res) => {
  try {
    const conn = await pool.getConnection();

    // Get user for header
    const users = await conn.query(
      'SELECT id, name, email FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (!users.length) {
      conn.release();
      return res.redirect('/login');
    }
    const user = users[0];

    // Get baseline, alias columns to match EJS
    const rows = await conn.query(
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

    conn.release();

    const baseline = rows.length ? rows[0] : {};

    res.render('baseline', {
      user,
      errors: [],
      old: baseline
    });
  } catch (err) {
    console.error('showBaseline error:', err);
    res.status(500).send('Could not load baseline');
  }
};

// Handle baseline form submission (insert/update)
exports.submitBaseline = async (req, res) => {
  const {
    goalSleep,
    goalWater,
    goalExerciseMinutes,
    goalMood,
    difficultyPreference
  } = req.body;

  try {
    const conn = await pool.getConnection();

    const existing = await conn.query(
      'SELECT id FROM baseline WHERE user_id = ?',
      [req.session.userId]
    );

    if (existing.length) {
      // Update existing baseline row
      await conn.query(
        `UPDATE baseline
         SET
           goal_sleep            = ?,
           goal_water            = ?,
           goal_exercise_minutes = ?,
           goal_mood             = ?,
           difficulty_preference = ?
         WHERE user_id = ?`,
        [
          goalSleep,
          goalWater,
          goalExerciseMinutes,
          goalMood,
          difficultyPreference,
          req.session.userId
        ]
      );
    } else {
      // Insert new baseline row
      await conn.query(
        `INSERT INTO baseline
           (user_id, goal_sleep, goal_water, goal_exercise_minutes, goal_mood, difficulty_preference)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.session.userId,
          goalSleep,
          goalWater,
          goalExerciseMinutes,
          goalMood,
          difficultyPreference
        ]
      );
    }

    conn.release();

    // After saving baseline, go to dashboard
    res.redirect('/dashboard');
  } catch (err) {
    console.error('submitBaseline error:', err);
    res.status(500).send('Could not save baseline');
  }
};
