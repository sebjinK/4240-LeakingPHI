// routes/aiRoutes.js
// routes for AI suggestions
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { aiSuggestion } = require('../controllers/aiController');

router.post('/suggestions', requireAuth, aiSuggestion);

module.exports = router;
