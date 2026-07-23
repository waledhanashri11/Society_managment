const fs = require('fs');
const path = require('path');
const { promisePool } = require('../config/database');
const { buildPublicFileUrl } = require('../utils/fileUrl');

const saveBase64File = (base64Data, originalFileName) => {
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid file format. Must be base64 data url.');
  }
  const fileBuffer = Buffer.from(match[2], 'base64');
  const extension = path.extname(originalFileName);
  const uniqueName = `meeting-doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
  const uploadDir = path.join(__dirname, '..', 'uploads', 'meetings');
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, uniqueName), fileBuffer);
  return {
    filePath: `/uploads/meetings/${uniqueName}`,
    fileName: originalFileName,
    fileType: match[1]
  };
};

const withPublicDocumentUrls = (req, documents = []) => documents.map((doc) => {
  const publicUrl = buildPublicFileUrl(req, doc.file_path, { mustExist: true, rootDir: path.resolve(__dirname, '..') });
  return {
    ...doc,
    file_url: publicUrl,
    file_path: publicUrl || doc.file_path
  };
});

// GET /api/meetings
const getAllMeetings = async (req, res) => {
  try {
    const { meeting_type, status, priority, date, title } = req.query;
    let query = `
      SELECT m.*, 
             COALESCE(att.present_count, 0) AS present_count,
             COALESCE(att.total_count, 0) AS total_count,
             (CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END) AS has_report,
             (CASE WHEN v.id IS NOT NULL THEN TRUE ELSE FALSE END) AS has_voting
      FROM meetings m
      LEFT JOIN (
        SELECT meeting_id, 
               SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_count,
               COUNT(*) AS total_count
        FROM meeting_attendance
        GROUP BY meeting_id
      ) att ON att.meeting_id = m.id
      LEFT JOIN meeting_reports r ON r.meeting_id = m.id
      LEFT JOIN meeting_votes v ON v.meeting_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (meeting_type) {
      query += ` AND m.meeting_type = ?`;
      params.push(meeting_type);
    }
    if (status) {
      query += ` AND m.status = ?`;
      params.push(status);
    }
    if (priority) {
      query += ` AND m.priority = ?`;
      params.push(priority);
    }
    if (date) {
      query += ` AND m.meeting_date = ?`;
      params.push(date);
    }
    if (title) {
      query += ` AND m.title ILIKE ?`;
      params.push(`%${title}%`);
    }

    query += ` ORDER BY m.meeting_date DESC, m.start_time DESC`;

    const [rows] = await promisePool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/meetings/:id
