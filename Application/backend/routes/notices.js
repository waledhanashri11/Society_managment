const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getAllNotices, getLatestNotices, getNoticeById, createNotice, deleteNotice } = require('../controllers/noticeController');

router.get('/latest', auth, getLatestNotices);
router.get('/', auth, getAllNotices);
router.get('/:id', auth, getNoticeById);
router.post('/', auth, adminAuth, createNotice);
router.delete('/:id', auth, adminAuth, deleteNotice);

module.exports = router;
