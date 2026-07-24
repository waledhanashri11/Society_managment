const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getRules,
  getRulesMeta,
  createRule,
  updateRule,
  deleteRule,
  reorderRules,
  acceptRules,
  getAcceptanceReport
} = require('../controllers/rulesController');

router.get('/meta', auth, getRulesMeta);
router.get('/', auth, getRules);
router.post('/', auth, adminAuth, createRule);
router.put('/reorder', auth, adminAuth, reorderRules);
router.post('/accept', auth, acceptRules);
router.get('/acceptance-report', auth, adminAuth, getAcceptanceReport);
router.put('/:id', auth, adminAuth, updateRule);
router.delete('/:id', auth, adminAuth, deleteRule);

module.exports = router;
