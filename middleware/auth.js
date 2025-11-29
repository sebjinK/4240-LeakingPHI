// middleware/auth.js
// ensures the user is logged in and exists in DB

const pool = require('../config');

module.exports = async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const conn = await pool.getConnection();
    const rows = await conn.query(
      "SELECT id FROM users WHERE id = ?",
      [req.session.userId]
    );
    conn.release();

    if (rows.length === 0) {
      return res.redirect('/login');
    }

    next();
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
};
