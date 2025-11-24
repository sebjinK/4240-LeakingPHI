// routes/promptEngineerRoutes.js
const express = require('express');
const router = express.Router();
const promptEngineerController = require('../controllers/promptEngineerController');
const authMiddleware = require('../middleware/auth');

router.get('/prompt-engineer', authMiddleware, promptEngineerController.getPromptEngineerPage);
router.post('/prompt-engineer', authMiddleware, promptEngineerController.submitPromptEngineerData);

module.exports = router;
