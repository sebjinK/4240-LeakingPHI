// controllers/baselineController.js
const pool = require('../config');
const buildUpdate = require('../helpers/buildPartialUpdate');

async function getBaseline(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, message: 'Not logged in.' })
  }

  userId = req.session.userId;

  try {
    const conn = await pool.getConnection();

    const [baselineRows, preferencesRows, goalsRows] = await Promise.all([
      conn.query("SELECT CAST(age_years AS CHAR) AS age_years, gender, height, user_weight, medical_condition, activity_level, dietary_prefrences FROM baseline WHERE user_id = ?", [userId]),
      conn.query("SELECT CAST(intensity AS CHAR) AS intensity, exercise_enjoyment FROM preferences WHERE user_id = ?", [userId]),
      conn.query("SELECT primary_goal, short_goal, long_goal, CAST(days_goal AS CHAR) AS days_goal FROM goals WHERE user_id = ?", [userId]),
    ]);

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
    if (conn) { conn.release(); }
  }
};

async function createBaseline(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, message: 'Not logged in.' })
  }

  userId = req.session.userId;

  try {
    const conn = await pool.getConnection();

    const {
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

    await Promise.all([
      conn.query(`INSERT INTO baseline(user_id, age_years, gender, height, user_weight, medical_condition, activity_level, dietary_preferences)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?)`, [userId, age_years, gender, height, user_weight, medical_condition, activity_level, dietary_preferences]),
      conn.query(`INSERT INTO goals (user_id, primary_goal, short_goal, long_goal, days_goal)
       VALUES (?, ?, ?, ?, ?)`, [userId, primary_goal, short_goal, long_goal, days_goal]),
      conn.query(`INSERT INTO preferences (user_id, intensity, exercise_enjoyment)
       VALUES (?, ?, ?)`, [userId, intensity, exercise_enjoyment])
    ]);

    return res.json({ ok: true, message: "Baseline updated successfully." });

  } catch (err) {
    console.error('createBaseline error: ', err);
    res.status(500).json({ ok: false, message: 'Could not set baseline data.' });
  } finally {
    if (conn) { conn.release(); }
  }
};

async function updateBaseline(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, message: 'Not logged in.' })
  }

  userId = req.session.userId;

  try {
    const conn = await pool.getConnection();

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

    const normalize = (value) => (value === "" || value === undefined ? null : value);

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


    if (baselineQuery) {
      await conn.query(baselineQuery.sql, baselineQuery.values);
    }
    if (goalsQuery) {
      await conn.query(goalsQuery.sql, goalsQuery.values);
    }
    if (preferencesQuery) {
      await conn.query(preferencesQuery.sql, preferencesQuery.values);
    }

    return res.json({ ok: true, message: "Baseline updated successfully." });

  } catch (err) {
    console.error('updateBaseline error: ', err);
    res.status(500).json({ ok: false, message: 'Could not update baseline data.' });
  } finally {
    if (conn) { conn.release(); }
  }
};

async function checkBaseline(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, message: 'Not logged in.' })
  }

  userId = req.session.userId;

  try {
    const conn = await pool.getConnection();

    const rows = await conn.query('SELECT COUNT(*) AS count FROM baseline WHERE user_id = ?', [userId]);

    const hasBaseline = rows[0].count > 0 ? true : false;

    return res.json({ ok: true, hasBaseLine });

  } catch (err) {
    console.error('checkBaseline error: ', err);
    res.status(500).json({ ok: false, message: 'Could not check baseline data.' });
  } finally {
    if (conn) { conn.release(); }
  }
};

module.exports = {
  getBaseline,
  createBaseline,
  updateBaseline,
  checkBaseline
};