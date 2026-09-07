const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getResidents, createResident } = require('../controllers/residentMgmtController');
const residentImport = require('../controllers/residentImportController');

router.get('/import/template', auth, adminAuth, residentImport.template);
router.post('/import/preview', auth, adminAuth, residentImport.uploadFile, residentImport.preview);
router.post('/import/confirm', auth, adminAuth, residentImport.confirm);
router.get('/imports', auth, adminAuth, residentImport.history);
router.get('/import/:batchId/errors', auth, adminAuth, residentImport.errors);
router.get('/', auth, adminAuth, getResidents);
router.post('/', auth, adminAuth, createResident);

module.exports = router;
