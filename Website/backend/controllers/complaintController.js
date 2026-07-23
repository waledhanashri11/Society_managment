const fs = require('fs');
const path = require('path');
const { promisePool } = require('../config/database');
const { buildPublicFileUrl, uploadFileExists } = require('../utils/fileUrl');

const MAX_COMPLAINT_IMAGES = 3;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const parseImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const complaintImageExists = (imagePath) => {
  return uploadFileExists(imagePath, path.resolve(__dirname, '..'));
};

const withComplaintImageUrls = (req, complaint) => {
  const complaintImages = parseImages(complaint.complaint_images);
  const complaintImageData = parseImages(complaint.complaint_image_data);
  const imageUrls = complaintImages.map((item, index) => {
    if (complaintImageExists(item)) return buildPublicFileUrl(req, item);
    return complaintImageData[index] || buildPublicFileUrl(req, item);
  }).filter(Boolean);
  return {
    ...complaint,
    complaint_images: complaintImages,
    complaint_image_data: complaintImageData,
    complaint_image_urls: imageUrls
  };
};

const getTableColumns = async (tableName) => {
  const [columns] = await promisePool.query(`SHOW COLUMNS FROM ${tableName}`);
  return new Set(columns.map((column) => column.Field || column.field || column.column_name));
};

const saveComplaintImages = (images = []) => {
  if (!Array.isArray(images)) {
    const error = new Error('Complaint images must be sent as a list');
    error.statusCode = 400;
    throw error;
  }

  if (images.length > MAX_COMPLAINT_IMAGES) {
    const error = new Error('You can upload maximum 3 complaint images');
    error.statusCode = 400;
    throw error;
  }

  const uploadDir = path.join(__dirname, '..', 'uploads', 'complaints');
  fs.mkdirSync(uploadDir, { recursive: true });

  return images.map((image, index) => {
    const data = typeof image === 'string' ? image : image?.data || image?.preview || '';
    const match = String(data).match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
    if (!match || !ALLOWED_IMAGE_TYPES.has(match[1].toLowerCase())) {
      const error = new Error(`Image ${index + 1} must be JPG, JPEG, PNG, or WebP`);
      error.statusCode = 400;
      throw error;
    }

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      const error = new Error(`Image ${index + 1} must be 5 MB or smaller`);
      error.statusCode = 400;
      throw error;
    }

    const extension = match[1].toLowerCase().includes('png') ? 'png' : match[1].toLowerCase().includes('webp') ? 'webp' : 'jpg';
    const fileName = `complaint-${Date.now()}-${index}-${Math.round(Math.random() * 1e9)}.${extension}`;
    fs.writeFileSync(path.join(uploadDir, fileName), buffer);
    return `/uploads/complaints/${fileName}`;
  });
};

const getAllComplaints = async (req, res) => {
  try {
    const [complaints] = await promisePool.query(`
      SELECT c.*, u.name as user_name, u.email as user_email 
      FROM complaints c 
      JOIN users u ON c.user_id = u.id 
      ORDER BY c.created_at DESC
    `);
    res.json(complaints.map((complaint) => withComplaintImageUrls(req, complaint)));
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const [complaints] = await promisePool.query(
      'SELECT * FROM complaints WHERE id = ?',
      [id]
    );

    if (complaints.length === 0) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json(withComplaintImageUrls(req, complaints[0]));
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createComplaint = async (req, res) => {
  try {
    const { title, description, images = [] } = req.body;
    const userId = req.user.id;
    const complaintImages = saveComplaintImages(images);
    const imageData = Array.isArray(images) ? images.filter((item) => typeof item === 'string' && item.startsWith('data:image/')).slice(0, MAX_COMPLAINT_IMAGES) : [];
    const complaintColumns = await getTableColumns('complaints').catch(() => new Set());
    const hasImageDataColumn = complaintColumns.has('complaint_image_data');

    const [result] = hasImageDataColumn
      ? await promisePool.query(
        'INSERT INTO complaints (user_id, title, description, complaint_images, complaint_image_data) VALUES (?, ?, ?, ?, ?)',
        [userId, title, description, JSON.stringify(complaintImages), JSON.stringify(imageData)]
      )
      : await promisePool.query(
        'INSERT INTO complaints (user_id, title, description, complaint_images) VALUES (?, ?, ?, ?)',
        [userId, title, description, JSON.stringify(complaintImages)]
      );

    try {
      await promisePool.query(
        `INSERT INTO notifications (resident_id, title, message, type, is_read)
         SELECT id, 'New complaint needs attention', ?, 'complaints', false
         FROM users
         WHERE role = 'admin' AND status = 'approved'`,
        [`Complaint: ${title}`]
      );
    } catch (notifError) {
      console.error('Failed to create admin notification for complaint:', notifError);
    }

    res.status(201).json({
      id: result.insertId,
      user_id: userId,
      title,
      description,
      complaint_images: complaintImages,
      complaint_image_data: imageData,
      complaint_image_urls: complaintImages.map((item, index) => buildPublicFileUrl(req, item) || imageData[index]).filter(Boolean),
      status: 'pending'
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Server error' });
  }
};

const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reply } = req.body;

    const [oldComplaints] = await promisePool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    if (oldComplaints.length === 0) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }
    const complaint = oldComplaints[0];

    let inProgressAt = complaint.in_progress_at;
    let resolvedAt = complaint.resolved_at;

    if (status === 'in_progress' && complaint.status !== 'in_progress') {
      inProgressAt = new Date();
    } else if (status === 'resolved' && complaint.status !== 'resolved') {
      resolvedAt = new Date();
    }

    await promisePool.query(
      `UPDATE complaints 
       SET status = ?, reply = ?, in_progress_at = ?, resolved_at = ? 
       WHERE id = ?`,
      [status, reply, inProgressAt, resolvedAt, id]
    );

    if (status !== complaint.status) {
      try {
        let title = '';
        let message = '';
        if (status === 'in_progress') {
          title = 'Complaint In Progress';
          message = `Your complaint '${complaint.title}' is now In Progress.`;
        } else if (status === 'resolved') {
          title = 'Complaint Resolved';
          message = `Your complaint has been resolved. Please confirm whether the issue has been fixed.`;
        }

        if (title) {
          await promisePool.query(
            `INSERT INTO notifications (resident_id, title, message, type, is_read)
             VALUES (?, ?, ?, 'complaints', false)`,
            [complaint.user_id, title, message]
          );
        }
      } catch (notifErr) {
        console.error('Failed to notify resident:', notifErr);
      }
    }

    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const [complaints] = await promisePool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    if (complaints.length === 0) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }
    const complaint = complaints[0];

    // Verify complaint belongs to the resident
    if (Number(complaint.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Only the resident who created the complaint can delete it.' });
    }

    // Verify complaint is in pending status
    if (complaint.status !== 'pending') {
      return res.status(400).json({ message: 'This complaint is already being processed and cannot be deleted.' });
    }

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      const [users] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      const residentName = users[0]?.name || 'Unknown Resident';

      await connection.query(
        `INSERT INTO complaint_audit_logs (complaint_id, complaint_subject, resident_name, deleted_by)
         VALUES (?, ?, ?, ?)`,
        [complaint.id, complaint.title, residentName, 'Resident']
      );

      await connection.query('DELETE FROM complaints WHERE id = ?', [id]);

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Delete associated uploaded files from disk
    const images = parseImages(complaint.complaint_images);
    images.forEach((img) => {
      const filePath = path.join(__dirname, '..', img);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Failed to delete complaint image file:', filePath, err);
        }
      }
    });

    res.json({ message: 'Complaint deleted successfully.' });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({ message: 'Failed to delete complaint. Please try again.' });
  }
};

