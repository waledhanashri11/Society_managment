const { promisePool } = require('../config/database');

const parseOwnerId = (ownerId) => {
  if (ownerId === undefined || ownerId === null || ownerId === '') return null;
  const numericOwnerId = Number(ownerId);
  return Number.isInteger(numericOwnerId) && numericOwnerId > 0 ? numericOwnerId : null;
};

const canViewFlat = async (user, flatId) => {
  if (user.role === 'admin') return true;

  if (Number(user.flat_id) === Number(flatId)) return true;

  const [rows] = await promisePool.query(
    'SELECT flat_id FROM users WHERE id = ? AND role = ? LIMIT 1',
    [user.id, 'resident']
  );

  return Number(rows[0]?.flat_id) === Number(flatId);
};

const getAllFlats = async (req, res) => {
  try {
    const [flats] = await promisePool.query(`
      SELECT f.*, u.name as owner_name, u.name as assigned_resident_name, u.email as owner_email,
             ft.name as flat_type_name
      FROM flats f 
      LEFT JOIN users u ON f.current_resident_id = u.id
      LEFT JOIN flat_types ft ON f.flat_type_id = ft.id
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
      SELECT f.id, f.flat_no, f.wing, f.floor_no, f.maintenance_charge, f.status,
             ft.name as flat_type_name
      FROM flats f
      LEFT JOIN flat_types ft ON f.flat_type_id = ft.id
      WHERE f.current_resident_id IS NULL AND f.status = ?
      ORDER BY f.wing, f.floor_no, f.flat_no
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
    const [flats] = await promisePool.query(`
      SELECT f.*, ft.name as flat_type_name
      FROM flats f
      LEFT JOIN flat_types ft ON f.flat_type_id = ft.id
      WHERE f.id = ?
    `, [id]);

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
    const { flat_no, wing, floor_no, owner_id, maintenance_charge, flat_type_id } = req.body;
    const residentId = parseOwnerId(owner_id);
    const flatTypeId = flat_type_id ? Number(flat_type_id) : null;

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
      'INSERT INTO flats (flat_no, wing, floor_no, current_resident_id, status, maintenance_charge, flat_type_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [flat_no, wing || 'A', floor_no, residentId, residentId ? 'Occupied' : 'Available', maintenance_charge || 0, flatTypeId]
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
      maintenance_charge: maintenance_charge || 0,
      flat_type_id: flatTypeId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create flat error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Flat number already exists in this wing' });
    }
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const updateFlat = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { id } = req.params;
    const { flat_no, wing, floor_no, owner_id, maintenance_charge, flat_type_id } = req.body;
    const residentId = parseOwnerId(owner_id);
    const flatTypeId = flat_type_id ? Number(flat_type_id) : null;

    if (!flat_no || !floor_no) {
      return res.status(400).json({ message: 'Flat number and floor number are required' });
    }

    await connection.beginTransaction();

    const [flats] = await connection.query('SELECT id, current_resident_id FROM flats WHERE id = ? FOR UPDATE', [id]);
    if (flats.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Flat not found' });
    }

    const previousOwnerId = flats[0].current_resident_id;

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
      'UPDATE flats SET flat_no = ?, wing = ?, floor_no = ?, current_resident_id = ?, status = ?, maintenance_charge = ?, flat_type_id = ? WHERE id = ?',
      [flat_no, wing || 'A', floor_no, residentId, residentId ? 'Occupied' : 'Available', maintenance_charge || 0, flatTypeId, id]
    );

    await connection.commit();

    res.json({ message: 'Flat updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Update flat error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Flat number already exists in this wing' });
    }
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

const getCurrentResident = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await promisePool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, COALESCE(rfa.start_date, u.created_at, NOW()) AS start_date
       FROM users u
       JOIN flats f ON u.id = f.current_resident_id
       LEFT JOIN resident_flat_assignments rfa ON u.id = rfa.resident_id AND rfa.flat_id = f.id AND rfa.is_active = TRUE
       WHERE f.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.json(null);
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Get current resident error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFlatHistory = async (req, res) => {
  try {
    const { id } = req.params; // flatId
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!(await canViewFlat(req.user, id))) {
      return res.status(403).json({ message: 'Access denied. You can only view history of your own flat.' });
    }

    const [rows] = await promisePool.query(
      `SELECT rfa.id, rfa.start_date, rfa.end_date, rfa.is_active,
              u.id AS resident_id, u.name AS resident_name, u.email AS resident_email, u.phone AS resident_phone
       FROM resident_flat_assignments rfa
       JOIN users u ON rfa.resident_id = u.id
       WHERE rfa.flat_id = ?
       ORDER BY rfa.start_date DESC, rfa.id DESC`,
      [id]
    );

    // Sanitize if requested by a resident
    if (userRole !== 'admin') {
      const sanitized = rows.map(r => {
        // If it's a history record for a different user, mask personal details
        if (Number(r.resident_id) !== Number(userId)) {
          return {
            id: r.id,
            start_date: r.start_date,
            end_date: r.end_date,
            is_active: r.is_active,
            resident_id: null,
            resident_name: 'Previous Resident',
            resident_email: null,
            resident_phone: null
          };
        }
        return r;
      });
      return res.json(sanitized);
    }

    res.json(rows);
  } catch (error) {
    console.error('Get flat history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFlatTransfers = async (req, res) => {
  try {
    const { id } = req.params; // flatId
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!(await canViewFlat(req.user, id))) {
      return res.status(403).json({ message: 'Access denied. You can only view transfers of your own flat.' });
    }

    if (userRole === 'admin') {
      const [rows] = await promisePool.query(
        `SELECT fth.*,
                u_old.name AS old_resident_name, u_old.email AS old_resident_email, u_old.phone AS old_resident_phone,
                u_new.name AS new_resident_name, u_new.email AS new_resident_email, u_new.phone AS new_resident_phone,
                u_admin.name AS admin_name
         FROM flat_transfer_history fth
         LEFT JOIN users u_old ON fth.old_resident_id = u_old.id
         LEFT JOIN users u_new ON fth.new_resident_id = u_new.id
         LEFT JOIN users u_admin ON fth.transferred_by = u_admin.id
         WHERE fth.flat_id = ?
         ORDER BY fth.transfer_date DESC, fth.id DESC`,
        [id]
      );
      res.json(rows);
    } else {
      const [rows] = await promisePool.query(
        `SELECT fth.id, fth.flat_id, fth.transfer_date, fth.transfer_reason, fth.created_at
         FROM flat_transfer_history fth
         WHERE fth.flat_id = ?
         ORDER BY fth.transfer_date DESC, fth.id DESC`,
        [id]
      );
      res.json(rows);
    }
  } catch (error) {
    console.error('Get flat transfers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFlatMaintenanceHistory = async (req, res) => {
  try {
    const { id } = req.params; // flatId
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!(await canViewFlat(req.user, id))) {
      return res.status(403).json({ message: 'Access denied. You can only view maintenance of your own flat.' });
    }

    const [rows] = await promisePool.query(
      `SELECT m.id, m.month, m.year, m.amount, m.penalty_amount, m.total_amount, m.status, m.payment_date, m.resident_id,
              u.name AS resident_name, u.email AS resident_email
       FROM maintenance m
       LEFT JOIN users u ON m.resident_id = u.id
       WHERE m.flat_id = ?
       ORDER BY m.year DESC, m.month DESC, m.id DESC`,
      [id]
    );

    // Sanitize for resident if it belongs to a different resident
    const sanitizedRows = rows.map(row => {
      if (userRole !== 'admin' && Number(row.resident_id) !== Number(userId)) {
        return {
          id: row.id,
          month: row.month,
          year: row.year,
          total_amount: row.total_amount,
          amount: row.amount,
          penalty_amount: row.penalty_amount,
          status: row.status,
          payment_date: row.payment_date,
          resident_id: null,
          resident_name: null,
          resident_email: null
        };
      }
      return row;
    });

    res.json(sanitizedRows);
  } catch (error) {
    console.error('Get flat maintenance history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const transferFlat = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { flatId, oldResidentId, residentId, transferDate, reason } = req.body;
    const newResidentId = residentId; // Map residentId to newResidentId

    if (!flatId) {
      return res.status(400).json({ message: 'Flat ID is required' });
    }

    const targetNewResidentId = (newResidentId === undefined || newResidentId === null || newResidentId === '' || newResidentId === 'unassigned' || Number(newResidentId) === 0) ? null : Number(newResidentId);
    const targetOldResidentId = (oldResidentId === undefined || oldResidentId === null || oldResidentId === '' || oldResidentId === 'unassigned' || Number(oldResidentId) === 0) ? null : Number(oldResidentId);

    await connection.beginTransaction();

    // 1. Lock and verify flat
    const [flats] = await connection.query(
      'SELECT id, flat_no, wing, current_resident_id FROM flats WHERE id = ? FOR UPDATE',
      [flatId]
    );
    if (flats.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Flat not found' });
    }

    const flat = flats[0];
    const previousResidentId = flat.current_resident_id;

    // Verify old resident matches the database record if provided
    if (targetOldResidentId && previousResidentId && Number(previousResidentId) !== Number(targetOldResidentId)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Selected old resident does not match the flat\'s current resident' });
    }

    // 2. Lock and verify new resident if targetNewResidentId is specified
    if (targetNewResidentId) {
      const [residents] = await connection.query(
        'SELECT id, role FROM users WHERE id = ? FOR UPDATE',
        [targetNewResidentId]
      );
      if (residents.length === 0 || residents[0].role !== 'resident') {
        await connection.rollback();
        return res.status(400).json({ message: 'New resident not found or invalid role' });
      }
    }

    // Get previous resident name
    let previousResidentName = 'Unassigned';
    if (previousResidentId) {
      const [oldUser] = await connection.query('SELECT name FROM users WHERE id = ?', [previousResidentId]);
      if (oldUser.length > 0) {
        previousResidentName = oldUser[0].name;
      }
    }

    // Get new resident name
    let newResidentName = 'Unassigned';
    if (targetNewResidentId) {
      const [newUser] = await connection.query('SELECT name FROM users WHERE id = ?', [targetNewResidentId]);
      if (newUser.length > 0) {
        newResidentName = newUser[0].name;
      }
    }

    // 3. End any current active assignment for the flat
    await connection.query(
      `UPDATE resident_flat_assignments 
       SET is_active = FALSE, end_date = ? 
       WHERE flat_id = ? AND is_active = TRUE`,
      [transferDate || new Date(), flatId]
    );

    // 4. Create new active assignment if targetNewResidentId is specified
    if (targetNewResidentId) {
      await connection.query(
        `INSERT INTO resident_flat_assignments (flat_id, resident_id, start_date, is_active) 
         VALUES (?, ?, ?, TRUE)`,
        [flatId, targetNewResidentId, transferDate || new Date()]
      );
    }

    // 5. Update flats table
    await connection.query(
      `UPDATE flats SET current_resident_id = ?, status = ? WHERE id = ?`,
      [targetNewResidentId, targetNewResidentId ? 'Occupied' : 'Available', flatId]
    );

    // 6. Update old resident's flat_id reference if they no longer own any active flats
    if (previousResidentId && Number(previousResidentId) !== Number(targetNewResidentId || 0)) {
      const [otherAssignments] = await connection.query(
        'SELECT flat_id FROM resident_flat_assignments WHERE resident_id = ? AND is_active = TRUE LIMIT 1',
        [previousResidentId]
      );
      if (otherAssignments.length === 0) {
        await connection.query('UPDATE users SET flat_id = NULL WHERE id = ?', [previousResidentId]);
      } else {
        await connection.query('UPDATE users SET flat_id = ? WHERE id = ?', [otherAssignments[0].flat_id, previousResidentId]);
      }
    }

    // 7. Update new user's flat_id reference if specified
    if (targetNewResidentId) {
      await connection.query(
        `UPDATE users SET flat_id = ? WHERE id = ?`,
        [flatId, targetNewResidentId]
      );
    }

    // 8. Create Flat Transfer History record
    await connection.query(
      `INSERT INTO flat_transfer_history 
       (flat_id, old_resident_id, new_resident_id, transfer_date, transfer_reason, transferred_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        flatId,
        previousResidentId || null,
        targetNewResidentId || null,
        transferDate || new Date(),
        reason || 'Flat transfer',
        req.user.id
      ]
    );

    // 9. Record in activity audit log
    const auditDetails = JSON.stringify({
      flatNo: `${flat.wing || 'A'}-${flat.flat_no}`,
      previousResident: previousResidentName,
      newResident: newResidentName,
      transferDate: transferDate || new Date(),
      reason: reason || ''
    });

    await connection.query(
      `INSERT INTO maintenance_audit_logs (user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'flat_transfer', 'flat', flatId, auditDetails]
    );

    await connection.commit();
    res.json({ message: targetNewResidentId ? 'Flat transferred successfully' : 'Flat set to unassigned successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Transfer flat error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

module.exports = { 
  getAllFlats, 
  getAvailableFlats, 
  getFlatById, 
  createFlat, 
  updateFlat, 
  deleteFlat,
  getCurrentResident,
  getFlatHistory,
  getFlatTransfers,
  getFlatMaintenanceHistory,
  transferFlat
};
