// routes/baselineRoutes.js
// routes for baseline data
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { showBaseline, submitBaseline } = require('../controllers/baselineController');

router.get('/baseline', requireAuth, showBaseline);
router.post('/baseline', requireAuth, submitBaseline);

module.exports = router;
