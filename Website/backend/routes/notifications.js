const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getAdminNotifications,
  markAdminNotificationsRead,
  getResidentNotifications,
  markResidentNotificationsRead,
  markResidentNotificationRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notificationController');

// Admin notification routes
router.get('/admin', auth, adminAuth, getAdminNotifications);
router.put('/admin/read', auth, adminAuth, markAdminNotificationsRead);
router.delete('/admin/read', auth, adminAuth, markAdminNotificationsRead);
router.delete('/admin/:id', auth, adminAuth, deleteNotification);

// Resident notification routes
router.get('/', auth, getResidentNotifications);
router.put('/read', auth, markResidentNotificationsRead);
router.put('/:id/read', auth, markResidentNotificationRead);
router.delete('/read', auth, deleteAllNotifications);
router.delete('/', auth, deleteAllNotifications);
router.delete('/:id', auth, deleteNotification);

module.exports = router;
