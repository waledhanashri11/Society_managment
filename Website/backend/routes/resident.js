const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getDashboard,
  getMaintenance,
  getComplaints,
  getVisitors,
  getParcels,
  getActivities,
  getMembers,
  updateProfile,
  getReportSummary,
  getReportMaintenance,
  getSocietyReportSummary,
  getReportExpenses,
  getMembersMaintenanceReport,
  getAllMaintenanceReport,
} = require('../controllers/residentController');

router.get('/dashboard', auth, getDashboard);
router.get('/members', auth, getMembers);
router.put('/profile', auth, updateProfile);
router.get('/reports/my-summary', auth, getReportSummary);
router.get('/reports/my-maintenance', auth, getReportMaintenance);
router.get('/reports/society-summary', auth, getSocietyReportSummary);
router.get('/reports/expenses', auth, getReportExpenses);
router.get('/reports/members-maintenance', auth, getMembersMaintenanceReport);
router.get('/reports/all-maintenance', auth, getAllMaintenanceReport);
router.get('/maintenance', auth, getMaintenance);
router.get('/complaints', auth, getComplaints);
router.get('/visitors', auth, getVisitors);
router.get('/parcels', auth, getParcels);
router.get('/activities', auth, getActivities);

module.exports = router;
