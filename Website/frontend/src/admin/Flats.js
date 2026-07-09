import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Edit3, IndianRupee, Plus, Trash2, XCircle } from 'lucide-react';
import { flatAPI, userAPI } from '../services/api';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const Flats = () => {
  const [flats, setFlats] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [formData, setFormData] = useState({ flat_no: '', wing: 'A', floor_no: '', owner_id: '', maintenance_charge: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [flatsRes, usersRes] = await Promise.all([flatAPI.getAll(), userAPI.getAll()]);
      setFlats(flatsRes.data);
      setUsers(usersRes.data.filter((user) => user.role === 'resident'));
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Could not load flats and residents.' });
    } finally {
      setLoading(false);
    }
  };

  const totalMaintenance = useMemo(() => flats.reduce((sum, flat) => sum + Number(flat.maintenance_charge || 0), 0), [flats]);
  const assignableUsers = useMemo(() => {
    return users.filter((user) => !user.flat_id || Number(user.flat_id) === Number(editingFlat?.id));
  }, [users, editingFlat]);

  const handleAdd = () => {
    setMessage({ type: '', text: '' });
    setEditingFlat(null);
    setFormData({ flat_no: '', wing: 'A', floor_no: '', owner_id: '', maintenance_charge: '' });
    setShowModal(true);
  };

  const handleEdit = (flat) => {
    setMessage({ type: '', text: '' });
    setEditingFlat(flat);
    setFormData({
      flat_no: flat.flat_no,
      wing: flat.wing || 'A',
      floor_no: flat.floor_no,
      owner_id: flat.owner_id || '',
      maintenance_charge: flat.maintenance_charge || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this flat?')) {
      try {
        await flatAPI.delete(id);
        setMessage({ type: 'success', text: 'Flat deleted successfully.' });
        await fetchData();
      } catch (error) {
        console.error('Error deleting flat:', error);
        setMessage({ type: 'error', text: error.response?.data?.message || 'Error deleting flat.' });
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      if (editingFlat) await flatAPI.update(editingFlat.id, formData);
      else await flatAPI.create(formData);
      setShowModal(false);
      setMessage({ type: 'success', text: editingFlat ? 'Flat updated successfully.' : 'Flat added successfully.' });
      await fetchData();
    } catch (error) {
      console.error('Error saving flat:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving flat.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  if (loading) return <div className="portal-empty">Loading flats...</div>;

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Flats</h1><p>Manage society flats, assigned residents and monthly charges.</p></div>
        <button className="portal-primary-btn" onClick={handleAdd}><Plus size={17} /> Add Flat</button>
      </div>

      {message.text && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="portal-kpis">
        <div className="portal-kpi"><span>Total Flats</span><strong>{flats.length}</strong><small>{flats.filter((flat) => flat.owner_id).length} assigned</small><div className="portal-kpi-icon"><Building2 size={18} /></div></div>
        <div className="portal-kpi green"><span>Monthly Charges</span><strong>{money(totalMaintenance)}</strong><small>Expected per cycle</small><div className="portal-kpi-icon"><IndianRupee size={18} /></div></div>
      </div>

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head"><div><h2>Flat Inventory</h2><p>Assigned resident and maintenance charge details.</p></div></div>
        <div className="portal-table-wrap">
          <table className="portal-data-table">
            <thead><tr><th>Flat No</th><th>Wing</th><th>Floor</th><th>Status</th><th>Assigned Resident</th><th>Maintenance Charge</th><th>Actions</th></tr></thead>
            <tbody>
              {flats.map((flat) => (
                <tr key={flat.id}>
                  <td><strong>Flat {flat.flat_no}</strong></td>
                  <td>{flat.wing || 'A'}</td>
                  <td>{flat.floor_no}</td>
                  <td><span className={`portal-status ${flat.owner_id ? 'paid' : 'pending'}`}>{flat.owner_id ? 'Occupied' : 'Available'}</span></td>
                  <td>{flat.assigned_resident_name || flat.owner_name || <span className="portal-muted-text">Unassigned</span>}</td>
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
            <div className="portal-modal-head"><div><h3>{editingFlat ? 'Edit Flat' : 'Add Flat'}</h3><p>Maintain flat details and optional resident assignment.</p></div><button onClick={() => setShowModal(false)}>x</button></div>
            <form onSubmit={handleSubmit} className="portal-form">
              <label><span>Flat Number</span><input name="flat_no" value={formData.flat_no} onChange={handleChange} required /></label>
              <label><span>Wing</span><input name="wing" value={formData.wing} onChange={handleChange} required /></label>
              <label><span>Floor Number</span><input type="number" name="floor_no" value={formData.floor_no} onChange={handleChange} required /></label>
              <label>
                <span>Assigned Resident</span>
                <select name="owner_id" value={formData.owner_id} onChange={handleChange}>
                  <option value="">Available / Unassigned</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}){Number(user.flat_id) === Number(editingFlat?.id) ? ' - Current' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label><span>Maintenance Charge</span><input type="number" min="0" name="maintenance_charge" value={formData.maintenance_charge} onChange={handleChange} required /></label>
              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button><button className="portal-primary-btn" disabled={saving}>{saving ? 'Saving...' : editingFlat ? 'Update Flat' : 'Add Flat'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flats;
