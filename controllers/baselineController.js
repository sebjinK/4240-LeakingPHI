// controllers/baselineController.js
const pool = require('../config');

async function getBaseline(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, message: 'Not logged in.' })
  }

  try {
    const conn = await pool.getConnection();

    const baselineRows = await conn.query(
      'SELECT age_years AS ageYears, gender, height, user_weight AS userWeight, medical_condition AS medicalCondition, activity_level AS activityLevel, dietary_preferences AS dietaryPreferences FROM baseline WHERE user_id = ?',
      [req.session.userId]
    )

  } catch (err) {
    console.error('getBaseline error: ', err);
    res.status(500).json({ ok: false, message: 'Could not retrieve baseline data.' });
  }
};

async function createBaseline(req, res) {

};

async function updateBaseline(req, res) {

};

module.exports = {
  getBaseline,
  createBaseline,
  updateBaseline
};