const { promisePool } = require('../config/database');

const getAllStaff = async (req, res) => {
  try {
    const [staff] = await promisePool.query(
      'SELECT * FROM staff ORDER BY created_at DESC'
    );
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const [staff] = await promisePool.query(
      'SELECT * FROM staff WHERE id = ?',
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.json(staff[0]);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createStaff = async (req, res) => {
  try {
    const { name, role, phone, salary } = req.body;

    const [rows] = await promisePool.query(
      'INSERT INTO staff (name, role, phone, salary) VALUES (?, ?, ?, ?) RETURNING id',
      [name, role, phone, salary]
    );

    res.status(201).json({
      id: rows[0].id,
      name,
      role,
      phone,
      salary
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, phone, salary } = req.body;

    await promisePool.query(
      'UPDATE staff SET name = ?, role = ?, phone = ?, salary = ? WHERE id = ?',
      [name, role, phone, salary, id]
    );

    res.json({ message: 'Staff updated successfully' });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    await promisePool.query('DELETE FROM staff WHERE id = ?', [id]);

    res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllStaff, getStaffById, createStaff, updateStaff, deleteStaff };
