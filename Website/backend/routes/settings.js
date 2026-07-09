const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getSettings, updateSettings, getPaymentSettings } = require('../controllers/settingsController');

router.get('/payment', auth, getPaymentSettings);
router.get('/', auth, adminAuth, getSettings);
router.put('/', auth, adminAuth, updateSettings);

module.exports = router;
