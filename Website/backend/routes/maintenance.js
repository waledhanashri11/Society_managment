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
  approvePayment,
  rejectPayment,
  getPendingVerificationPayments,
  getPaymentHistory,
  getPaymentReceipt,
  getPayments,
  markBillPaid,
  sendPaymentReminder,
  getReports,
  payMaintenanceBill,
  getSettings,
  saveSettings,
  applyPenalty
} = require('../controllers/maintenanceController');
const moduleController = require('../controllers/maintenanceModuleController');

router.get('/settings', auth, adminAuth, getSettings);
router.post('/settings', auth, adminAuth, saveSettings);
router.post('/apply-penalty', auth, adminAuth, applyPenalty);
router.get('/dashboard', auth, adminAuth, moduleController.dashboard);
router.get('/resident-categories', auth, adminAuth, moduleController.getResidentCategories);
router.get('/flats/:flatId/categories', auth, adminAuth, moduleController.getFlatCategories);
router.put('/flats/:flatId/categories', auth, adminAuth, moduleController.saveFlatCategories);
router.post('/resident-categories/bulk', auth, adminAuth, moduleController.bulkAssignResidentCategories);
router.get('/categories', auth, moduleController.listCategories);
router.post('/categories', auth, adminAuth, moduleController.createCategory);
router.put('/categories/:id', auth, adminAuth, moduleController.updateCategory);
router.delete('/categories/:id', auth, adminAuth, moduleController.deleteCategory);
router.get('/expenses', auth, adminAuth, moduleController.listExpenses);
router.post('/expenses', auth, adminAuth, moduleController.createExpense);
router.delete('/expenses/:id', auth, adminAuth, moduleController.deleteExpense);
router.get('/late-fee-rule', auth, moduleController.getLateFeeRule);
router.put('/late-fee-rule', auth, adminAuth, moduleController.saveLateFeeRule);
router.put('/bills/:id/waive-late-fee', auth, adminAuth, moduleController.waiveLateFee);
router.post('/disputes', auth, moduleController.createDispute);
router.get('/disputes', auth, adminAuth, moduleController.listDisputes);
router.get('/', auth, adminAuth, getAllMaintenance);
router.post('/', auth, adminAuth, createMaintenance);
router.post('/generate', auth, adminAuth, generateMaintenanceBills);
router.get('/bills', auth, adminAuth, getAllBills);
router.get('/bills/:id', auth, getBillById);
router.put('/bills/:id/mark-paid', auth, adminAuth, markBillPaid);
router.post('/bills/:id/reminder', auth, adminAuth, sendPaymentReminder);
router.post('/payments', auth, createPayment);
router.get('/payments/pending-verification', auth, adminAuth, getPendingVerificationPayments);
router.get('/payments/history', auth, getPaymentHistory);
router.get('/payments/:id/receipt', auth, getPaymentReceipt);
router.put('/payments/:id/approve', auth, adminAuth, approvePayment);
router.put('/payments/:id/reject', auth, adminAuth, rejectPayment);
router.put('/payments/:id', auth, adminAuth, updatePayment);
router.get('/payments', auth, adminAuth, getPayments);
router.get('/reports', auth, adminAuth, getReports);
router.get('/user/my-maintenance', auth, getUserMaintenance);
router.get('/:id', auth, adminAuth, getMaintenanceById);
router.put('/:id/pay', auth, adminAuth, payMaintenanceBill);
router.put('/:id', auth, adminAuth, updateMaintenance);
router.delete('/:id', auth, adminAuth, deleteMaintenance);

module.exports = router;
