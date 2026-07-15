import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Edit3, IndianRupee, Plus, Trash2, XCircle, RefreshCw, History, Calendar } from 'lucide-react';
import { flatAPI, userAPI, residentsAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

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
      
      // Refresh parent flat list
      await fetchData();

      // Refresh current resident & history modal view
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
        <div><h1>Flats</h1><p>Manage society flats, assigned residents and monthly charges.</p></div>
        <button className="portal-primary-btn" onClick={handleAdd}><Plus size={17} /> Add Flat</button>
      </div>

      {message.text && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      {loading ? <CardSkeleton count={2} /> : <div className="portal-kpis">
        <div className="portal-kpi"><span>Total Flats</span><strong>{flats.length}</strong><small>{flats.filter((flat) => flat.owner_id).length} assigned</small><div className="portal-kpi-icon"><Building2 size={18} /></div></div>
        <div className="portal-kpi green"><span>Monthly Charges</span><strong>{money(totalMaintenance)}</strong><small>Expected per cycle</small><div className="portal-kpi-icon"><IndianRupee size={18} /></div></div>
      </div>}

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head"><div><h2>Flat Inventory</h2><p>Assigned resident and maintenance charge details.</p></div></div>
        <div className="portal-table-wrap">
          {loading ? <TableSkeleton rows={5} columns={6} /> : <table className="portal-data-table">
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
          </table>}
          {!loading && !flats.length && <div className="portal-empty">No flats found.</div>}
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

      {showTransferModal && selectedFlatForTransfer && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowTransferModal(false)}>
          <div className="portal-modal" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Transfer Flat {selectedFlatForTransfer.wing}-{selectedFlatForTransfer.flat_no}</h3>
                <p>Transfer ownership, record reasons, and view historical audit logs.</p>
              </div>
              <button onClick={() => setShowTransferModal(false)}>x</button>
            </div>

            {transferError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                <XCircle size={18} />
                {transferError}
              </div>
            )}

            {transferSuccess && (
               <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                 <div className="flex items-center gap-2 font-semibold mb-2" style={{ fontSize: '15px' }}>
                   <CheckCircle2 size={18} />
                   Flat transferred successfully.
                 </div>
                 <p className="mb-3 font-medium">{transferSuccess.message}</p>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#dcfce7', padding: '10px', borderRadius: '6px', color: '#166534', fontSize: '12px' }}>
                   <div><strong>Flat Number:</strong> {transferSuccess.flatNo}</div>
                   <div><strong>Transfer Date:</strong> {transferSuccess.transferDate}</div>
                   <div><strong>Previous Resident:</strong> {transferSuccess.previousResident}</div>
                   <div><strong>New Resident:</strong> {transferSuccess.newResident}</div>
                 </div>
               </div>
             )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <form onSubmit={handleTransferSubmit} className="portal-form">
                  <label>
                    <span>Select Old Resident</span>
                    <select name="oldResidentId" value={transferFormData.oldResidentId} onChange={handleTransferChange} required>
                      <option value="unassigned">-- Unassigned / Available --</option>
                      {transferCurrentResident && (
                        <option value={transferCurrentResident.id}>
                          {transferCurrentResident.name} ({transferCurrentResident.email})
                        </option>
                      )}
                      {users
                        .filter((u) => u.id !== transferCurrentResident?.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    <span>Transfer Date</span>
                    <input type="date" name="transferDate" value={transferFormData.transferDate} onChange={handleTransferChange} required />
                  </label>

                  <label>
                    <span>Transfer Reason</span>
                    <input name="reason" value={transferFormData.reason} onChange={handleTransferChange} placeholder="e.g., Sold flat / Lease end / Rental change" required />
                  </label>

                  <div style={{ marginBottom: '15px', marginTop: '15px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>New Resident Option</span>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '500', cursor: 'pointer' }}>
                        <input type="radio" name="mode" value="existing" checked={transferFormData.mode === 'existing'} onChange={handleTransferChange} />
                        Search Existing
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '500', cursor: 'pointer' }}>
                        <input type="radio" name="mode" value="new" checked={transferFormData.mode === 'new'} onChange={handleTransferChange} />
                        Create New
                      </label>
                    </div>
                  </div>

                  {transferFormData.mode === 'existing' ? (
                    <label>
                      <span>Select New Resident</span>
                      <select name="residentId" value={transferFormData.residentId} onChange={handleTransferChange} required>
                        <option value="">-- Choose Resident --</option>
                        {transferCurrentResident && (
                          <option value="unassigned">-- Unassigned / Available (Release Flat) --</option>
                        )}
                        {users
                          .filter((u) => u.id !== transferCurrentResident?.id)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label>
                        <span>Full Name</span>
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
