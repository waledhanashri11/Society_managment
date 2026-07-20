const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const adminMaintenance = require('../controllers/adminMaintenanceController');

router.use(auth, adminAuth);

router.get('/maintenance/summary', adminMaintenance.getSummary);
router.get('/maintenance/bills', adminMaintenance.getBills);
router.post('/maintenance/bills', adminMaintenance.createBill);
router.post('/maintenance/bills/generate', adminMaintenance.generateBills);
router.get('/maintenance/bills/:id', adminMaintenance.getBillDetails);
router.put('/maintenance/bills/:id', adminMaintenance.updateBill);
router.delete('/maintenance/bills/:id', adminMaintenance.cancelBill);
router.post('/maintenance/bills/:id/cancel', adminMaintenance.cancelBill);
router.post('/maintenance/bills/:id/reminder', adminMaintenance.sendReminder);
router.post('/maintenance/bills/:id/penalty', adminMaintenance.applyPenalty);
router.post('/maintenance/bills/:id/waiver', adminMaintenance.applyWaiver);
router.post('/maintenance/bills/:id/record-payment', adminMaintenance.recordPayment);

router.get('/maintenance/waivers', adminMaintenance.getWaivers);
router.post('/maintenance/waivers', (req, res, next) => {
  req.params.id = req.body.billId;
  return adminMaintenance.applyWaiver(req, res, next);
});
router.get('/maintenance/reports', adminMaintenance.getReports);
router.get('/maintenance/reports/export', adminMaintenance.exportReports);

router.get('/payments/reviews', adminMaintenance.getPaymentReviews);
router.get('/payments/reviews/:id', adminMaintenance.getPaymentReviews);
router.post('/payments/reviews/:id/approve', adminMaintenance.approvePaymentReview);
router.post('/payments/reviews/:id/reject', adminMaintenance.rejectPaymentReview);
router.post('/payments/reviews/:id/clarification', adminMaintenance.clarifyPaymentReview);
router.post('/payments/reviews/:id/duplicate', adminMaintenance.duplicatePaymentReview);

router.get('/payments/transactions', adminMaintenance.getTransactions);
router.get('/payments/transactions/:id', adminMaintenance.getTransactions);
router.get('/payments/transactions/:id/receipt', adminMaintenance.getTransactions);

module.exports = router;
