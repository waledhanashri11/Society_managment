const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getAllComplaints, getComplaintById, createComplaint, updateComplaint, deleteComplaint, getUserComplaints } = require('../controllers/complaintController');

router.get('/', auth, adminAuth, getAllComplaints);
router.get('/user/my-complaints', auth, getUserComplaints);
router.get('/:id', auth, adminAuth, getComplaintById);
router.post('/', auth, createComplaint);
router.put('/:id', auth, adminAuth, updateComplaint);
router.delete('/:id', auth, adminAuth, deleteComplaint);

module.exports = router;
