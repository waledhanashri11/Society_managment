import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Edit3, Plus, ShieldCheck, Trash2, Users, XCircle } from 'lucide-react';
import { userAPI, flatAPI } from '../services/api';

const Residents = () => {
  const [residents, setResidents] = useState([]);
  const [flats, setFlats] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'resident', status: 'approved', flat_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [usersRes, flatsRes] = await Promise.all([userAPI.getAll(), flatAPI.getAll()]);
      setResidents(usersRes.data.filter((user) => user.role === 'resident'));
      setFlats(flatsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Could not load residents and flats.' });
    } finally {
      setLoading(false);
    }
  };

  const occupiedFlats = useMemo(() => flats.filter((flat) => flat.owner_id).length, [flats]);
  const assignableFlats = useMemo(() => {
    return flats.filter((flat) => !flat.owner_id || Number(flat.owner_id) === Number(editingResident?.id));
  }, [flats, editingResident]);

  const handleAdd = () => {
    setMessage({ type: '', text: '' });
    setEditingResident(null);
    setFormData({ name: '', email: '', phone: '', password: '', role: 'resident', status: 'approved', flat_id: '' });
    setShowModal(true);
  };

  const handleEdit = (resident) => {
    setMessage({ type: '', text: '' });
    setEditingResident(resident);
    setFormData({ name: resident.name, email: resident.email, phone: resident.phone || '', password: '', role: resident.role, status: resident.status || 'approved', flat_id: resident.flat_id || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this resident?')) {
      try {
        await userAPI.delete(id);
        setMessage({ type: 'success', text: 'Resident deleted and assigned flat made available.' });
        await fetchData();
      } catch (error) {
        console.error('Error deleting resident:', error);
        setMessage({ type: 'error', text: error.response?.data?.message || 'Error deleting resident.' });
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.flat_id) {
      setMessage({ type: 'error', text: 'Please assign an available flat to this resident.' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      if (editingResident) await userAPI.update(editingResident.id, formData);
      else await userAPI.create(formData);
      setShowModal(false);
      setMessage({ type: 'success', text: editingResident ? 'Resident updated and flat assignment saved.' : 'Resident added and flat marked occupied.' });
      await fetchData();
    } catch (error) {
      console.error('Error saving resident:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving resident.' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (resident, status) => {
    try {
      await userAPI.updateStatus(resident.id, status);
      setMessage({ type: 'success', text: `Resident ${status} successfully.` });
      await fetchData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Could not update resident status.' });
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

      {message.text && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="portal-kpis">
        <div className="portal-kpi"><span>Total Residents</span><strong>{residents.length}</strong><small>Active resident accounts</small><div className="portal-kpi-icon"><Users size={18} /></div></div>
        <div className="portal-kpi green"><span>Occupied Flats</span><strong>{occupiedFlats}</strong><small>{flats.length} total flats</small><div className="portal-kpi-icon"><CalendarDays size={18} /></div></div>
      </div>

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head"><div><h2>Resident Directory</h2><p>Names, assigned flats and account dates.</p></div></div>
        <div className="portal-table-wrap">
          <table className="portal-data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Assigned Flat</th><th>Wing</th><th>Floor</th><th>Status</th><th>Created At</th><th>Actions</th></tr></thead>
            <tbody>
              {residents.map((resident) => (
                <tr key={resident.id}>
                  <td><strong>{resident.name}</strong></td>
                  <td>{resident.email}</td>
                  <td>{resident.phone || <span className="portal-muted-text">Not added</span>}</td>
                  <td>{resident.flat_no ? <strong>Flat {resident.flat_no}</strong> : <span className="portal-muted-text">Not assigned</span>}</td>
                  <td>{resident.wing || <span className="portal-muted-text">-</span>}</td>
                  <td>{resident.floor_no ?? <span className="portal-muted-text">-</span>}</td>
                  <td><span className={`portal-status ${resident.status === 'approved' ? 'paid' : 'pending'}`}>{resident.status || 'approved'}</span></td>
                  <td>{new Date(resident.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="portal-row-actions">
                      {resident.status !== 'approved' && <button onClick={() => handleStatus(resident, 'approved')}><ShieldCheck size={14} /> Approve</button>}
                      {resident.status !== 'rejected' && <button onClick={() => handleStatus(resident, 'rejected')}><XCircle size={14} /> Reject</button>}
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
              <label><span>Phone</span><input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Resident phone" /></label>
              <label><span>Status</span><select name="status" value={formData.status} onChange={handleChange}><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></label>
              <label><span>Password</span><input type="password" name="password" value={formData.password} onChange={handleChange} required={!editingResident} minLength="6" /></label>
              <label className="portal-field-full">
                <span>Assigned Flat</span>
                <select name="flat_id" value={formData.flat_id} onChange={handleChange} required>
                  <option value="">Select available flat</option>
                  {assignableFlats.map((flat) => (
                    <option key={flat.id} value={flat.id}>
                      Wing {flat.wing || 'A'} - Flat {flat.flat_no} - Floor {flat.floor_no}
                      {Number(flat.owner_id) === Number(editingResident?.id) ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
                {!assignableFlats.length && <small className="text-red-600">No available flats. Add a flat or free an occupied one first.</small>}
              </label>
              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button><button className="portal-primary-btn" disabled={saving || !assignableFlats.length}>{saving ? 'Saving...' : editingResident ? 'Update Resident' : 'Add Resident'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Residents;