const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;
    const [meetings] = await promisePool.query('SELECT * FROM meetings WHERE id = ?', [id]);
    if (meetings.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const meeting = meetings[0];

    // Fetch agendas
    const [agendas] = await promisePool.query(
      'SELECT * FROM meeting_agendas WHERE meeting_id = ? ORDER BY order_index ASC',
      [id]
    );

    // Fetch report / MoM
    const [reports] = await promisePool.query('SELECT * FROM meeting_reports WHERE meeting_id = ?', [id]);
    const report = reports[0] || null;

    // Fetch actions
    const [actions] = await promisePool.query(`
      SELECT ma.*, u.name as assignee_name, u.email as assignee_email
      FROM meeting_actions ma
      LEFT JOIN users u ON ma.assigned_to = u.id
      WHERE ma.meeting_id = ?
      ORDER BY ma.created_at ASC
    `, [id]);

    // Fetch documents
    const [documents] = await promisePool.query('SELECT * FROM meeting_documents WHERE meeting_id = ?', [id]);

    // Fetch voting
    const [votes] = await promisePool.query('SELECT * FROM meeting_votes WHERE meeting_id = ?', [id]);
    const vote = votes[0] || null;

    let hasVoted = false;
    let myChoice = null;
    if (vote) {
      const [voted] = await promisePool.query(
        'SELECT choice FROM meeting_resident_votes WHERE vote_id = ? AND resident_id = ?',
        [vote.id, req.user.id]
      );
      if (voted.length > 0) {
        hasVoted = true;
        myChoice = voted[0].choice;
      }
    }

    // Fetch resident attendance status
    const [att] = await promisePool.query(
      'SELECT status FROM meeting_attendance WHERE meeting_id = ? AND resident_id = ?',
      [id, req.user.id]
    );
    const myAttendance = att[0]?.status || null;

    res.json({
      ...meeting,
      agendas,
      report,
      actions,
      documents: withPublicDocumentUrls(req, documents),
      vote: vote ? { ...vote, has_voted: hasVoted, my_choice: myChoice } : null,
      my_attendance: myAttendance
    });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/meetings
const createMeeting = async (req, res) => {
  try {
    const { title, meeting_type, meeting_date, start_time, end_time, venue, description, priority, notify_residents = false, documents = [] } = req.body;

    if (!title || !meeting_type || !meeting_date || !start_time || !end_time || !venue) {
      return res.status(400).json({ message: 'Meeting Title, Type, Date, Start Time, End Time and Venue are required' });
    }

    if (end_time <= start_time) {
      return res.status(400).json({ message: 'Meeting End Time must be after Start Time' });
    }

    // Duplicate venue booking overlap validation
    const [overlap] = await promisePool.query(
      `SELECT id, title FROM meetings 
       WHERE venue = ? AND meeting_date = ? AND status != 'Cancelled'
         AND start_time < ? AND end_time > ?`,
      [venue, meeting_date, end_time, start_time]
    );

    if (overlap.length > 0) {
      return res.status(409).json({ 
        message: `Venue '${venue}' is already booked for meeting '${overlap[0].title}' during this time window.` 
      });
    }

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO meetings (title, meeting_type, meeting_date, start_time, end_time, venue, description, priority, notify_residents, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
        [title, meeting_type, meeting_date, start_time, end_time, venue, description || null, priority || 'Normal', notify_residents]
      );

      const meetingId = result.insertId || result.id;
      if (!meetingId) {
        throw new Error('Meeting was not created. Please retry.');
      }

      // Handle document uploads
      for (const doc of documents) {
        if (doc.data && doc.name) {
          const fileInfo = saveBase64File(doc.data, doc.name);
          await connection.query(
            `INSERT INTO meeting_documents (meeting_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)`,
            [meetingId, fileInfo.filePath, fileInfo.fileName, fileInfo.fileType]
          );
        }
      }

      // App notifications should never roll back the meeting itself. The
      // website and Android both use this endpoint; if notification schema is
      // temporarily behind, the meeting must still be created.
      if (notify_residents) {
        try {
          const formattedDate = new Date(meeting_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const notifTitle = `New Meeting Scheduled: ${title}`;
          const notifMessage = `${meeting_type} scheduled on ${formattedDate} at ${start_time} - ${end_time}. Venue: ${venue}.`;

          await connection.query(
            `INSERT INTO notifications (resident_id, title, message, type, is_read)
             SELECT id, ?, ?, 'meetings', false
             FROM users
             WHERE status = 'approved' AND role = 'resident'`,
            [notifTitle, notifMessage]
          );
        } catch (notificationError) {
          console.error('Meeting notification creation failed:', notificationError);
        }
      }

      await connection.commit();
      res.status(201).json({ id: meetingId, message: 'Meeting scheduled successfully' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// PUT /api/meetings/:id
const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, meeting_type, meeting_date, start_time, end_time, venue, description, priority, status } = req.body;

    if (!title || !meeting_type || !meeting_date || !start_time || !end_time || !venue) {
      return res.status(400).json({ message: 'All standard fields are required' });
    }

    if (end_time <= start_time) {
      return res.status(400).json({ message: 'Meeting End Time must be after Start Time' });
    }

    // Duplicate venue booking overlap validation excluding current ID
    const [overlap] = await promisePool.query(
      `SELECT id, title FROM meetings 
       WHERE venue = ? AND meeting_date = ? AND id != ? AND status != 'Cancelled'
         AND start_time < ? AND end_time > ?`,
      [venue, meeting_date, id, end_time, start_time]
    );

    if (overlap.length > 0) {
      return res.status(409).json({ 
        message: `Venue '${venue}' is already booked for meeting '${overlap[0].title}' during this time window.` 
      });
    }

    await promisePool.query(
      `UPDATE meetings 
       SET title = ?, meeting_type = ?, meeting_date = ?, start_time = ?, end_time = ?, venue = ?, description = ?, priority = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [title, meeting_type, meeting_date, start_time, end_time, venue, description || null, priority || 'Normal', status || 'Scheduled', id]
    );

    res.json({ message: 'Meeting details updated successfully' });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// DELETE /api/meetings/:id
const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    await promisePool.query('DELETE FROM meetings WHERE id = ?', [id]);
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/meetings/:id/agenda
const updateAgendas = async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [] } = req.body;

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete existing
      await connection.query('DELETE FROM meeting_agendas WHERE meeting_id = ?', [id]);

      // Re-insert
      for (const item of items) {
        await connection.query(
          'INSERT INTO meeting_agendas (meeting_id, item_text, order_index) VALUES (?, ?, ?)',
          [id, item.item_text, item.order_index || 0]
        );
      }

      await connection.commit();
      res.json({ message: 'Agenda items updated successfully' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update agenda error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/meetings/:id/attendance
const getAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await promisePool.query(`
      SELECT u.id as resident_id, u.name as resident_name, f.flat_no, f.wing,
             COALESCE(ma.status, 'Absent') AS status
      FROM users u
      JOIN flats f ON u.flat_id = f.id
      LEFT JOIN meeting_attendance ma ON ma.resident_id = u.id AND ma.meeting_id = ?
      WHERE u.role = 'resident' AND u.status = 'approved'
      ORDER BY f.wing, f.floor_no, f.flat_no
    `, [id]);
    res.json(rows);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/meetings/:id/attendance
const saveAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    let { attendance = [] } = req.body;
    if (req.user.role === 'resident') {
      const requestedStatus = req.body.status || attendance?.[0]?.status || 'Present';
      if (requestedStatus !== 'Present') {
        return res.status(400).json({ message: 'Residents can only mark themselves Present. Contact an admin for another status.' });
      }
      attendance = [{ resident_id: req.user.id, status: 'Present' }];
    } else if (!['admin', 'committee'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Enforce Validation: Cannot take attendance before meeting starts
    const [meetings] = await promisePool.query('SELECT meeting_date, start_time FROM meetings WHERE id = ?', [id]);
    if (meetings.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const meeting = meetings[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mDate = new Date(meeting.meeting_date);
    mDate.setHours(0, 0, 0, 0);

    if (mDate > today) {
      return res.status(400).json({ message: 'Cannot mark attendance for a future meeting date.' });
    }

    const nowTime = new Date().toTimeString().split(' ')[0];
    if (mDate.getTime() === today.getTime() && nowTime < meeting.start_time) {
      return res.status(400).json({ message: 'Cannot mark attendance before the meeting start time.' });
    }

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      for (const att of attendance) {
        if (!att.resident_id || !['Present', 'Absent', 'Late', 'Excused'].includes(att.status)) continue;
        await connection.query(
          `INSERT INTO meeting_attendance (meeting_id, resident_id, status, marked_at)
           VALUES (?, ?, ?, NOW())
           ON CONFLICT (meeting_id, resident_id) DO UPDATE SET status = EXCLUDED.status, marked_at = NOW()`,
          [id, att.resident_id, att.status]
        );
      }

      await connection.commit();
      res.json({ message: 'Attendance records updated successfully' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Save attendance error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// POST /api/meetings/:id/report
const saveMeetingReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { summary, discussion, decisions_taken, remarks, documents = [] } = req.body;

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Upsert report
      const [existing] = await connection.query('SELECT id FROM meeting_reports WHERE meeting_id = ?', [id]);
      let reportId;
      if (existing.length > 0) {
        await connection.query(
          `UPDATE meeting_reports SET summary = ?, discussion = ?, decisions_taken = ?, remarks = ?, updated_at = NOW() WHERE meeting_id = ?`,
          [summary, discussion, decisions_taken, remarks, id]
        );
        reportId = existing[0].id;
      } else {
        const [result] = await connection.query(
          `INSERT INTO meeting_reports (meeting_id, summary, discussion, decisions_taken, remarks) VALUES (?, ?, ?, ?, ?)`,
          [id, summary, discussion, decisions_taken, remarks]
        );
        reportId = result.insertId || result.id;
      }

      // Handle extra documents uploading for this report
      for (const doc of documents) {
        if (doc.data && doc.name) {
          const fileInfo = saveBase64File(doc.data, doc.name);
          await connection.query(
            `INSERT INTO meeting_documents (meeting_id, report_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?, ?)`,
            [id, reportId, fileInfo.filePath, fileInfo.fileName, fileInfo.fileType]
          );
        }
      }

      // Automatically update status to Completed
      await connection.query("UPDATE meetings SET status = 'Completed', updated_at = NOW() WHERE id = ?", [id]);

      await connection.commit();
      res.json({ message: 'Meeting minutes (MoM) report recorded successfully' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Save report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ACTIONS TRACKER (CRUD)
const createAction = async (req, res) => {
  try {
    const { meeting_id, action_text, assigned_to, due_date, priority, notes, completion_details } = req.body;
    if (!meeting_id || !action_text) {
      return res.status(400).json({ message: 'Meeting ID and action text are required' });
    }

    const [result] = await promisePool.query(
      `INSERT INTO meeting_actions (meeting_id, action_text, assigned_to, due_date, priority, status, notes, completion_details)
       VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [meeting_id, action_text, assigned_to || null, due_date || null, priority || 'Normal', notes || null, completion_details || null]
    );

    res.status(201).json({ id: result.insertId || result.id, message: 'Action item created successfully' });
  } catch (error) {
    console.error('Create action error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action_text, assigned_to, due_date, priority, status, notes, completion_details } = req.body;
    const completedAtSql = status === 'Completed' ? ', completed_at = COALESCE(completed_at, NOW())' : ", completed_at = NULL";

    await promisePool.query(
      `UPDATE meeting_actions 
       SET action_text = ?, assigned_to = ?, due_date = ?, priority = ?, status = ?, notes = ?, completion_details = ?, updated_at = NOW()${completedAtSql}
       WHERE id = ?`,
      [action_text, assigned_to || null, due_date || null, priority || 'Normal', status || 'Pending', notes || null, completion_details || null, id]
    );

    res.json({ message: 'Action item updated' });
  } catch (error) {
    console.error('Update action error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateActionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completion_details } = req.body;
    if (!['Pending', 'In Progress', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid action status' });
    }

    const [rows] = await promisePool.query('SELECT * FROM meeting_actions WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Action item not found' });
    }

    const action = rows[0];
    const admin = ['admin', 'committee'].includes(req.user.role);
    if (!admin && String(action.assigned_to || '') !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the assignee or an admin can update this action status.' });
    }

    await promisePool.query(
      `UPDATE meeting_actions
       SET status = ?, completion_details = COALESCE(?, completion_details),
           completed_at = CASE WHEN ? = 'Completed' THEN COALESCE(completed_at, NOW()) ELSE NULL END,
           updated_at = NOW()
       WHERE id = ?`,
      [status, completion_details || null, status, id]
    );

    res.json({ message: 'Action item status updated' });
  } catch (error) {
    console.error('Update action status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAction = async (req, res) => {
  try {
    const { id } = req.params;
    await promisePool.query('DELETE FROM meeting_actions WHERE id = ?', [id]);
    res.json({ message: 'Action item deleted successfully' });
  } catch (error) {
    console.error('Delete action error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// VOTING POLLS
const createVote = async (req, res) => {
  try {
    const { meeting_id, question } = req.body;
    if (!meeting_id || !question) {
      return res.status(400).json({ message: 'Meeting ID and question are required' });
    }

    const [result] = await promisePool.query(
      `INSERT INTO meeting_votes (meeting_id, question, yes_count, no_count, abstain_count)
       VALUES (?, ?, 0, 0, 0)
       ON CONFLICT (meeting_id) DO UPDATE SET question = EXCLUDED.question`,
      [meeting_id, question]
    );

    res.status(201).json({ message: 'Voting poll created successfully' });
  } catch (error) {
    console.error('Create vote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const castVote = async (req, res) => {
  try {
    const { id: meeting_id } = req.params;
    const { choice } = req.body; // YES, NO, ABSTAIN
    const resident_id = req.user.id;

    if (!choice || !['YES', 'NO', 'ABSTAIN'].includes(choice)) {
      return res.status(400).json({ message: 'Valid choice (YES/NO/ABSTAIN) is required' });
    }

    const [votes] = await promisePool.query('SELECT id FROM meeting_votes WHERE meeting_id = ?', [meeting_id]);
    if (votes.length === 0) {
      return res.status(404).json({ message: 'No active voting poll exists for this meeting' });
    }

    const voteId = votes[0].id;

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Check single vote constraint
      const [existing] = await connection.query(
        'SELECT id FROM meeting_resident_votes WHERE vote_id = ? AND resident_id = ?',
        [voteId, resident_id]
      );
      if (existing.length > 0) {
        connection.release();
        return res.status(409).json({ message: 'You have already cast your vote for this meeting poll.' });
      }

      // Record resident vote
      await connection.query(
        'INSERT INTO meeting_resident_votes (vote_id, resident_id, choice) VALUES (?, ?, ?)',
        [voteId, resident_id, choice]
      );

      // Increment counters
      if (choice === 'YES') {
        await connection.query('UPDATE meeting_votes SET yes_count = yes_count + 1 WHERE id = ?', [voteId]);
      } else if (choice === 'NO') {
        await connection.query('UPDATE meeting_votes SET no_count = no_count + 1 WHERE id = ?', [voteId]);
      } else if (choice === 'ABSTAIN') {
        await connection.query('UPDATE meeting_votes SET abstain_count = abstain_count + 1 WHERE id = ?', [voteId]);
      }

      await connection.commit();
      res.json({ message: 'Your vote has been cast successfully' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Cast vote error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
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
};
