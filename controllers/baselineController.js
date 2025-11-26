// controllers/baselineController.js
const pool = require('../config');
const buildPartialUpdate = require('../helpers/buildPartialUpdate');

async function getBaseline(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, message: 'Not logged in.' })
  }

  const userId = req.session.userId;

  const conn = await pool.getConnection();

  try {




    const baselineRows = await conn.query("SELECT CAST(age_years AS CHAR) AS age_years, gender, height, user_weight, medical_condition, activity_level, dietary_preferences FROM baseline WHERE user_id = ?", [userId]);
    const preferencesRows = await conn.query("SELECT CAST(intensity AS CHAR) AS intensity, exercise_enjoyment FROM preferences WHERE user_id = ?", [userId]);
    const goalsRows = await conn.query("SELECT primary_goal, short_goal, long_goal, CAST(days_goal AS CHAR) AS days_goal FROM goals WHERE user_id = ?", [userId]);


    const baseline = baselineRows[0] || null;
    const preferences = preferencesRows[0] || null;
    const goals = goalsRows[0] || null;

    return res.json({
      ok: true,
      baseline,
      preferences,
      goals
    });

  } catch (err) {
    console.error('getBaseline error: ', err);
    res.status(500).json({ ok: false, message: 'Could not retrieve baseline data.' });
  } finally {
    conn.release();
  }
};

async function upsertBaseline(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, message: 'Not logged in.' });
  }

  const userId = req.session.userId;
  const conn = await pool.getConnection();

  try {
    // Check if baseline exists
    const rows = await conn.query(
      'SELECT id FROM baseline WHERE user_id = ?',
      [userId]
    );

    const exists = rows.length > 0;

    const normalize = v => (v === "" || v === undefined ? null : v);
    let {
      age_years,
      gender,
      height,
      user_weight,
      medical_condition,
      activity_level,
      dietary_preferences,
      primary_goal,
      short_goal,
      long_goal,
      days_goal,
      intensity,
      exercise_enjoyment
    } = req.body;

    // Normalize values
    age_years = normalize(age_years);
    gender = normalize(gender);
    height = normalize(height);
    user_weight = normalize(user_weight);
    medical_condition = normalize(medical_condition);
    activity_level = normalize(activity_level);
    dietary_preferences = normalize(dietary_preferences);
    primary_goal = normalize(primary_goal);
    short_goal = normalize(short_goal);
    long_goal = normalize(long_goal);
    days_goal = normalize(days_goal);
    intensity = normalize(intensity);
    exercise_enjoyment = normalize(exercise_enjoyment);

    if (!exists) {
      // INSERT all 3 tables
      await conn.query(`
        INSERT INTO baseline(user_id, age_years, gender, height, user_weight, medical_condition, activity_level, dietary_preferences)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, age_years, gender, height, user_weight, medical_condition, activity_level, dietary_preferences]
      );

      await conn.query(`
        INSERT INTO goals(user_id, primary_goal, short_goal, long_goal, days_goal)
        VALUES (?, ?, ?, ?, ?)`,
        [userId, primary_goal, short_goal, long_goal, days_goal]
      );

      await conn.query(`
        INSERT INTO preferences(user_id, intensity, exercise_enjoyment)
        VALUES (?, ?, ?)`,
        [userId, intensity, exercise_enjoyment]
      );

      return res.json({ ok: true, message: "Baseline created successfully." });
    }

    // 🛠 If exists → update using your existing update logic
    const baselineQuery = buildPartialUpdate('baseline', userId, {
      age_years,
      gender,
      height,
      user_weight,
      medical_condition,
      activity_level,
      dietary_preferences
    });

    const goalsQuery = buildPartialUpdate('goals', userId, {
      primary_goal,
      short_goal,
      long_goal,
      days_goal
    });

    const preferencesQuery = buildPartialUpdate('preferences', userId, {
      intensity,
      exercise_enjoyment
    });

    if (baselineQuery) await conn.query(baselineQuery.sql, baselineQuery.values);
    if (goalsQuery) await conn.query(goalsQuery.sql, goalsQuery.values);
    if (preferencesQuery) await conn.query(preferencesQuery.sql, preferencesQuery.values);

    return res.json({ ok: true, message: "Baseline updated successfully." });

  } catch (err) {
    console.error('upsertBaseline error:', err);
    res.status(500).json({ ok: false, message: 'Database error.' });
  } finally {
    conn.release();
  }
}


async function checkBaseline(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, message: 'Not logged in.' })
  }

  const userId = req.session.userId;
  const conn = await pool.getConnection();

  try {


    const rows = await conn.query('SELECT COUNT(*) AS count FROM baseline WHERE user_id = ?', [userId]);

    const hasBaseline = rows[0].count > 0 ? true : false;

    return res.json({ ok: true, hasBaseline });

  } catch (err) {
    console.error('checkBaseline error: ', err);
    res.status(500).json({ ok: false, message: 'Could not check baseline data.' });
  } finally {
    conn.release();
  }
};

module.exports = {
  getBaseline,
  //createBaseline,
  //updateBaseline,
  upsertBaseline,
  checkBaseline
};