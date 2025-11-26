// routes/generalRoutes.js
// general routes for the application
const express = require('express');
const router = express.Router();
const pool = require('../config');
const generalController = require('../controllers/generalController');

router.get('/', generalController.general);

module.exports = router;
