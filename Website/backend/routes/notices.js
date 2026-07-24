const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getAllNotices,
  getLatestNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  publishNotice,
  closePoll,
  castNoticeVote,
  getNoticeStats,
  deleteNotice
} = require('../controllers/noticeController');

router.get('/stats/overview', auth, adminAuth, getNoticeStats);
router.get('/latest', auth, getLatestNotices);
router.get('/', auth, getAllNotices);
router.get('/:id', auth, getNoticeById);
router.post('/', auth, adminAuth, createNotice);
router.put('/:id', auth, adminAuth, updateNotice);
router.put('/:id/publish', auth, adminAuth, publishNotice);
router.put('/:id/poll/close', auth, adminAuth, closePoll);
router.post('/:id/vote', auth, castNoticeVote);
router.delete('/:id', auth, adminAuth, deleteNotice);

module.exports = router;
