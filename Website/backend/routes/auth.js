const express = require('express');
const router = express.Router();
const { register, login, changePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { auth, publicAuthDatabaseContext } = require('../middleware/auth');

router.post('/register', publicAuthDatabaseContext, register);
router.post('/login', publicAuthDatabaseContext, login);
router.post('/forgot-password', publicAuthDatabaseContext, forgotPassword);
router.post('/reset-password', publicAuthDatabaseContext, resetPassword);
router.put('/change-password', auth, changePassword);

module.exports = router;
