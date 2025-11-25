// routes/generalRoutes.js
// general routes for the application
const express = require('express');
const router = express.Router();
const pool = require('../config');

router.get('/', async (req, res) => {
  let user = null;
  if (req.session.userId) {
    try {
      const conn = await pool.getConnection();
      const rows = await conn.query('SELECT id, name, email FROM users WHERE id = ?', [req.session.userId]);
      conn.release();
      if (rows.length > 0) {
        user = rows[0];
      }
    } catch (err) {
      console.error('Error fetching user for / route:', err);
      // Fail gracefully
    }
  }
  res.render('index', { user });
});

module.exports = router;
