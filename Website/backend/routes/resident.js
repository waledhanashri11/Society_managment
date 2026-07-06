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
} = require('../controllers/residentController');

router.get('/dashboard', auth, getDashboard);
router.get('/maintenance', auth, getMaintenance);
router.get('/complaints', auth, getComplaints);
router.get('/visitors', auth, getVisitors);
router.get('/parcels', auth, getParcels);
router.get('/activities', auth, getActivities);

module.exports = router;
