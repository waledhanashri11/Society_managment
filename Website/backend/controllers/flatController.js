const { promisePool } = require('../config/database');

const parseOwnerId = (ownerId) => {
  if (ownerId === undefined || ownerId === null || ownerId === '') return null;
  const numericOwnerId = Number(ownerId);
  return Number.isInteger(numericOwnerId) && numericOwnerId > 0 ? numericOwnerId : null;
};

const getAllFlats = async (req, res) => {
  try {
    const [flats] = await promisePool.query(`
      SELECT f.*, u.name as owner_name, u.name as assigned_resident_name, u.email as owner_email 
      FROM flats f 
      LEFT JOIN users u ON f.owner_id = u.id
      ORDER BY f.wing, f.floor_no, f.flat_no
    `);
    res.json(flats);
  } catch (error) {
    console.error('Get flats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAvailableFlats = async (req, res) => {
  try {
    const [flats] = await promisePool.query(`
      SELECT id, flat_no, wing, floor_no, maintenance_charge, status
      FROM flats
      WHERE owner_id IS NULL AND status = ?
      ORDER BY wing, floor_no, flat_no
    `, ['Available']);
    res.json(flats);
  } catch (error) {
    console.error('Get available flats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFlatById = async (req, res) => {
  try {
    const { id } = req.params;
    const [flats] = await promisePool.query(
      'SELECT * FROM flats WHERE id = ?',
      [id]
    );

    if (flats.length === 0) {
      return res.status(404).json({ message: 'Flat not found' });
    }

    res.json(flats[0]);
  } catch (error) {
    console.error('Get flat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createFlat = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { flat_no, wing, floor_no, owner_id, maintenance_charge } = req.body;
    const residentId = parseOwnerId(owner_id);

    if (!flat_no || !floor_no) {
      return res.status(400).json({ message: 'Flat number and floor number are required' });
    }

    await connection.beginTransaction();

    if (residentId) {
      const [users] = await connection.query(
        'SELECT id, role, flat_id FROM users WHERE id = ? FOR UPDATE',
        [residentId]
      );

      if (users.length === 0 || users[0].role !== 'resident') {
        await connection.rollback();
        return res.status(400).json({ message: 'Assigned owner must be a resident' });
      }

      if (users[0].flat_id) {
        await connection.rollback();
        return res.status(409).json({ message: 'This resident already has an assigned flat' });
      }
    }

    const [result] = await connection.query(
      'INSERT INTO flats (flat_no, wing, floor_no, owner_id, status, maintenance_charge) VALUES (?, ?, ?, ?, ?, ?)',
      [flat_no, wing || 'A', floor_no, residentId, residentId ? 'Occupied' : 'Available', maintenance_charge || 0]
    );

    if (residentId) {
      await connection.query('UPDATE users SET flat_id = ? WHERE id = ?', [result.insertId, residentId]);
    }

    await connection.commit();

    res.status(201).json({
      id: result.insertId,
      flat_no,
      wing: wing || 'A',
      floor_no,
      owner_id: residentId,
      status: residentId ? 'Occupied' : 'Available',
      maintenance_charge: maintenance_charge || 0
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create flat error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const updateFlat = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;
    const { flat_no, wing, floor_no, owner_id, maintenance_charge } = req.body;
    const residentId = parseOwnerId(owner_id);

    if (!flat_no || !floor_no) {
      return res.status(400).json({ message: 'Flat number and floor number are required' });
    }

    await connection.beginTransaction();

    const [flats] = await connection.query('SELECT id, owner_id FROM flats WHERE id = ? FOR UPDATE', [id]);
    if (flats.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Flat not found' });
    }

    const previousOwnerId = flats[0].owner_id;

    if (residentId) {
      const [users] = await connection.query(
        'SELECT id, role, flat_id FROM users WHERE id = ? FOR UPDATE',
        [residentId]
      );

      if (users.length === 0 || users[0].role !== 'resident') {
        await connection.rollback();
        return res.status(400).json({ message: 'Assigned owner must be a resident' });
      }

      if (users[0].flat_id && Number(users[0].flat_id) !== Number(id)) {
        await connection.rollback();
        return res.status(409).json({ message: 'This resident already has an assigned flat' });
      }
    }

    if (previousOwnerId && Number(previousOwnerId) !== Number(residentId || 0)) {
      await connection.query('UPDATE users SET flat_id = NULL WHERE id = ? AND flat_id = ?', [previousOwnerId, id]);
    }

    if (residentId) {
      await connection.query('UPDATE users SET flat_id = ? WHERE id = ?', [id, residentId]);
    }

    await connection.query(
      'UPDATE flats SET flat_no = ?, wing = ?, floor_no = ?, owner_id = ?, status = ?, maintenance_charge = ? WHERE id = ?',
      [flat_no, wing || 'A', floor_no, residentId, residentId ? 'Occupied' : 'Available', maintenance_charge || 0, id]
    );

    await connection.commit();

    res.json({ message: 'Flat updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update flat error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const deleteFlat = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();
    await connection.query('UPDATE users SET flat_id = NULL WHERE flat_id = ?', [id]);
    await connection.query('DELETE FROM flats WHERE id = ?', [id]);
    await connection.commit();

    res.json({ message: 'Flat deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete flat error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

module.exports = { getAllFlats, getAvailableFlats, getFlatById, createFlat, updateFlat, deleteFlat };
