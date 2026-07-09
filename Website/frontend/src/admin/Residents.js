import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit3, Plus, Trash2, Users } from 'lucide-react';
import { userAPI, flatAPI } from '../services/api';

const Residents = () => {
  const [residents, setResidents] = useState([]);
  const [flats, setFlats] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'resident', flat_id: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [usersRes, flatsRes] = await Promise.all([userAPI.getAll(), flatAPI.getAll()]);
      setResidents(usersRes.data.filter((user) => user.role === 'resident'));
      setFlats(flatsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const occupiedFlats = useMemo(() => flats.filter((flat) => flat.owner_id).length, [flats]);

  const handleAdd = () => {
    setEditingResident(null);
    setFormData({ name: '', email: '', password: '', role: 'resident', flat_id: '' });
    setShowModal(true);
  };

  const handleEdit = (resident) => {
    setEditingResident(resident);
    setFormData({ name: resident.name, email: resident.email, password: '', role: resident.role, flat_id: '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this resident?')) {
      try {
        await userAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting resident:', error);
        alert('Error deleting resident');
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingResident) await userAPI.update(editingResident.id, formData);
      else await userAPI.create(formData);
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving resident:', error);
      alert('Error saving resident');
    }
  };

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  if (loading) return <div className="portal-empty">Loading residents...</div>;

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>Residents</h1>
          <p>Manage resident accounts and flat assignments.</p>
        </div>
        <button className="portal-primary-btn" onClick={handleAdd}><Plus size={17} /> Add Resident</button>
      </div>

      <div className="portal-kpis">
        <div className="portal-kpi"><span>Total Residents</span><strong>{residents.length}</strong><small>Active resident accounts</small><div className="portal-kpi-icon"><Users size={18} /></div></div>
        <div className="portal-kpi green"><span>Occupied Flats</span><strong>{occupiedFlats}</strong><small>{flats.length} total flats</small><div className="portal-kpi-icon"><CalendarDays size={18} /></div></div>
      </div>

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head"><div><h2>Resident Directory</h2><p>Names, emails, roles and created dates.</p></div></div>
        <div className="portal-table-wrap">
          <table className="portal-data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created At</th><th>Actions</th></tr></thead>
            <tbody>
              {residents.map((resident) => (
                <tr key={resident.id}>
                  <td><strong>{resident.name}</strong></td>
                  <td>{resident.email}</td>
                  <td><span className="portal-status paid">{resident.role}</span></td>
                  <td>{new Date(resident.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="portal-row-actions">
                      <button onClick={() => handleEdit(resident)}><Edit3 size={14} /> Edit</button>
                      <button className="danger" onClick={() => handleDelete(resident.id)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!residents.length && <div className="portal-empty">No residents found.</div>}
        </div>
      </section>

      {showModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowModal(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div><h3>{editingResident ? 'Edit Resident' : 'Add Resident'}</h3><p>Keep resident details current.</p></div>
              <button onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="portal-form">
              <label><span>Name</span><input name="name" value={formData.name} onChange={handleChange} required /></label>
              <label><span>Email</span><input type="email" name="email" value={formData.email} onChange={handleChange} required /></label>
              <label><span>Password</span><input type="password" name="password" value={formData.password} onChange={handleChange} required={!editingResident} /></label>
              <label><span>Assign Flat</span><select name="flat_id" value={formData.flat_id} onChange={handleChange}><option value="">Select Flat</option>{flats.map((flat) => <option key={flat.id} value={flat.id}>Flat {flat.flat_no} - Floor {flat.floor_no}</option>)}</select></label>
              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowModal(false)}>Cancel</button><button className="portal-primary-btn">{editingResident ? 'Update Resident' : 'Add Resident'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Residents;
