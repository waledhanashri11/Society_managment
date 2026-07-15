import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileCheck2, Plus, Send, XCircle } from 'lucide-react';
import { nocAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const badgeClass = (status) => `portal-status ${String(status || '').toLowerCase().replace(/\s+/g, '-')}`;
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const ResidentNOCRequests = () => {
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ noc_type: '', purpose: '', remarks: '', documents: [] });

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [requestRes, typeRes] = await Promise.all([nocAPI.getAll(), nocAPI.getTypes()]);
      setRequests(unwrap(requestRes));
      const typeList = unwrap(typeRes);
      setTypes(typeList);
      setForm((current) => ({ ...current, noc_type: current.noc_type || typeList[0]?.name || '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load NOC requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => ({
    pending: requests.filter((item) => ['Pending', 'Under Review'].includes(item.status)).length,
    approved: requests.filter((item) => item.status === 'Approved').length,
    rejected: requests.filter((item) => item.status === 'Rejected').length,
    total: requests.length
  }), [requests]);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const encoded = await Promise.all(files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, data: reader.result });
      reader.readAsDataURL(file);
    })));
    setForm((current) => ({ ...current, documents: encoded }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.noc_type || !form.purpose.trim()) return notify('NOC type and purpose are required');
    setSaving(true);
    try {
      await nocAPI.createRequest(form);
      setShowForm(false);
      setForm({ noc_type: types[0]?.name || '', purpose: '', remarks: '', documents: [] });
      notify('NOC request submitted');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not submit NOC request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {toast && <div className="portal-toast">{toast}</div>}
      <div className="portal-page-title">
        <div><h1>NOC Requests</h1><p>Submit and track your No Objection Certificate requests.</p></div>
        <button className="portal-primary-button" onClick={() => setShowForm(true)}><Plus size={16} /> New Request</button>
      </div>

      {error && <div className="portal-error">{error}</div>}

      {loading ? <CardSkeleton count={4} /> : (
        <div className="portal-kpis">
          <article className="portal-kpi"><span>Total Requests</span><strong>{summary.total}</strong><small>All submitted requests</small><div className="portal-kpi-icon"><FileCheck2 size={16} /></div></article>
          <article className="portal-kpi"><span>Pending Requests</span><strong>{summary.pending}</strong><small>Pending or under review</small><div className="portal-kpi-icon"><FileCheck2 size={16} /></div></article>
          <article className="portal-kpi green"><span>Approved NOCs</span><strong>{summary.approved}</strong><small>Sent via WhatsApp</small><div className="portal-kpi-icon"><FileCheck2 size={16} /></div></article>
          <article className="portal-kpi red"><span>Rejected Requests</span><strong>{summary.rejected}</strong><small>Requires correction</small><div className="portal-kpi-icon"><XCircle size={16} /></div></article>
        </div>
      )}

      {requests.some(item => item.status === 'Approved') && (
        <div className="portal-success-card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#166534', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px' }}>
            <span>✅</span>
            <span>Your NOC has been approved.</span>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#14532d', lineHeight: '1.5' }}>
            The official certificate will be sent to your registered WhatsApp number by the society administrator.
          </p>
        </div>
      )}

      <section className="portal-panel">
        <div className="portal-panel-head"><div><h2>My NOC Requests</h2><p>Only your own requests are shown here.</p></div></div>
        {loading ? <TableSkeleton rows={6} columns={7} /> : (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead><tr><th>NOC No.</th><th>Type</th><th>Purpose</th><th>Status</th><th>Requested</th><th>Decision</th><th>Action</th></tr></thead>
              <tbody>
                {!requests.length ? (
                  <tr><td colSpan="7" className="portal-empty">No NOC requests found.</td></tr>
                ) : requests.map((item) => (
                  <tr key={item.id}>
                    <td>{item.request_number}</td>
                    <td>{item.noc_type}</td>
                    <td>{item.purpose}</td>
                    <td><span className={badgeClass(item.status)}>{item.status}</span></td>
                    <td>{fullDate(item.requested_at)}</td>
                    <td>{item.status === 'Rejected' ? item.rejected_reason || '-' : item.status === 'Approved' ? fullDate(item.approved_at) : '-'}</td>
                    <td>{item.status === 'Approved' ? <span style={{ color: '#166534', fontWeight: '600', fontSize: '12.5px' }}>Approved (Sent via WhatsApp)</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="portal-modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="portal-modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
            <div className="portal-modal-head"><h2>New NOC Request</h2><button type="button" onClick={() => setShowForm(false)}><XCircle size={18} /></button></div>
            <label><span>NOC Type</span><select value={form.noc_type} onChange={(e) => setForm({ ...form, noc_type: e.target.value })} required>{types.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}</select></label>
            <label><span>Purpose</span><textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} rows="4" required /></label>
            <label><span>Remarks</span><textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows="3" /></label>
            <label><span>Required Documents</span><input type="file" multiple onChange={handleFiles} /></label>
            {form.documents.length > 0 && <div className="portal-muted">{form.documents.length} document(s) attached.</div>}
            <button className="portal-primary-button" disabled={saving}><Send size={16} /> {saving ? 'Submitting...' : 'Submit Request'}</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ResidentNOCRequests;
