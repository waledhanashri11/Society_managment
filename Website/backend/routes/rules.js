const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const rulesController = require('../controllers/rulesController');
const ruleController = require('../controllers/ruleController');

// HEAD rules controller routes (used by Website frontend)
router.get('/meta', auth, rulesController.getRulesMeta);
router.get('/', auth, rulesController.getRules);
router.post('/', auth, adminAuth, rulesController.createRule);
router.put('/reorder', auth, adminAuth, rulesController.reorderRules);
router.post('/accept', auth, rulesController.acceptRules);
router.get('/acceptance-report', auth, adminAuth, rulesController.getAcceptanceReport);
router.put('/:id', auth, adminAuth, rulesController.updateRule);
router.delete('/:id', auth, adminAuth, rulesController.deleteRule);

// Remote rule controller routes (used by Android client / advanced features)
router.get('/categories', auth, ruleController.getRuleCategories);
router.get('/:id', auth, ruleController.getRuleById);
router.put('/:id/publish', auth, adminAuth, ruleController.publishRule);
router.put('/:id/unpublish', auth, adminAuth, ruleController.unpublishRule);
router.put('/:id/archive', auth, adminAuth, ruleController.archiveRule);
router.put('/:id/read', auth, ruleController.markRuleRead);
router.post('/:id/acknowledge', auth, ruleController.acknowledgeRule);
router.get('/:id/acknowledgements', auth, adminAuth, ruleController.getAcknowledgementReport);
router.post('/:id/reminders', auth, adminAuth, ruleController.sendRuleReminders);

module.exports = router;
