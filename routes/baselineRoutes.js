// routes/baselineRoutes.js
// routes for baseline data
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { createBaseline, getBaseline, updateBaseline, checkBaseline } = require('../controllers/baselineController');

router.get('/baseline', requireAuth, getBaseline);
router.post('/baseline', requireAuth, createBaseline);
router.put('/baseline', requireAuth, updateBaseline);
router.get('/checkBaseline', requireAuth, checkBaseline);

module.exports = router;
