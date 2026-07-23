const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  ensureMeetingRuntimeSchema,
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  updateAgendas,
  getAttendance,
  saveAttendance,
  saveMeetingReport,
  createAction,
  updateAction,
  updateActionStatus,
  deleteAction,
  createVote,
  castVote
} = require('../controllers/meetingController');

// Helper role authentication check for administrative operations
const adminOrCommitteeAuth = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'committee') {
    return res.status(403).json({ message: 'Access denied. Administrative or Committee access required.' });
  }
  next();
};

router.use(auth);
router.use(async (req, res, next) => {
  try {
    await ensureMeetingRuntimeSchema();
    next();
  } catch (error) {
    console.error('Meeting runtime schema repair failed:', error);
    res.status(500).json({ message: 'Meeting service unavailable' });
  }
});

// Action items tracker. Keep these before /:id routes.
router.post('/actions', adminOrCommitteeAuth, createAction);
router.put('/actions/:id', adminOrCommitteeAuth, updateAction);
router.put('/actions/:id/status', updateActionStatus);
router.delete('/actions/:id', adminOrCommitteeAuth, deleteAction);

// Voting polls. Keep collection routes before /:id routes.
router.post('/votes', adminOrCommitteeAuth, createVote);

// Agendas, Attendance, and MoM reports
router.put('/:id/agenda', adminOrCommitteeAuth, updateAgendas);
router.get('/:id/attendance', adminOrCommitteeAuth, getAttendance);
// Admin/committee can submit the full roster; residents can submit only their
// own attendance through this same endpoint.
router.post('/:id/attendance', saveAttendance);
router.post('/:id/report', adminOrCommitteeAuth, saveMeetingReport);
router.post('/:id/votes/cast', castVote);

// Core meetings endpoints
router.get('/', getAllMeetings);
router.post('/', adminOrCommitteeAuth, createMeeting);
router.get('/:id', getMeetingById);
router.put('/:id', adminOrCommitteeAuth, updateMeeting);
router.delete('/:id', adminOrCommitteeAuth, deleteMeeting);

module.exports = router;
