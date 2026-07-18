const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getAllUsers, getUserById, createUser, updateUser, updateUserStatus, deleteUser } = require('../controllers/userController');

router.get('/', auth, adminAuth, getAllUsers);
router.put('/:id/status', auth, adminAuth, updateUserStatus);
router.get('/:id', auth, adminAuth, getUserById);
router.post('/', auth, adminAuth, createUser);
router.put('/:id', auth, adminAuth, updateUser);
router.delete('/:id', auth, adminAuth, deleteUser);

module.exports = router;
