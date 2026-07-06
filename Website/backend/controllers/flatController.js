const { promisePool } = require('../config/database');

const getAllFlats = async (req, res) => {
  try {
    const [flats] = await promisePool.query(`
      SELECT f.*, u.name as owner_name, u.email as owner_email 
      FROM flats f 
      LEFT JOIN users u ON f.owner_id = u.id 
      ORDER BY f.floor_no, f.flat_no
    `);
    res.json(flats);
  } catch (error) {
    console.error('Get flats error:', error);
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
  try {
    const { flat_no, floor_no, owner_id, maintenance_charge } = req.body;

    const [rows] = await promisePool.query(
      'INSERT INTO flats (flat_no, floor_no, owner_id, maintenance_charge) VALUES (?, ?, ?, ?) RETURNING id',
      [flat_no, floor_no, owner_id || null, maintenance_charge || 0]
    );

    res.status(201).json({
      id: rows[0].id,
      flat_no,
      floor_no,
      owner_id,
      maintenance_charge: maintenance_charge || 0
    });
  } catch (error) {
    console.error('Create flat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateFlat = async (req, res) => {
  try {
    const { id } = req.params;
    const { flat_no, floor_no, owner_id, maintenance_charge } = req.body;

    await promisePool.query(
      'UPDATE flats SET flat_no = ?, floor_no = ?, owner_id = ?, maintenance_charge = ? WHERE id = ?',
      [flat_no, floor_no, owner_id || null, maintenance_charge || 0, id]
    );

    res.json({ message: 'Flat updated successfully' });
  } catch (error) {
    console.error('Update flat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteFlat = async (req, res) => {
  try {
    const { id } = req.params;

    await promisePool.query('DELETE FROM flats WHERE id = ?', [id]);

    res.json({ message: 'Flat deleted successfully' });
  } catch (error) {
    console.error('Delete flat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllFlats, getFlatById, createFlat, updateFlat, deleteFlat };
