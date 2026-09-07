const express = require('express');
const router = express.Router();
const { register, login, googleLogin, changePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { auth, publicAuthDatabaseContext } = require('../middleware/auth');

router.post('/register', publicAuthDatabaseContext, register);
router.post('/login', publicAuthDatabaseContext, login);
router.post('/google', publicAuthDatabaseContext, googleLogin);
router.post('/forgot-password', publicAuthDatabaseContext, forgotPassword);
router.post('/reset-password', publicAuthDatabaseContext, resetPassword);
router.put('/change-password', auth, changePassword);

module.exports = router;
