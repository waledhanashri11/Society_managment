const { promisePool } = require('../config/database');

const getAllComplaints = async (req, res) => {
  try {
    const [complaints] = await promisePool.query(`
      SELECT c.*, u.name as user_name, u.email as user_email 
      FROM complaints c 
      JOIN users u ON c.user_id = u.id 
      ORDER BY c.created_at DESC
    `);
    res.json(complaints);
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

    res.json(complaints[0]);
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createComplaint = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id;

    const [result] = await promisePool.query(
      'INSERT INTO complaints (user_id, title, description) VALUES (?, ?, ?)',
      [userId, title, description]
    );

    res.status(201).json({
      id: result.insertId,
      user_id: userId,
      title,
      description,
      status: 'pending'
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reply } = req.body;

    await promisePool.query(
      'UPDATE complaints SET status = ?, reply = ? WHERE id = ?',
      [status, reply, id]
    );

    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    await promisePool.query('DELETE FROM complaints WHERE id = ?', [id]);

    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserComplaints = async (req, res) => {
  try {
    const userId = req.user.id;
    const [complaints] = await promisePool.query(
      'SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json(complaints);
  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllComplaints, getComplaintById, createComplaint, updateComplaint, deleteComplaint, getUserComplaints };
