const router = require('express').Router();
const { auth, adminAuth } = require('../middleware/auth');
const c = require('../controllers/reportsController');
const monthlyCtrl = require('../controllers/monthlyMaintenanceReportController');
const dayWise = require('../controllers/dayWiseStatementController');
const overall = require('../controllers/overallReportController');

// Existing reports routes
router.get('/admin/annual', auth, c.adminAnnual);
router.get('/admin/monthly', auth, c.adminMonthly);
router.post('/admin/opening-balance', auth, c.setupOpening);
router.get('/overall', auth, adminAuth, overall.getOverallReport);
router.get('/resident/transparency', auth, c.residentTransparency);
router.get('/resident/payment-status', auth, c.residentPayments);
router.get('/admin/day-wise-statement', auth, adminAuth, dayWise.view);
router.get('/admin/day-wise-statement/excel', auth, adminAuth, dayWise.excel);
router.get('/admin/day-wise-statement/pdf', auth, adminAuth, dayWise.pdf);

// Complete Monthly Maintenance Report Module APIs
router.get('/maintenance/monthly-report', auth, monthlyCtrl.getMonthlyReport);
router.get('/maintenance/dashboard-summary', auth, monthlyCtrl.getDashboardSummary);
router.get('/maintenance/12-month-history', auth, monthlyCtrl.get12MonthCollectionHistory);
router.get('/maintenance/payment-modes', auth, monthlyCtrl.getPaymentModeReport);
router.get('/maintenance/resident-ledger', auth, monthlyCtrl.getResidentLedger);
router.post('/maintenance/write-off', auth, adminAuth, monthlyCtrl.applyWriteOff);
router.put('/maintenance/payments/:id/approve', auth, monthlyCtrl.approvePaymentWorkflow);
router.put('/maintenance/payments/:id/reject', auth, monthlyCtrl.rejectPaymentWorkflow);
router.get('/maintenance/receipts/:payment_id', auth, monthlyCtrl.getPaymentReceipt);

module.exports = router;
