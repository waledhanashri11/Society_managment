import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Edit3, IndianRupee, Plus, Trash2, XCircle, RefreshCw, History, Calendar, Eye, Settings } from 'lucide-react';
import { flatAPI, userAPI, residentsAPI, flatTypeAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const Flats = () => {
  const [tab, setTab] = useState('flats'); // 'flats' or 'flat_types'
  const [flats, setFlats] = useState([]);
  const [users, setUsers] = useState([]);
  const [flatTypes, setFlatTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [formData, setFormData] = useState({ flat_no: '', wing: 'A', floor_no: '', owner_id: '', maintenance_charge: '', flat_type_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Flat Type CRUD states
  const [showFlatTypeModal, setShowFlatTypeModal] = useState(false);
  const [editingFlatType, setEditingFlatType] = useState(null);
  const [flatTypeForm, setFlatTypeForm] = useState({ name: '', default_maintenance_amount: '', description: '', status: 'Active' });

  // Flat Transfer states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedFlatForTransfer, setSelectedFlatForTransfer] = useState(null);
  const [transferCurrentResident, setTransferCurrentResident] = useState(null);
  const [transferHistory, setTransferHistory] = useState([]);
  const [flatTransfersList, setFlatTransfersList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [transferFormData, setTransferFormData] = useState({
    oldResidentId: '',
    residentId: '',
    reason: '',
    mode: 'existing',
    newResidentName: '',
    newResidentEmail: '',
    newResidentPhone: '',
    newResidentPassword: '',
    transferDate: new Date().toISOString().split('T')[0]
  });
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [flatsRes, usersRes, flatTypesRes] = await Promise.all([
        flatAPI.getAll({ force: true }),
        userAPI.getAll({ force: true }),
        flatTypeAPI.getAll({ force: true })
      ]);
      setFlats(flatsRes.data);
      setUsers(usersRes.data.filter((user) => user.role === 'resident'));
      setFlatTypes(flatTypesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Could not load flats, residents, and flat types.' });
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
    setFormData({ flat_no: '', wing: 'A', floor_no: '', owner_id: '', maintenance_charge: '', flat_type_id: '' });
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
      maintenance_charge: flat.maintenance_charge || '',
      flat_type_id: flat.flat_type_id || ''
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
      const payload = {
        ...formData,
        flat_type_id: formData.flat_type_id || null
      };
      if (editingFlat) await flatAPI.update(editingFlat.id, payload);
      else await flatAPI.create(payload);
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'flat_type_id') {
      const selectedType = flatTypes.find(ft => Number(ft.id) === Number(value));
      setFormData((current) => ({
        ...current,
        flat_type_id: value,
        maintenance_charge: selectedType ? selectedType.default_maintenance_amount : current.maintenance_charge
      }));
    } else {
      setFormData((current) => ({ ...current, [name]: value }));
    }
  };

  // Flat Type CRUD Logic
  const handleFlatTypeAdd = () => {
    setMessage({ type: '', text: '' });
    setEditingFlatType(null);
    setFlatTypeForm({ name: '', default_maintenance_amount: '', description: '', status: 'Active' });
    setShowFlatTypeModal(true);
  };

  const handleFlatTypeEdit = (flatType) => {
    setMessage({ type: '', text: '' });
    setEditingFlatType(flatType);
    setFlatTypeForm({
      name: flatType.name,
      default_maintenance_amount: flatType.default_maintenance_amount,
      description: flatType.description || '',
      status: flatType.status || 'Active'
    });
    setShowFlatTypeModal(true);
  };

  const handleFlatTypeDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this Flat Type? It can only be deleted if not assigned to any flat.')) {
      try {
        await flatTypeAPI.delete(id);
        setMessage({ type: 'success', text: 'Flat Type deleted successfully.' });
        await fetchData();
      } catch (error) {
        console.error('Error deleting flat type:', error);
        setMessage({ type: 'error', text: error.response?.data?.message || 'Error deleting flat type.' });
      }
    }
  };

  const handleFlatTypeSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        ...flatTypeForm,
        default_maintenance_amount: Number(flatTypeForm.default_maintenance_amount || 0)
      };
      if (editingFlatType) {
        await flatTypeAPI.update(editingFlatType.id, payload);
        setMessage({ type: 'success', text: 'Flat Type updated successfully.' });
      } else {
        await flatTypeAPI.create(payload);
        setMessage({ type: 'success', text: 'Flat Type added successfully.' });
      }
      setShowFlatTypeModal(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving flat type:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving flat type.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFlatTypeStatusToggle = async (flatType) => {
    const newStatus = flatType.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await flatTypeAPI.update(flatType.id, {
        name: flatType.name,
        default_maintenance_amount: flatType.default_maintenance_amount,
        description: flatType.description || '',
        status: newStatus
      });
      setMessage({ type: 'success', text: `Flat Type status updated to ${newStatus}.` });
      await fetchData();
    } catch (error) {
      console.error('Error toggling status:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error toggling status.' });
    }
  };

  // Flat Transfer logic
  const handleTransferClick = async (flat) => {
    setTransferError('');
    setTransferSuccess(null);
    setSelectedFlatForTransfer(flat);
    const initialOldResident = flat.current_resident_id || flat.owner_id || 'unassigned';
    setTransferFormData({
      oldResidentId: initialOldResident,
      residentId: '',
      reason: '',
      mode: 'existing',
      newResidentName: '',
      newResidentEmail: '',
      newResidentPhone: '',
      newResidentPassword: 'resident' + Math.floor(1000 + Math.random() * 9000),
      transferDate: new Date().toISOString().split('T')[0]
    });
    setShowTransferModal(true);
    fetchTransferHistory(flat.id);
  };

  const fetchTransferHistory = async (flatId) => {
    setLoadingHistory(true);
    try {
      const [currentRes, historyRes, transfersRes] = await Promise.all([
        flatAPI.getCurrentResident(flatId),
        flatAPI.getHistory(flatId),
        flatAPI.getTransfers(flatId)
      ]);
      setTransferCurrentResident(currentRes.data);
      setTransferHistory(historyRes.data);
      setFlatTransfersList(transfersRes.data);
    } catch (error) {
      console.error('Error fetching flat resident history:', error);
      setTransferError('Could not load current resident and history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTransferSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setTransferError('');
    setTransferSuccess(null);

    try {
      let targetResidentId = transferFormData.residentId;

      if (transferFormData.mode === 'new') {
        const { newResidentName, newResidentEmail, newResidentPhone, newResidentPassword } = transferFormData;
        if (!newResidentName || !newResidentEmail || !newResidentPassword) {
          throw new Error('Name, Email and Password are required to create a new resident.');
        }

        const newResidentRes = await residentsAPI.create({
          name: newResidentName,
          email: newResidentEmail,
          phone: newResidentPhone,
          password: newResidentPassword
        });
        targetResidentId = newResidentRes.data.id;
      }

      if (!targetResidentId) {
        throw new Error('Please select or create a resident.');
      }

      await flatAPI.transfer({
        flatId: selectedFlatForTransfer.id,
        oldResidentId: transferFormData.oldResidentId === 'unassigned' ? '' : transferFormData.oldResidentId,
        residentId: targetResidentId === 'unassigned' ? '' : targetResidentId,
        transferDate: transferFormData.transferDate,
        reason: transferFormData.reason
      });

      const newResName = targetResidentId === 'unassigned' 
        ? 'Unassigned / Available'
        : (transferFormData.mode === 'new' 
            ? transferFormData.newResidentName 
            : (users.find(u => Number(u.id) === Number(targetResidentId))?.name || 'Unknown Resident'));

      setTransferSuccess({
        flatNo: `${selectedFlatForTransfer.wing || 'A'}-${selectedFlatForTransfer.flat_no}`,
        previousResident: transferCurrentResident?.name || 'Unassigned / Available',
        newResident: newResName,
        transferDate: transferFormData.transferDate,
        message: targetResidentId === 'unassigned'
          ? `Flat ${selectedFlatForTransfer.flat_no} has been successfully released and is now available.`
          : `Flat ${selectedFlatForTransfer.flat_no} has been successfully transferred from ${transferCurrentResident?.name || 'Unassigned'} to ${newResName}. The resident directory has been updated.`
      });
      
      await fetchData();
      await fetchTransferHistory(selectedFlatForTransfer.id);
    } catch (error) {
      console.error('Flat transfer error:', error);
      setTransferError(error.response?.data?.message || error.message || 'Error transferring flat.');
    } finally {
      setSaving(false);
    }
  };

  const handleTransferChange = (event) => {
    setTransferFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>Flats Management</h1>
          <p>Configure wings, floor levels, residents assignment, and flat type profiles.</p>
        </div>
        {tab === 'flats' ? (
          <button className="portal-primary-btn" onClick={handleAdd}><Plus size={17} /> Add Flat</button>
        ) : (
          <button className="portal-primary-btn" onClick={handleFlatTypeAdd}><Plus size={17} /> Add Flat Type</button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-slate-200 mb-6" style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          className={`pb-2 px-1 font-semibold text-sm transition-all border-b-2`}
          style={{
            paddingBottom: '8px',
            paddingLeft: '4px',
            paddingRight: '4px',
            fontWeight: '600',
            fontSize: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: tab === 'flats' ? '2px solid #4f46e5' : '2px solid transparent',
            color: tab === 'flats' ? '#4f46e5' : '#64748b'
          }}
          onClick={() => setTab('flats')}
        >
          Flat Master
        </button>
        <button
          className={`pb-2 px-1 font-semibold text-sm transition-all border-b-2`}
          style={{
            paddingBottom: '8px',
            paddingLeft: '4px',
            paddingRight: '4px',
            fontWeight: '600',
            fontSize: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: tab === 'flat_types' ? '2px solid #4f46e5' : '2px solid transparent',
            color: tab === 'flat_types' ? '#4f46e5' : '#64748b'
          }}
          onClick={() => setTab('flat_types')}
        >
          Flat Types Config
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      {loading ? (
        <CardSkeleton count={2} />
      ) : tab === 'flats' ? (
        <>
          <div className="portal-kpis">
            <div className="portal-kpi"><span>Total Flats</span><strong>{flats.length}</strong><small>{flats.filter((flat) => flat.owner_id).length} occupied</small><div className="portal-kpi-icon"><Building2 size={18} /></div></div>
            <div className="portal-kpi green"><span>Total Monthly Expected Charge</span><strong>{money(totalMaintenance)}</strong><small>Expected base cycle</small><div className="portal-kpi-icon"><IndianRupee size={18} /></div></div>
          </div>

          <section className="portal-panel portal-table-card">
            <div className="portal-panel-head"><div><h2>Flat Inventory List</h2><p>Overview of all units, flat classifications, and assigned owners.</p></div></div>
            <div className="portal-table-wrap">
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>Flat No</th>
                    <th>Wing</th>
                    <th>Floor</th>
                    <th>Flat Type</th>
                    <th>Status</th>
                    <th>Assigned Resident</th>
                    <th>Base Maintenance Charge</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flats.map((flat) => (
                    <tr key={flat.id}>
                      <td><strong>Flat {flat.flat_no}</strong></td>
                      <td>{flat.wing || 'A'}</td>
                      <td>{flat.floor_no}</td>
                      <td>
                        <span style={{ fontWeight: '500', color: flat.flat_type_name ? '#1e293b' : '#94a3b8' }}>
                          {flat.flat_type_name || 'Not Assigned'}
                        </span>
                      </td>
                      <td><span className={`portal-status ${flat.owner_id ? 'paid' : 'pending'}`}>{flat.owner_id ? 'Occupied' : 'Available'}</span></td>
                      <td>{flat.assigned_resident_name || flat.owner_name || <span className="portal-muted-text">Unassigned</span>}</td>
                      <td>{money(flat.maintenance_charge)}</td>
                      <td>
                        <div className="portal-row-actions">
                          <button onClick={() => handleEdit(flat)}><Edit3 size={14} /> Edit</button>
                          <button className="info" style={{ color: '#2563eb' }} onClick={() => handleTransferClick(flat)}><RefreshCw size={14} /> Transfer</button>
                          <button className="danger" onClick={() => handleDelete(flat.id)}><Trash2 size={14} /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!flats.length && <div className="portal-empty">No flats registered.</div>}
            </div>
          </section>
        </>
      ) : (
        // Flat Types List
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head"><div><h2>Flat Classification Types</h2><p>List of configurations defining base maintenance charges based on property size/structure.</p></div></div>
          <div className="portal-table-wrap">
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>Type Name</th>
                  <th>Default Maintenance Charge</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flatTypes.map((ft) => (
                  <tr key={ft.id}>
                    <td><strong>{ft.name}</strong></td>
                    <td><strong>{money(ft.default_maintenance_amount)}</strong></td>
                    <td>{ft.description || <span className="portal-muted-text">No description</span>}</td>
                    <td>
                      <button 
                        onClick={() => handleFlatTypeStatusToggle(ft)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <span className={`portal-status ${ft.status === 'Active' ? 'paid' : 'pending'}`}>
                          {ft.status || 'Active'}
                        </span>
                      </button>
                    </td>
                    <td>
                      <div className="portal-row-actions">
                        <button onClick={() => handleFlatTypeEdit(ft)}><Edit3 size={14} /> Edit</button>
                        <button className="danger" onClick={() => handleFlatTypeDelete(ft.id)}><Trash2 size={14} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!flatTypes.length && <div className="portal-empty">No Flat Types configured yet. Click "Add Flat Type" to configure.</div>}
          </div>
        </section>
      )}

      {/* Flat Master Add/Edit Modal */}
      {showModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowModal(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head"><div><h3>{editingFlat ? 'Edit Flat details' : 'Add Flat Unit'}</h3><p>Configure wing, property classifications, and assigned owners.</p></div><button onClick={() => setShowModal(false)}>x</button></div>
            <form onSubmit={handleSubmit} className="portal-form">
              <label><span>Flat Number</span><input name="flat_no" value={formData.flat_no} onChange={handleChange} required /></label>
              <label><span>Wing</span><input name="wing" value={formData.wing} onChange={handleChange} required /></label>
              <label><span>Floor Number</span><input type="number" name="floor_no" value={formData.floor_no} onChange={handleChange} required /></label>
              
              <label>
                <span>Flat Type (Property Profile)</span>
                <select name="flat_type_id" value={formData.flat_type_id} onChange={handleChange}>
                  <option value="">Not Assigned</option>
                  {flatTypes.filter(ft => ft.status === 'Active' || Number(ft.id) === Number(formData.flat_type_id)).map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name} (Default: {money(ft.default_maintenance_amount)})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Assigned Resident / Owner</span>
                <select name="owner_id" value={formData.owner_id} onChange={handleChange}>
                  <option value="">Available / Unassigned</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}){Number(user.flat_id) === Number(editingFlat?.id) ? ' - Current' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Base Maintenance Charge (Overrides default if customized)</span>
                <input type="number" min="0" name="maintenance_charge" value={formData.maintenance_charge} onChange={handleChange} required />
              </label>

              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button><button className="portal-primary-btn" disabled={saving}>{saving ? 'Saving...' : editingFlat ? 'Update Flat' : 'Add Flat'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Flat Type Add/Edit Modal */}
      {showFlatTypeModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowFlatTypeModal(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head"><div><h3>{editingFlatType ? 'Edit Flat Type Profile' : 'Configure Flat Type Profile'}</h3><p>Manage default charges and characteristics for property groups.</p></div><button onClick={() => setShowFlatTypeModal(false)}>x</button></div>
            <form onSubmit={handleFlatTypeSubmit} className="portal-form">
              <label><span>Flat Type Profile Name (e.g. 2BHK, Villa, Office)</span><input value={flatTypeForm.name} onChange={(e) => setFlatTypeForm({ ...flatTypeForm, name: e.target.value })} required placeholder="e.g. 3BHK" /></label>
              <label>
                <span>Default Monthly Maintenance Amount</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input type="number" min="0" value={flatTypeForm.default_maintenance_amount} onChange={(e) => setFlatTypeForm({ ...flatTypeForm, default_maintenance_amount: e.target.value })} required placeholder="e.g. 3000" />
                </div>
              </label>
              <label className="portal-field-full"><span>Description / Dimension Details</span><textarea value={flatTypeForm.description} onChange={(e) => setFlatTypeForm({ ...flatTypeForm, description: e.target.value })} rows={3} placeholder="Optional size or wing criteria details" /></label>
              
              <label>
                <span>Status</span>
                <select value={flatTypeForm.status} onChange={(e) => setFlatTypeForm({ ...flatTypeForm, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowFlatTypeModal(false)} disabled={saving}>Cancel</button><button className="portal-primary-btn" disabled={saving}>{saving ? 'Saving...' : editingFlatType ? 'Update Type' : 'Configure Type'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Flat Transfer Modals */}
      {showTransferModal && selectedFlatForTransfer && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowTransferModal(false)}>
          <div className="portal-modal" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Transfer Flat {selectedFlatForTransfer.wing}-{selectedFlatForTransfer.flat_no}</h3>
                <p>Verify history and assign a new active resident.</p>
              </div>
              <button onClick={() => setShowTransferModal(false)}>x</button>
            </div>
            
            {transferSuccess && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 p-4 text-sm" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <strong style={{ display: 'block', marginBottom: '4px', fontSize: '15px' }}>Transfer Completed Successfully!</strong>
                <p style={{ margin: 0, fontSize: '13px' }}>{transferSuccess.message}</p>
                <div style={{ marginTop: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px', opacity: 0.9 }}>
                  <div>• Previous Owner: {transferSuccess.previousResident}</div>
                  <div>• New Owner: {transferSuccess.newResident}</div>
                  <div>• Transfer Date: {new Date(transferSuccess.transferDate).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            {transferError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 p-3 text-xs font-semibold" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
                {transferError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginTop: '10px' }}>
              <div>
                <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase', marginBottom: '6px' }}>Current Occupancy State</span>
                    <strong style={{ fontSize: '15px', color: '#2d3748' }}>
                      {transferCurrentResident ? `${transferCurrentResident.name} (${transferCurrentResident.email})` : 'Unassigned / Available'}
                    </strong>
                    {transferCurrentResident && (
                      <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                        Registered Since: {new Date(transferCurrentResident.start_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      <input type="radio" name="mode" checked={transferFormData.mode === 'existing'} onChange={() => setTransferFormData({ ...transferFormData, mode: 'existing' })} /> Assign Existing Resident
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      <input type="radio" name="mode" checked={transferFormData.mode === 'new'} onChange={() => setTransferFormData({ ...transferFormData, mode: 'new' })} /> Register New Resident
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      <input type="radio" name="mode" checked={transferFormData.mode === 'unassign'} onChange={() => setTransferFormData({ ...transferFormData, mode: 'existing', residentId: 'unassigned' })} /> Release / Vacate
                    </label>
                  </div>

                  <label>
                    <span>Transfer Effective Date</span>
                    <input type="date" name="transferDate" value={transferFormData.transferDate} onChange={handleTransferChange} required />
                  </label>

                  <label className="portal-field-full">
                    <span>Transfer Notes / Reference Reason</span>
                    <textarea name="reason" value={transferFormData.reason} onChange={handleTransferChange} rows="2" placeholder="e.g., Sold flat to buyer, or tenant lease terminated" />
                  </label>

                  {transferFormData.mode === 'existing' && (
                    <label>
                      <span>Select Target Resident Profile</span>
                      <select name="residentId" value={transferFormData.residentId} onChange={handleTransferChange} required>
                        <option value="">-- Choose Resident --</option>
                        {transferFormData.residentId === 'unassigned' && (
                          <option value="unassigned">Release to Available Status</option>
                        )}
                        <option value="unassigned">Release / Set Vacant</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {transferFormData.mode === 'new' && (
                    <>
                      <label>
                        <span>Resident Full Name</span>
                        <input name="newResidentName" value={transferFormData.newResidentName} onChange={handleTransferChange} required />
                      </label>
                      <label>
                        <span>Email Address</span>
                        <input type="email" name="newResidentEmail" value={transferFormData.newResidentEmail} onChange={handleTransferChange} required />
                      </label>
                      <label>
                        <span>Phone Number</span>
                        <input name="newResidentPhone" value={transferFormData.newResidentPhone} onChange={handleTransferChange} />
                      </label>
                      <label>
                        <span>Password (For Login)</span>
                        <input name="newResidentPassword" value={transferFormData.newResidentPassword} onChange={handleTransferChange} required />
                      </label>
                    </>
                  )}

                  <div className="portal-form-actions" style={{ marginTop: '20px' }}>
                    <button type="submit" className="portal-primary-btn" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                      {saving ? 'Processing...' : 'Confirm Transfer'}
                    </button>
                  </div>
                </form>
              </div>

              <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <History size={16} /> Flat Transfer History
                  </h4>

                  {loadingHistory ? (
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>Loading transfers...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                      {flatTransfersList.map((t) => (
                        <div key={t.id} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: '#fcfcfc', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                            <span>{t.old_resident_name || 'Unassigned'} ➔ {t.new_resident_name || 'Unassigned'}</span>
                            <span style={{ color: '#6b7280', fontSize: '10px' }}>{new Date(t.transfer_date).toLocaleDateString()}</span>
                          </div>
                          {t.transfer_reason && (
                            <div style={{ color: '#4b5563', fontStyle: 'italic', marginBottom: '4px' }}>
                              Reason: {t.transfer_reason}
                            </div>
                          )}
                          <div style={{ color: '#9ca3af', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Transferred by: {t.admin_name || 'Admin'}</span>
                            <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                      {!flatTransfersList.length && (
                        <div style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' }}>No transfer audit logs recorded.</div>
                      )}
                    </div>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #edf2f7', margin: 0 }} />

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <History size={16} /> Assignment History
                  </h4>

                  {loadingHistory ? (
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>Loading history...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                      {transferHistory.map((h) => (
                        <div key={h.id} style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: h.is_active ? '#f0fdf4' : '#ffffff', borderLeft: h.is_active ? '4px solid #22c55e' : '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '13px', color: '#111827' }}>{h.resident_name}</strong>
                            {h.is_active && (
                              <span style={{ fontSize: '11px', fontWeight: '600', color: '#166534', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '10px' }}>Active</span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{h.resident_email}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            {new Date(h.start_date).toLocaleDateString()} - {h.end_date ? new Date(h.end_date).toLocaleDateString() : 'Present'}
                          </div>
                        </div>
                      ))}
                      {!transferHistory.length && (
                        <div style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' }}>No occupancy assignment history recorded.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flats;
