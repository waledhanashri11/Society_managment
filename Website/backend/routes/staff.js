const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getAllStaff, getStaffById, createStaff, updateStaff, deleteStaff } = require('../controllers/staffController');

router.get('/', auth, adminAuth, getAllStaff);
router.get('/:id', auth, adminAuth, getStaffById);
router.post('/', auth, adminAuth, createStaff);
router.put('/:id', auth, adminAuth, updateStaff);
router.delete('/:id', auth, adminAuth, deleteStaff);

module.exports = router;
