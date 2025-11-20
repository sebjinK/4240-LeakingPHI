// routes/dashboardRoutes.js
// routes for dashboard
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { showDashboard } = require('../controllers/dashboardController');

router.get('/dashboard', requireAuth, showDashboard);

module.exports = router;
