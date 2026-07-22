const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
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

// Core meetings endpoints
router.get('/', auth, getAllMeetings);
router.get('/:id', auth, getMeetingById);
router.post('/', auth, adminOrCommitteeAuth, createMeeting);
router.put('/:id', auth, adminOrCommitteeAuth, updateMeeting);
router.delete('/:id', auth, adminOrCommitteeAuth, deleteMeeting);

// Agendas, Attendance, and MoM reports
router.put('/:id/agenda', auth, adminOrCommitteeAuth, updateAgendas);
router.get('/:id/attendance', auth, adminOrCommitteeAuth, getAttendance);
// Admin/committee can submit the full roster; residents can submit only their
// own attendance through this same endpoint.
router.post('/:id/attendance', auth, saveAttendance);
router.post('/:id/report', auth, adminOrCommitteeAuth, saveMeetingReport);

// Action items tracker
router.post('/actions', auth, adminOrCommitteeAuth, createAction);
router.put('/actions/:id', auth, adminOrCommitteeAuth, updateAction);
router.delete('/actions/:id', auth, adminOrCommitteeAuth, deleteAction);

// Voting polls
router.post('/votes', auth, adminOrCommitteeAuth, createVote);
router.post('/:id/votes/cast', auth, castVote);

module.exports = router;
