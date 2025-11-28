// routes/promptEngineerRoutes.js
const express = require('express');
const router = express.Router();
const promptEngineerController = require('../controllers/promptEngineerController');
const requireAuth = require('../middleware/auth');

router.post('/daily', requireAuth, promptEngineerController.dailyPrompt);
router.get('/getSuggestion', requireAuth, promptEngineerController.getSuggestion);
router.put('/setRating', requireAuth, promptEngineerController.setRating);

module.exports = router;
