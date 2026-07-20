const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getAllFlatTypes,
  createFlatType,
  updateFlatType,
  deleteFlatType,
  updateFlatTypeStatus
} = require('../controllers/flatTypeController');

router.get('/', auth, getAllFlatTypes);
router.post('/', auth, adminAuth, createFlatType);
router.put('/:id', auth, adminAuth, updateFlatType);
router.delete('/:id', auth, adminAuth, deleteFlatType);
router.put('/:id/status', auth, adminAuth, updateFlatTypeStatus);

module.exports = router;
