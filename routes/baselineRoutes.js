// routes/baselineRoutes.js
// routes for baseline data
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const baseLineController = require('../controllers/baselineController');

router.get('/baseline', requireAuth, baseLineController.getBaseline);
// router.post('/baseline', requireAuth, baseLineController.createBaseline);
// router.put('/baseline', requireAuth, baseLineController.updateBaseline);
router.post('/baseline', requireAuth, baseLineController.upsertBaseline);
router.put('/baseline', requireAuth, baseLineController.upsertBaseline);
router.get('/checkBaseline', requireAuth, baseLineController.checkBaseline);

module.exports = router;
