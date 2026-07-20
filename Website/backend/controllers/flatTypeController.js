const { promisePool } = require('../config/database');

const getAllFlatTypes = async (req, res) => {
  try {
    const [flatTypes] = await promisePool.query(
      'SELECT * FROM flat_types ORDER BY name ASC'
    );
    res.json(flatTypes);
  } catch (error) {
    console.error('Get flat types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createFlatType = async (req, res) => {
  try {
    const { name, default_maintenance_amount, description, status } = req.body;

    if (!name || default_maintenance_amount === undefined) {
      return res.status(400).json({ message: 'Name and default maintenance amount are required' });
    }

    const amt = Number(default_maintenance_amount);
    if (isNaN(amt) || amt < 0) {
      return res.status(400).json({ message: 'Default maintenance amount must be a positive number' });
    }

    // Check unique name
    const [existing] = await promisePool.query(
      'SELECT id FROM flat_types WHERE name = ?',
      [name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Flat Type with this name already exists' });
    }

    const [result] = await promisePool.query(
      'INSERT INTO flat_types (name, default_maintenance_amount, description, status) VALUES (?, ?, ?, ?)',
      [name.trim(), amt, description || null, status || 'Active']
    );

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      default_maintenance_amount: amt,
      description: description || null,
      status: status || 'Active'
    });
  } catch (error) {
    console.error('Create flat type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateFlatType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, default_maintenance_amount, description, status } = req.body;

    if (!name || default_maintenance_amount === undefined) {
      return res.status(400).json({ message: 'Name and default maintenance amount are required' });
    }

    const amt = Number(default_maintenance_amount);
    if (isNaN(amt) || amt < 0) {
      return res.status(400).json({ message: 'Default maintenance amount must be a positive number' });
    }

    // Check uniqueness (excluding current ID)
    const [existing] = await promisePool.query(
      'SELECT id FROM flat_types WHERE name = ? AND id != ?',
      [name.trim(), id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Another Flat Type with this name already exists' });
    }

    await promisePool.query(
      'UPDATE flat_types SET name = ?, default_maintenance_amount = ?, description = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [name.trim(), amt, description || null, status || 'Active', id]
    );

    res.json({ message: 'Flat Type updated successfully' });
  } catch (error) {
    console.error('Update flat type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteFlatType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if flat type is assigned to any flat
    const [assignedFlats] = await promisePool.query(
      'SELECT id FROM flats WHERE flat_type_id = ? LIMIT 1',
      [id]
    );
    if (assignedFlats.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete Flat Type as it is currently assigned to one or more flats'
      });
    }

    await promisePool.query('DELETE FROM flat_types WHERE id = ?', [id]);
    res.json({ message: 'Flat Type deleted successfully' });
  } catch (error) {
    console.error('Delete flat type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateFlatTypeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (Active/Inactive) is required' });
    }

    await promisePool.query(
      'UPDATE flat_types SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    res.json({ message: 'Flat Type status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllFlatTypes,
  createFlatType,
  updateFlatType,
  deleteFlatType,
  updateFlatTypeStatus
};
