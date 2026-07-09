const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');

const normalizeRole = (role) => role || 'resident';
const isResident = (role) => normalizeRole(role) === 'resident';

const parseFlatId = (flatId) => {
  if (flatId === undefined || flatId === null || flatId === '') return null;
  const numericFlatId = Number(flatId);
  return Number.isInteger(numericFlatId) && numericFlatId > 0 ? numericFlatId : null;
};

const validateResidentFlat = async (connection, flatId, residentId = null) => {
  if (!flatId) {
    return { valid: false, status: 400, message: 'Assigned Flat is required for residents' };
  }

  const [flats] = await connection.query(
    'SELECT id, owner_id, status FROM flats WHERE id = ? FOR UPDATE',
    [flatId]
  );

  if (flats.length === 0) {
    return { valid: false, status: 404, message: 'Selected flat was not found' };
  }

  const flat = flats[0];
  if (flat.owner_id && Number(flat.owner_id) !== Number(residentId)) {
    return { valid: false, status: 409, message: 'Selected flat is already assigned to another resident' };
  }

  const [users] = await connection.query(
    'SELECT id FROM users WHERE flat_id = ? AND role = ? AND id <> ? LIMIT 1',
    [flatId, 'resident', residentId || 0]
  );

  if (users.length > 0) {
    return { valid: false, status: 409, message: 'Selected flat is already assigned to another resident' };
  }

  return { valid: true };
};

const releaseResidentFlat = async (connection, residentId, flatId) => {
  if (!flatId) return;
  await connection.query(
    'UPDATE flats SET owner_id = NULL, status = ? WHERE id = ? AND owner_id = ?',
    ['Available', flatId, residentId]
  );
};

const occupyResidentFlat = async (connection, residentId, flatId) => {
  await connection.query(
    'UPDATE flats SET owner_id = ?, status = ? WHERE id = ?',
    [residentId, 'Occupied', flatId]
  );
};

const getAllUsers = async (req, res) => {
  try {
    const [users] = await promisePool.query(
      `SELECT u.id, u.name, u.email, u.role, u.flat_id, u.created_at,
              u.phone, u.status,
              f.flat_no, f.wing, f.floor_no, f.status AS flat_status
       FROM users u
       LEFT JOIN flats f ON f.id = u.flat_id
       ORDER BY u.created_at DESC`
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
      `SELECT u.id, u.name, u.email, u.role, u.flat_id, u.created_at,
              u.phone, u.status,
              f.flat_no, f.wing, f.floor_no, f.status AS flat_status
       FROM users u
       LEFT JOIN flats f ON f.id = u.flat_id
       WHERE u.id = ?`,
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
  const connection = await promisePool.getConnection();
  try {
    const { name, email, password, role, flat_id, phone, status } = req.body;
    const userRole = normalizeRole(role);
    const assignedFlatId = parseFlatId(flat_id);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    await connection.beginTransaction();

    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'User already exists' });
    }

    if (isResident(userRole)) {
      const flatValidation = await validateResidentFlat(connection, assignedFlatId);
      if (!flatValidation.valid) {
        await connection.rollback();
        return res.status(flatValidation.status).json({ message: flatValidation.message });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await connection.query(
      'INSERT INTO users (name, email, password, phone, role, status, flat_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, userRole, status || 'approved', isResident(userRole) ? assignedFlatId : null]
    );

    if (isResident(userRole)) {
      await occupyResidentFlat(connection, result.insertId, assignedFlatId);
    }

    await connection.commit();

    res.status(201).json({
      id: result.insertId,
      name,
      email,
      role: userRole,
      phone: phone || null,
      status: status || 'approved',
      flat_id: isResident(userRole) ? assignedFlatId : null
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const updateUser = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;
    const { name, email, role, password, flat_id, phone, status } = req.body;
    const userRole = normalizeRole(role);
    const assignedFlatId = parseFlatId(flat_id);

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      'SELECT id, role, flat_id FROM users WHERE id = ? FOR UPDATE',
      [id]
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    const previousFlatId = existingRows[0].flat_id;

    if (isResident(userRole)) {
      const flatValidation = await validateResidentFlat(connection, assignedFlatId, id);
      if (!flatValidation.valid) {
        await connection.rollback();
        return res.status(flatValidation.status).json({ message: flatValidation.message });
      }
    }

    let query = 'UPDATE users SET name = ?, email = ?, phone = ?, role = ?, status = ?, flat_id = ?';
    const params = [name, email, phone || null, userRole, status || 'approved', isResident(userRole) ? assignedFlatId : null];

    if (password) {
      if (password.length < 6) {
        await connection.rollback();
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await connection.query(query, params);

    if (Number(previousFlatId || 0) !== Number(assignedFlatId || 0)) {
      await releaseResidentFlat(connection, id, previousFlatId);
    }

    if (isResident(userRole)) {
      await occupyResidentFlat(connection, id, assignedFlatId);
    }

    await connection.commit();

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const updateUserStatus = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be pending, approved or rejected' });
    }

    await connection.beginTransaction();

    const [users] = await connection.query(
      'SELECT id, flat_id FROM users WHERE id = ? AND role = ? FOR UPDATE',
      [id, 'resident']
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Resident not found' });
    }

    if (status === 'rejected' && users[0].flat_id) {
      await releaseResidentFlat(connection, id, users[0].flat_id);
      await connection.query('UPDATE users SET flat_id = NULL WHERE id = ?', [id]);
    }

    const [result] = await connection.query(
      'UPDATE users SET status = ? WHERE id = ? AND role = ?',
      [status, id, 'resident']
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Resident not found' });
    }

    await connection.commit();

    res.json({ message: `Resident ${status} successfully` });
  } catch (error) {
    await connection.rollback();
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const deleteUser = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [users] = await connection.query('SELECT flat_id FROM users WHERE id = ? FOR UPDATE', [id]);
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    await releaseResidentFlat(connection, id, users[0].flat_id);
    await connection.query('UPDATE flats SET owner_id = NULL, status = ? WHERE owner_id = ?', ['Available', id]);
    await connection.query('DELETE FROM users WHERE id = ?', [id]);

    await connection.commit();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, updateUserStatus, deleteUser };
