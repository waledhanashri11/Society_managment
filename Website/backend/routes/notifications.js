const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getAdminNotifications, markAdminNotificationsRead } = require('../controllers/notificationController');

router.get('/admin', auth, adminAuth, getAdminNotifications);
router.put('/admin/read', auth, adminAuth, markAdminNotificationsRead);

module.exports = router;
