import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Edit3, IndianRupee, Plus, Trash2 } from 'lucide-react';
import { flatAPI, userAPI } from '../services/api';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const Flats = () => {
  const [flats, setFlats] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [formData, setFormData] = useState({ flat_no: '', floor_no: '', owner_id: '', maintenance_charge: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [flatsRes, usersRes] = await Promise.all([flatAPI.getAll(), userAPI.getAll()]);
      setFlats(flatsRes.data);
      setUsers(usersRes.data.filter((user) => user.role === 'resident'));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalMaintenance = useMemo(() => flats.reduce((sum, flat) => sum + Number(flat.maintenance_charge || 0), 0), [flats]);

  const handleAdd = () => {
    setEditingFlat(null);
    setFormData({ flat_no: '', floor_no: '', owner_id: '', maintenance_charge: '' });
    setShowModal(true);
  };

  const handleEdit = (flat) => {
    setEditingFlat(flat);
    setFormData({ flat_no: flat.flat_no, floor_no: flat.floor_no, owner_id: flat.owner_id || '', maintenance_charge: flat.maintenance_charge || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this flat?')) {
      try { await flatAPI.delete(id); fetchData(); }
      catch (error) { console.error('Error deleting flat:', error); alert('Error deleting flat'); }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingFlat) await flatAPI.update(editingFlat.id, formData);
      else await flatAPI.create(formData);
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving flat:', error);
      alert('Error saving flat');
    }
  };

  const handleChange = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  if (loading) return <div className="portal-empty">Loading flats...</div>;

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Flats</h1><p>Manage society flats, owners and monthly charges.</p></div>
        <button className="portal-primary-btn" onClick={handleAdd}><Plus size={17} /> Add Flat</button>
      </div>

      <div className="portal-kpis">
        <div className="portal-kpi"><span>Total Flats</span><strong>{flats.length}</strong><small>{flats.filter((flat) => flat.owner_id).length} assigned</small><div className="portal-kpi-icon"><Building2 size={18} /></div></div>
        <div className="portal-kpi green"><span>Monthly Charges</span><strong>{money(totalMaintenance)}</strong><small>Expected per cycle</small><div className="portal-kpi-icon"><IndianRupee size={18} /></div></div>
      </div>

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head"><div><h2>Flat Inventory</h2><p>Owner and maintenance charge details.</p></div></div>
        <div className="portal-table-wrap">
          <table className="portal-data-table">
            <thead><tr><th>Flat No</th><th>Floor</th><th>Owner</th><th>Maintenance Charge</th><th>Actions</th></tr></thead>
            <tbody>
              {flats.map((flat) => (
                <tr key={flat.id}>
                  <td><strong>Flat {flat.flat_no}</strong></td>
                  <td>{flat.floor_no}</td>
                  <td>{flat.owner_name || <span className="portal-muted-text">Unassigned</span>}</td>
                  <td>{money(flat.maintenance_charge)}</td>
                  <td><div className="portal-row-actions"><button onClick={() => handleEdit(flat)}><Edit3 size={14} /> Edit</button><button className="danger" onClick={() => handleDelete(flat.id)}><Trash2 size={14} /> Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!flats.length && <div className="portal-empty">No flats found.</div>}
        </div>
      </section>

      {showModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowModal(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head"><div><h3>{editingFlat ? 'Edit Flat' : 'Add Flat'}</h3><p>Assign owners and maintenance amount.</p></div><button onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit} className="portal-form">
              <label><span>Flat Number</span><input name="flat_no" value={formData.flat_no} onChange={handleChange} required /></label>
              <label><span>Floor Number</span><input type="number" name="floor_no" value={formData.floor_no} onChange={handleChange} required /></label>
              <label><span>Assign Owner</span><select name="owner_id" value={formData.owner_id} onChange={handleChange}><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}</select></label>
              <label><span>Maintenance Charge</span><input type="number" min="0" name="maintenance_charge" value={formData.maintenance_charge} onChange={handleChange} required /></label>
              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowModal(false)}>Cancel</button><button className="portal-primary-btn">{editingFlat ? 'Update Flat' : 'Add Flat'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flats;
