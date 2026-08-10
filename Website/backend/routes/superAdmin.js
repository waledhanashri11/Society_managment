const express = require('express');
const controller = require('../controllers/superAdminController');
const { auth, superAdminAuth } = require('../middleware/auth');

const router = express.Router();
router.use(auth, superAdminAuth);
router.get('/dashboard', controller.dashboard);
router.get('/societies', controller.listSocieties);
router.post('/societies', controller.createSociety);
router.get('/societies/:id', controller.getSociety);
router.put('/societies/:id', controller.updateSociety);
router.patch('/societies/:id/status', controller.setSocietyStatus);
router.put('/societies/:id/admin', controller.manageAdmin);

module.exports = router;
