const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');

const getResidents = async (req, res) => {
  try {
    const [residents] = await promisePool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.role, u.created_at,
              f.id AS flat_id, f.flat_no, f.wing, f.flat_type_id, ft.name AS flat_type_name
       FROM users u
       LEFT JOIN flats f ON (f.current_resident_id = u.id OR f.id = u.flat_id)
       LEFT JOIN flat_types ft ON ft.id = f.flat_type_id
       WHERE LOWER(u.role) = 'resident'
       ORDER BY u.name ASC`
    );
    res.json(residents);
  } catch (error) {
    console.error('Get residents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createResident = async (req, res) => {
  try {
    const { name, email, password, phone, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const [existingUsers] = await promisePool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await promisePool.query(
      'INSERT INTO users (name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, 'resident', status || 'approved']
    );

    res.status(201).json({
      id: result.insertId,
      name,
      email,
      phone: phone || null,
      role: 'resident',
      status: status || 'approved'
    });
  } catch (error) {
    console.error('Create resident error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getResidents, createResident };
