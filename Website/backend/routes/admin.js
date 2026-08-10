const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { getAdminDashboard } = require('../controllers/adminDashboardController');

const router = express.Router();
router.get('/dashboard', auth, adminAuth, getAdminDashboard);

module.exports = router;
