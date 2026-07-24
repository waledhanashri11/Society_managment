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
  duplicateMeeting,
  updateAgendas,
  getAttendance,
  saveAttendance,
  markAllPresent,
  selfMarkAttendance,
  saveMeetingReport,
  createAction,
  updateAction,
  updateActionStatus,
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

// Analytics & Reports
router.get('/analytics/overview', getMeetingAnalytics);

// Fines endpoints
router.get('/fines/list', getFines);
router.post('/fines/:id/pay', payFine);
router.put('/fines/:id/waive', adminOrCommitteeAuth, waiveFine);

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
router.post('/:id/attendance', saveAttendance);
router.post('/:id/attendance/mark-all-present', adminOrCommitteeAuth, markAllPresent);
router.post('/:id/attendance/self', selfMarkAttendance);
router.post('/:id/report', adminOrCommitteeAuth, saveMeetingReport);
router.post('/:id/votes/cast', castVote);

// Comments & Q&A
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);

// Core meetings endpoints
router.get('/', getAllMeetings);
router.post('/', adminOrCommitteeAuth, createMeeting);
router.get('/:id', getMeetingById);
router.put('/:id', adminOrCommitteeAuth, updateMeeting);
router.delete('/:id', adminOrCommitteeAuth, deleteMeeting);
router.post('/:id/duplicate', adminOrCommitteeAuth, duplicateMeeting);

module.exports = router;
