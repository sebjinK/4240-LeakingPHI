// routes/generalRoutes.js
// general routes for the application
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const user = req.session.userId || null;
  res.render('index', { user });
});

module.exports = router;
