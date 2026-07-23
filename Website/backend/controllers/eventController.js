const fs = require('fs');
const path = require('path');
const { promisePool } = require('../config/database');
const { buildPublicFileUrl } = require('../utils/fileUrl');

const ADMIN_ROLES = ['admin', 'committee'];
const EVENT_STATUSES = ['Draft', 'Published', 'Cancelled', 'Completed'];
const EVENT_AUDIENCES = ['All', 'Residents', 'Admins'];

const saveEventImage = (base64Data) => {
  if (!base64Data) return null;
  const match = String(base64Data).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid event image format.');
  }

  const extension = match[1].split('/')[1].replace('jpeg', 'jpg');
  const uniqueName = `event-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
  const uploadDir = path.join(__dirname, '..', 'uploads', 'events');
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, uniqueName), Buffer.from(match[2], 'base64'));
  return `/uploads/events/${uniqueName}`;
};

const withPublicImageUrl = (req, event) => {
  if (!event) return event;
  const publicUrl = buildPublicFileUrl(req, event.image_path, { mustExist: true, rootDir: path.resolve(__dirname, '..') });
  return {
    ...event,
    image_url: publicUrl,
    image_path: publicUrl || event.image_path
  };
};

const validateEventPayload = (body, partial = false) => {
  const required = ['title', 'event_date', 'start_time', 'end_time', 'venue'];
  if (!partial) {
    for (const key of required) {
      if (!body[key]) return `${key.replace(/_/g, ' ')} is required`;
    }
  }

  if (body.start_time && body.end_time && body.end_time <= body.start_time) {
    return 'End time must be after start time';
  }

  if (body.status && !EVENT_STATUSES.includes(body.status)) {
    return 'Invalid event status';
  }

  if (body.audience && !EVENT_AUDIENCES.includes(body.audience)) {
    return 'Invalid event audience';
  }

  return null;
};

const canSeeEvent = (req, event) => {
  if (ADMIN_ROLES.includes(req.user.role)) return true;
  if (event.status !== 'Published' && event.status !== 'Cancelled' && event.status !== 'Completed') return false;
  return event.audience === 'All' || event.audience === 'Residents';
};

const getEvents = async (req, res) => {
  try {
    const { status, audience, title, date_from, date_to } = req.query;
    const admin = ADMIN_ROLES.includes(req.user.role);
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (!admin) {
      query += " AND status IN ('Published', 'Cancelled', 'Completed') AND audience IN ('All', 'Residents')";
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (audience && admin) {
      query += ' AND audience = ?';
      params.push(audience);
    }
    if (title) {
      query += ' AND title ILIKE ?';
      params.push(`%${title}%`);
    }
    if (date_from) {
      query += ' AND event_date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND event_date <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY event_date DESC, start_time DESC';
    const [rows] = await promisePool.query(query, params);
    res.json(rows.map((row) => withPublicImageUrl(req, row)));
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getEventById = async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Event not found' });
    if (!canSeeEvent(req, rows[0])) return res.status(403).json({ message: 'Access denied.' });
    res.json(withPublicImageUrl(req, rows[0]));
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createEvent = async (req, res) => {
  try {
    const validation = validateEventPayload(req.body);
    if (validation) return res.status(400).json({ message: validation });

    const imagePath = saveEventImage(req.body.image);
    const [result] = await promisePool.query(
      `INSERT INTO events (title, description, event_date, start_time, end_time, venue, organizer, image_path, status, audience, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.title.trim(),
        req.body.description || null,
        req.body.event_date,
        req.body.start_time,
        req.body.end_time,
        req.body.venue.trim(),
        req.body.organizer || null,
        imagePath,
        req.body.status || 'Draft',
        req.body.audience || 'All',
        req.user.id
      ]
    );

    if ((req.body.status || 'Draft') === 'Published') {
      await notifyResidents(req.body.title.trim(), req.body.event_date, req.body.start_time, req.body.venue.trim());
    }

    res.status(201).json({ id: result.insertId, message: 'Event created successfully' });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const [existing] = await promisePool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Event not found' });

    const validation = validateEventPayload(req.body);
    if (validation) return res.status(400).json({ message: validation });

    const imagePath = req.body.image ? saveEventImage(req.body.image) : existing[0].image_path;
    await promisePool.query(
      `UPDATE events
       SET title = ?, description = ?, event_date = ?, start_time = ?, end_time = ?, venue = ?, organizer = ?,
           image_path = ?, status = ?, audience = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        req.body.title.trim(),
        req.body.description || null,
        req.body.event_date,
        req.body.start_time,
        req.body.end_time,
        req.body.venue.trim(),
        req.body.organizer || null,
        imagePath,
        req.body.status || existing[0].status,
        req.body.audience || existing[0].audience,
        req.params.id
      ]
    );

    if (existing[0].status !== 'Published' && req.body.status === 'Published') {
      await notifyResidents(req.body.title.trim(), req.body.event_date, req.body.start_time, req.body.venue.trim());
    }

    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    await promisePool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateEventStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!EVENT_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid event status' });

    const [existing] = await promisePool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Event not found' });

    await promisePool.query('UPDATE events SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    if (existing[0].status !== 'Published' && status === 'Published') {
      await notifyResidents(existing[0].title, existing[0].event_date, existing[0].start_time, existing[0].venue);
    }
    res.json({ message: `Event ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const notifyResidents = async (title, eventDate, startTime, venue) => {
  const message = `${title} is scheduled on ${String(eventDate).slice(0, 10)} at ${startTime}. Venue: ${venue}.`;
  await promisePool.query(
    `INSERT INTO notifications (resident_id, title, message, type, is_read)
     SELECT id, ?, ?, 'events', false
     FROM users
     WHERE status = 'approved' AND role = 'resident'`,
    [`New Event: ${title}`, message]
  );
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  updateEventStatus
};
