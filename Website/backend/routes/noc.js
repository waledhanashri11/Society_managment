const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const nocController = require('../controllers/nocController');

router.post('/request', auth, nocController.createRequest);
router.get('/', auth, nocController.getRequests);
router.get('/summary', auth, nocController.getSummary);
router.get('/types', auth, nocController.getTypes);
router.post('/types', auth, adminAuth, nocController.createType);
router.get('/public/:token', nocController.getPublicCertificate);
router.get('/s/:token', nocController.getSharedPdf);
router.get('/share/:token', nocController.getSharedPdf);
router.get('/:id', auth, nocController.getRequestById);
router.put('/:id/cancel', auth, nocController.cancelRequest);
router.put('/:id/review', auth, adminAuth, nocController.markUnderReview);
router.put('/:id/approve', auth, adminAuth, nocController.approveRequest);
router.put('/:id/reject', auth, adminAuth, nocController.rejectRequest);
router.post('/:id/share', auth, adminAuth, nocController.generateShareToken);
router.get('/:id/pdf', auth, nocController.getPdf);

module.exports = router;
