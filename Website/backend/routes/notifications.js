const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getAdminNotifications,
  markAdminNotificationsRead,
  getResidentNotifications,
  markResidentNotificationRead
} = require('../controllers/notificationController');

// Admin notification routes
router.get('/admin', auth, adminAuth, getAdminNotifications);
router.put('/admin/read', auth, adminAuth, markAdminNotificationsRead);

// Resident notification routes
router.get('/', auth, getResidentNotifications);
router.put('/:id/read', auth, markResidentNotificationRead);

module.exports = router;
