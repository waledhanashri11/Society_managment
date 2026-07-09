const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getAllFlats, getAvailableFlats, getFlatById, createFlat, updateFlat, deleteFlat } = require('../controllers/flatController');

router.get('/available', getAvailableFlats);
router.get('/', auth, adminAuth, getAllFlats);
router.get('/:id', auth, adminAuth, getFlatById);
router.post('/', auth, adminAuth, createFlat);
router.put('/:id', auth, adminAuth, updateFlat);
router.delete('/:id', auth, adminAuth, deleteFlat);

module.exports = router;
