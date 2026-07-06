const { promisePool } = require('../config/database');

const getAllNotices = async (req, res) => {
  try {
    const [notices] = await promisePool.query(
      'SELECT * FROM notices ORDER BY created_at DESC'
    );
    res.json(notices);
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getLatestNotices = async (req, res) => {
  try {
    const [notices] = await promisePool.query(
      'SELECT * FROM notices ORDER BY created_at DESC LIMIT 5'
    );
    res.json(notices);
  } catch (error) {
    console.error('Get latest notices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [notices] = await promisePool.query(
      'SELECT * FROM notices WHERE id = ?',
      [id]
    );

    if (notices.length === 0) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    res.json(notices[0]);
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createNotice = async (req, res) => {
  try {
    const { title, description } = req.body;

    const [rows] = await promisePool.query(
      'INSERT INTO notices (title, description) VALUES (?, ?) RETURNING id',
      [title, description]
    );

    res.status(201).json({
      id: rows[0].id,
      title,
      description
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    await promisePool.query('DELETE FROM notices WHERE id = ?', [id]);

    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllNotices, getLatestNotices, getNoticeById, createNotice, deleteNotice };
