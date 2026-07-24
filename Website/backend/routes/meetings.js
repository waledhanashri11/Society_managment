const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  duplicateMeeting,
  updateAgendas,
  getAttendance,
  saveAttendance,
  markAllPresent,
  selfMarkAttendance,
  saveMeetingReport,
  createAction,
  updateAction,
  deleteAction,
  createVote,
  castVote,
  getFines,
  payFine,
  waiveFine,
  addComment,
  getComments,
  getMeetingAnalytics
} = require('../controllers/meetingController');

const adminOrCommitteeAuth = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'committee') {
    return res.status(403).json({ message: 'Access denied. Administrative or Committee access required.' });
  }
  next();
};

// Analytics & Reports
router.get('/analytics/overview', auth, getMeetingAnalytics);

// Fines endpoints
router.get('/fines/list', auth, getFines);
router.post('/fines/:id/pay', auth, payFine);
router.put('/fines/:id/waive', auth, adminOrCommitteeAuth, waiveFine);

// Core meetings endpoints
router.get('/', auth, getAllMeetings);
router.get('/:id', auth, getMeetingById);
router.post('/', auth, adminOrCommitteeAuth, createMeeting);
router.put('/:id', auth, adminOrCommitteeAuth, updateMeeting);
router.delete('/:id', auth, adminOrCommitteeAuth, deleteMeeting);
router.post('/:id/duplicate', auth, adminOrCommitteeAuth, duplicateMeeting);

// Agendas & Attendance
router.put('/:id/agenda', auth, adminOrCommitteeAuth, updateAgendas);
router.get('/:id/attendance', auth, getAttendance);
router.post('/:id/attendance', auth, adminOrCommitteeAuth, saveAttendance);
router.post('/:id/attendance/mark-all-present', auth, adminOrCommitteeAuth, markAllPresent);
router.post('/:id/attendance/self', auth, selfMarkAttendance);

// Reports / Minutes (MoM)
router.post('/:id/report', auth, adminOrCommitteeAuth, saveMeetingReport);

// Comments & Q&A
router.get('/:id/comments', auth, getComments);
router.post('/:id/comments', auth, addComment);

// Action items tracker
router.post('/actions', auth, adminOrCommitteeAuth, createAction);
router.put('/actions/:id', auth, adminOrCommitteeAuth, updateAction);
router.delete('/actions/:id', auth, adminOrCommitteeAuth, deleteAction);

// Voting polls
router.post('/votes', auth, adminOrCommitteeAuth, createVote);
router.post('/:id/votes/cast', auth, castVote);

module.exports = router;
