// routes/promptEngineerRoutes.js
const express = require('express');
const router = express.Router();
const promptEngineerController = require('../controllers/promptEngineerController');
const authMiddleware = require('../middleware/auth');

router.post('/daily', dailyPrompt);
router.get('/aiSuggestion', aiSuggestion);

module.exports = router;
