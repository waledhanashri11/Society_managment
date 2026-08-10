import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, LogOut, Pencil, Plus, RefreshCw, Users, Warehouse, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUser, logout } from '../utils/auth';
import { superAdminAPI } from '../services/api';
import './superAdmin.css';
import './deleteSociety.css';

const emptySociety = { name: '', code: '', registrationNumber: '', address: '', city: '', state: '', pincode: '', contactEmail: '', contactPhone: '', logoUrl: '' };
const emptyAdmin = { name: '', email: '', phone: '', password: '' };

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [society, setSociety] = useState(emptySociety);
  const [admin, setAdmin] = useState(emptyAdmin);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [dashboard, list] = await Promise.all([superAdminAPI.getDashboard(), superAdminAPI.getSocieties()]);
      setSummary(dashboard.data); setSocieties(list.data || []);
    } catch (err) { setError(err.response?.data?.message || 'Unable to load platform data.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setSociety(emptySociety); setAdmin(emptyAdmin); setModal('create'); };
  const openEdit = async (item) => {
    setError('');
    try {
      const { data } = await superAdminAPI.getSociety(item.id);
      setSociety({ ...emptySociety, id: data.id, name: data.name || '', code: data.code || '', registrationNumber: data.registration_number || '', address: data.address || '', city: data.city || '', state: data.state || '', pincode: data.pincode || '', contactEmail: data.contact_email || '', contactPhone: data.contact_phone || '', logoUrl: data.logo_url || '' });
      setAdmin({ name: data.admin_name || '', email: data.admin_email || '', phone: data.admin_phone || '', password: '' });
      setModal('edit');
    } catch (err) { setError(err.response?.data?.message || 'Unable to load society details.'); }
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (modal === 'create') await superAdminAPI.createSociety({ ...society, admin });
      else { await superAdminAPI.updateSociety(society.id, society); await superAdminAPI.updateAdministrator(society.id, admin); }
      setModal(null); await load();
    } catch (err) { setError(err.response?.data?.message || 'Unable to save society.'); }
    finally { setSaving(false); }
  };
  const toggleStatus = async (item) => {
    try { await superAdminAPI.setSocietyStatus(item.id, item.status === 'active' ? 'inactive' : 'active'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to update society status.'); }
  };
  const deleteSociety = async (item) => {
    const confirmation = window.prompt(`Type ${item.code} to permanently delete ${item.name}.`);
    if (confirmation !== item.code) return;
    try { await superAdminAPI.deleteSociety(item.id); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to delete society.'); }
  };
  const updateSociety = (event) => setSociety((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateAdmin = (event) => setAdmin((current) => ({ ...current, [event.target.name]: event.target.value }));
  const metrics = [
    ['Societies', summary?.total_societies, Building2, 'blue'], ['Active', summary?.active_societies, CheckCircle2, 'green'],
    ['Residents', summary?.total_residents, Users, 'purple'], ['Flats', summary?.total_flats, Warehouse, 'orange']
  ];

  return <main className="super-admin-shell">
    <header className="super-admin-header"><div><span className="super-admin-kicker">SocietyHub</span><h1>Super Admin Portal</h1><p>Manage societies and monitor platform growth.</p></div><div className="super-admin-actions"><button onClick={load} disabled={loading} className="super-admin-icon"><RefreshCw size={17} /></button><button className="super-admin-logout" onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} /> Log out</button></div></header>
    {error && <div className="super-admin-alert">{error}</div>}
    <section className="super-admin-metrics">{metrics.map(([label, value, Icon, color]) => <article key={label} className="super-admin-metric"><span className={`super-admin-metric-icon ${color}`}><Icon size={20} /></span><strong>{loading ? '—' : value ?? 0}</strong><small>{label}</small></article>)}</section>
    <section className="super-admin-panel"><div className="super-admin-panel-head"><div><h2>Societies</h2><p>{societies.length} tenant{societies.length === 1 ? '' : 's'} on the platform</p></div><button className="super-admin-primary" onClick={openCreate}><Plus size={17} /> Add society</button></div>
      {loading ? <div className="super-admin-empty">Loading societies…</div> : societies.length === 0 ? <div className="super-admin-empty">No societies have been created yet.</div> : <div className="super-admin-table-wrap"><table className="super-admin-table"><thead><tr><th>Society</th><th>Status</th><th>Administrator</th><th>Residents</th><th>Flats</th><th /></tr></thead><tbody>{societies.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.code}{item.city ? ` · ${item.city}` : ''}</small></td><td><button className={`super-admin-status ${item.status}`} onClick={() => toggleStatus(item)}>{item.status}</button></td><td>{item.admin_name || 'Not assigned'}<small>{item.admin_email || ''}</small></td><td>{item.resident_count || 0}</td><td>{item.flat_count || 0}</td><td><div className="super-admin-row-actions"><button className="super-admin-edit" onClick={() => openEdit(item)}><Pencil size={15} /> Manage</button><button className="super-admin-delete" onClick={() => deleteSociety(item)}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>
    {modal && <div className="super-admin-modal-backdrop" role="presentation"><form className="super-admin-modal" onSubmit={save}><div className="super-admin-modal-head"><div><h2>{modal === 'create' ? 'Create society' : 'Manage society'}</h2><p>{modal === 'create' ? 'Create a tenant and its first administrator.' : `Tenant #${society.id}`}</p></div><button type="button" onClick={() => setModal(null)}><X size={19} /></button></div><div className="super-admin-form-section"><h3>Society profile</h3><div className="super-admin-fields"><Field label="Society name" name="name" value={society.name} onChange={updateSociety} required /><Field label="Society code" name="code" value={society.code} onChange={updateSociety} required maxLength="24" /><Field label="Registration number" name="registrationNumber" value={society.registrationNumber} onChange={updateSociety} /><Field label="Contact email" name="contactEmail" type="email" value={society.contactEmail} onChange={updateSociety} /><Field label="Contact phone" name="contactPhone" value={society.contactPhone} onChange={updateSociety} /><Field label="Address" name="address" value={society.address} onChange={updateSociety} /><Field label="City" name="city" value={society.city} onChange={updateSociety} /><Field label="State" name="state" value={society.state} onChange={updateSociety} /><Field label="Pincode" name="pincode" value={society.pincode} onChange={updateSociety} /></div></div><div className="super-admin-form-section"><h3>Society administrator</h3><div className="super-admin-fields"><Field label="Admin name" name="name" value={admin.name} onChange={updateAdmin} required /><Field label="Admin email" name="email" type="email" value={admin.email} onChange={updateAdmin} required /><Field label="Admin phone" name="phone" value={admin.phone} onChange={updateAdmin} /><Field label={modal === 'create' ? 'Initial password' : 'New password (optional)'} name="password" type="password" value={admin.password} onChange={updateAdmin} required={modal === 'create'} minLength={modal === 'create' ? '10' : undefined} /></div></div><div className="super-admin-modal-actions"><button type="button" className="super-admin-secondary" onClick={() => setModal(null)}>Cancel</button><button className="super-admin-primary" disabled={saving}>{saving ? 'Saving…' : modal === 'create' ? 'Create society' : 'Save changes'}</button></div></form></div>}
  </main>;
};

const Field = ({ label, ...props }) => <label className="super-admin-field"><span>{label}</span><input {...props} /></label>;
export default SuperAdmin;
