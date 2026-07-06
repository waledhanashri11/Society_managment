const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');

const getAllUsers = async (req, res) => {
  try {
    const [users] = await promisePool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await promisePool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role, flat_id } = req.body;

    const [existingUsers] = await promisePool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [rows] = await promisePool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?) RETURNING id',
      [name, email, hashedPassword, role || 'resident']
    );
    const userId = rows[0].id;

    if (flat_id) {
      await promisePool.query(
        'UPDATE flats SET owner_id = ? WHERE id = ?',
        [userId, flat_id]
      );
    }

    res.status(201).json({
      id: userId,
      name,
      email,
      role: role || 'resident'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    let query = 'UPDATE users SET name = ?, email = ?, role = ?';
    const params = [name, email, role];

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await promisePool.query(query, params);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await promisePool.query('UPDATE flats SET owner_id = NULL WHERE owner_id = ?', [id]);
    await promisePool.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
