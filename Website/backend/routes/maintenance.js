const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  generateMaintenanceBills,
  updateMaintenance,
  deleteMaintenance,
  getUserMaintenance,
  getAllBills,
  getBillById,
  createPayment,
  updatePayment,
  getPayments,
  getReports
} = require('../controllers/maintenanceController');

router.get('/', auth, adminAuth, getAllMaintenance);
router.post('/', auth, adminAuth, createMaintenance);
router.post('/generate', auth, adminAuth, generateMaintenanceBills);
router.get('/bills', auth, adminAuth, getAllBills);
router.get('/bills/:id', auth, getBillById);
router.post('/payments', auth, createPayment);
router.put('/payments/:id', auth, adminAuth, updatePayment);
router.get('/payments', auth, adminAuth, getPayments);
router.get('/reports', auth, adminAuth, getReports);
router.get('/user/my-maintenance', auth, getUserMaintenance);
router.get('/:id', auth, adminAuth, getMaintenanceById);
router.put('/:id', auth, adminAuth, updateMaintenance);
router.delete('/:id', auth, adminAuth, deleteMaintenance);

module.exports = router;
