const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getAllComplaints, getComplaintById, createComplaint, updateComplaint, deleteComplaint, getUserComplaints, confirmComplaintResolved, reopenComplaint } = require('../controllers/complaintController');

router.get('/', auth, adminAuth, getAllComplaints);
router.get('/user/my-complaints', auth, getUserComplaints);
router.get('/:id', auth, adminAuth, getComplaintById);
router.post('/', auth, createComplaint);
router.put('/:id', auth, adminAuth, updateComplaint);
router.put('/:id/confirm-resolved', auth, confirmComplaintResolved);
router.put('/:id/reopen', auth, reopenComplaint);
router.delete('/:id', auth, deleteComplaint);

module.exports = router;
