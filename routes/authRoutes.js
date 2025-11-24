// routes/authRoutes.js
// routes for authentication
const express = require('express');
const router = express.Router();
const { showLogin, showRegister, registerUser, loginUser, logoutUser } = require('../controllers/authController');

router.get('/login', showLogin);
router.post('/login', loginUser);

router.get('/register', showRegister);
router.post('/register', registerUser);

router.get('/logout', logoutUser);

module.exports = router;
