const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getRules,
  getRuleById,
  getRuleCategories,
  createRule,
  updateRule,
  publishRule,
  unpublishRule,
  archiveRule,
  markRuleRead,
  acknowledgeRule,
  getAcknowledgementReport,
  sendRuleReminders
} = require('../controllers/ruleController');

router.get('/categories', auth, getRuleCategories);
router.get('/', auth, getRules);
router.get('/:id', auth, getRuleById);
router.post('/', auth, adminAuth, createRule);
router.put('/:id', auth, adminAuth, updateRule);
router.put('/:id/publish', auth, adminAuth, publishRule);
router.put('/:id/unpublish', auth, adminAuth, unpublishRule);
router.put('/:id/archive', auth, adminAuth, archiveRule);
router.put('/:id/read', auth, markRuleRead);
router.post('/:id/acknowledge', auth, acknowledgeRule);
router.get('/:id/acknowledgements', auth, adminAuth, getAcknowledgementReport);
router.post('/:id/reminders', auth, adminAuth, sendRuleReminders);

module.exports = router;
