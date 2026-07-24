const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const eventController = require('../controllers/eventController');

const adminOrCommitteeAuth = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'committee') {
    return res.status(403).json({ message: 'Access denied. Administrative or Committee access required.' });
  }
  next();
};

router.get('/', auth, eventController.getEvents);
router.get('/:id', auth, eventController.getEventById);
router.post('/', auth, adminOrCommitteeAuth, eventController.createEvent);
router.put('/:id', auth, adminOrCommitteeAuth, eventController.updateEvent);
router.put('/:id/status', auth, adminOrCommitteeAuth, eventController.updateEventStatus);
router.delete('/:id', auth, adminOrCommitteeAuth, eventController.deleteEvent);

module.exports = router;
