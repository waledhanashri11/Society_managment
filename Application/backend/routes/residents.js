const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getResidents, createResident } = require('../controllers/residentMgmtController');

router.get('/', auth, adminAuth, getResidents);
router.post('/', auth, adminAuth, createResident);

module.exports = router;