const getUserComplaints = async (req, res) => {
  try {
    const userId = req.user.id;
    const [complaints] = await promisePool.query(
      'SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json(complaints.map((complaint) => withComplaintImageUrls(req, complaint)));
  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const confirmComplaintResolved = async (req, res) => {
  try {
    const { id } = req.params;

    const [complaints] = await promisePool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    if (complaints.length === 0) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }
    const complaint = complaints[0];

    // Security check: Only the resident who created the complaint can confirm resolution
    if (Number(complaint.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Only the resident who created the complaint can confirm resolution.' });
    }

    // Verify status is Resolved
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ message: 'Only resolved complaints can be confirmed as resolved.' });
    }

    await promisePool.query(
      `UPDATE complaints 
       SET status = 'closed', closed_at = NOW() 
       WHERE id = ?`,
      [id]
    );

    // Notify admins immediately
    try {
      const [users] = await promisePool.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      const residentName = users[0]?.name || 'Unknown Resident';

      await promisePool.query(
        `INSERT INTO notifications (resident_id, title, message, type, is_read)
         SELECT id, 'Resident confirmed complaint resolved', ?, 'complaints', false
         FROM users
         WHERE role = 'admin' AND status = 'approved'`,
        [`Resident ${residentName} confirmed that complaint '${complaint.title}' is resolved.`]
      );
    } catch (notifErr) {
      console.error('Failed to notify admin on resolution confirmation:', notifErr);
    }

    res.json({ message: 'Thank you. Your complaint has been closed successfully.' });
  } catch (error) {
    console.error('Confirm complaint resolved error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const reopenComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const [complaints] = await promisePool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    if (complaints.length === 0) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }
    const complaint = complaints[0];

    // Security check: Only the resident who created the complaint can reopen it
    if (Number(complaint.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Only the resident who created the complaint can reopen it.' });
    }

    // Verify status is Resolved
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ message: 'Only resolved complaints can be reopened.' });
    }

    await promisePool.query(
      `UPDATE complaints 
       SET status = 'in_progress', reopened_at = NOW(), reopened_comment = ? 
       WHERE id = ?`,
      [comment || null, id]
    );

    // Notify admins immediately
    try {
      const [users] = await promisePool.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      const residentName = users[0]?.name || 'Unknown Resident';

      let msg = `Resident ${residentName} reopened complaint '${complaint.title}'.`;
      if (comment) {
        msg += ` Comment: ${comment}`;
      }

      await promisePool.query(
        `INSERT INTO notifications (resident_id, title, message, type, is_read)
         SELECT id, 'Resident reopened complaint', ?, 'complaints', false
         FROM users
         WHERE role = 'admin' AND status = 'approved'`,
        [msg]
      );
    } catch (notifErr) {
      console.error('Failed to notify admin on reopen:', notifErr);
    }

    res.json({ message: 'Your complaint has been reopened and the admin has been notified.' });
  } catch (error) {
    console.error('Reopen complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  getAllComplaints, 
  getComplaintById, 
  createComplaint, 
  updateComplaint, 
  deleteComplaint, 
  getUserComplaints,
  confirmComplaintResolved,
  reopenComplaint
};
