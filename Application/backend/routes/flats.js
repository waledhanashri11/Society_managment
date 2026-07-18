const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { 
  getAllFlats, 
  getAvailableFlats, 
  getFlatById, 
  createFlat, 
  updateFlat, 
  deleteFlat,
  getCurrentResident,
  getFlatHistory,
  getFlatTransfers,
  getFlatMaintenanceHistory,
  transferFlat
} = require('../controllers/flatController');

router.get('/available', getAvailableFlats);
router.get('/', auth, adminAuth, getAllFlats);
router.post('/transfer', auth, adminAuth, transferFlat);
router.get('/:id/current-resident', auth, getCurrentResident);
router.get('/:id/history', auth, getFlatHistory);
router.get('/:id/transfers', auth, getFlatTransfers);
router.get('/:id/maintenance-history', auth, getFlatMaintenanceHistory);
router.get('/:id', auth, adminAuth, getFlatById);
router.post('/', auth, adminAuth, createFlat);
router.put('/:id', auth, adminAuth, updateFlat);
router.delete('/:id', auth, adminAuth, deleteFlat);

module.exports = router;
