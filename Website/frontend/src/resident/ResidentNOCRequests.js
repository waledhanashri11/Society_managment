import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileCheck2, Plus, RefreshCw, Search, Send, XCircle } from 'lucide-react';
import { nocAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const statuses = ['All', 'Pending', 'Approved', 'Rejected'];
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const statusClass = (status) => String(status || 'Pending').toLowerCase().replace(/\s+/g, '_');

const ResidentNOCRequests = () => {
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [filters, setFilters] = useState({ status: 'All', search: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
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

  useEffect(() => {
    load();
    return () => {
      if (preview?.url) window.URL.revokeObjectURL(preview.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRequests = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return requests.filter((item) => {
      const statusMatch = filters.status === 'All' || item.status === filters.status;
      const searchMatch = !search
        || String(item.request_number || '').toLowerCase().includes(search)
        || String(item.noc_type || '').toLowerCase().includes(search);
      return statusMatch && searchMatch;
    });
  }, [requests, filters]);

  const summary = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => ['Pending', 'Under Review'].includes(item.status)).length,
    approved: requests.filter((item) => item.status === 'Approved').length,
    rejected: requests.filter((item) => item.status === 'Rejected').length
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

  const openPreview = async (request) => {
    if (request.status !== 'Approved') return notify('Certificate is available only after approval');
    setPreviewLoading(true);
    try {
      const response = await nocAPI.getPdf(request.id);
      if (preview?.url) window.URL.revokeObjectURL(preview.url);
      const url = window.URL.createObjectURL(response.data);
      setPreview({ request, url });
    } catch (err) {
      notify(err.response?.data?.message || 'Could not open certificate');
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadPdf = async (request) => {
    if (request.status !== 'Approved') return notify('Download is available only after approval');
    try {
      const response = await nocAPI.getPdf(request.id);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${request.request_number || 'NOC-Certificate'}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      notify(err.response?.data?.message || 'PDF download failed');
    }
  };

  const summaryCards = [
    { label: 'Total Requests', value: summary.total, note: 'All submitted NOCs', icon: FileCheck2, tone: '' },
    { label: 'Pending Requests', value: summary.pending, note: 'Pending or under review', icon: RefreshCw, tone: 'orange' },
    { label: 'Approved NOCs', value: summary.approved, note: 'Certificates ready', icon: FileCheck2, tone: 'green' },
    { label: 'Rejected NOCs', value: summary.rejected, note: 'Needs follow-up', icon: XCircle, tone: 'red' }
  ];

  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}

      <div className="portal-page-title">
        <div>
          <h1>My NOCs</h1>
          <p>View your NOC requests, approval status, and approved certificates.</p>
        </div>
        <button className="portal-primary-btn" type="button" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Apply for NOC
        </button>
      </div>

      {error && <div className="portal-error">{error}</div>}

      {loading ? (
        <>
          <CardSkeleton count={4} />
          <section className="portal-panel portal-table-card" style={{ marginTop: 14 }}>
            <TableSkeleton rows={5} columns={7} />
          </section>
        </>
      ) : (
        <>
          <div className="portal-kpis">
            {summaryCards.map(({ label, value, note, tone, icon: Icon }) => (
              <article key={label} className={`portal-kpi ${tone}`}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </div>
                <div className="portal-kpi-icon">
                  <Icon size={16} />
                </div>
              </article>
            ))}
          </div>

          <section className="portal-panel" style={{ marginBottom: 16 }}>
            <div className="portal-form-grid" style={{ gridTemplateColumns: 'minmax(150px, .45fr) minmax(220px, 1fr) auto' }}>
              <label>
                Status
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                >
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                Search
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Search by NOC number or type"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </label>
              <button type="button" onClick={load} className="portal-light-btn">
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </section>

          <section className="portal-panel portal-table-card">
            <div className="portal-panel-head">
              <div>
                <h2>My NOC Requests</h2>
                <p>Residents can only view their own records.</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{filteredRequests.length} shown</span>
            </div>

            <div className="portal-table-wrap">
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>NOC Number</th>
                    <th>NOC Type</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Requested Date</th>
                    <th>Approved Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredRequests.length ? (
                    <tr>
                      <td colSpan="7">
                        <div className="portal-empty">
                          <FileCheck2 size={26} /><br />
                          No NOC requests found.<br />
                          <button type="button" onClick={() => setShowForm(true)} className="portal-primary-btn" style={{ marginTop: 10 }}>Apply for NOC</button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRequests.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.request_number}</strong></td>
                      <td>{item.noc_type}</td>
                      <td className="portal-truncate" title={item.purpose}>{item.purpose}</td>
                      <td>
                        <span className={`portal-status ${statusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{fullDate(item.requested_at)}</td>
                      <td>{item.status === 'Approved' ? fullDate(item.approved_at) : '—'}</td>
                      <td>
                        <div className="portal-row-actions">
                          <button
                            type="button"
                            disabled={item.status !== 'Approved' || previewLoading}
                            onClick={() => openPreview(item)}
                            style={{ opacity: item.status !== 'Approved' ? 0.45 : 1, cursor: item.status !== 'Approved' ? 'not-allowed' : 'pointer' }}
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            disabled={item.status !== 'Approved'}
                            onClick={() => downloadPdf(item)}
                            style={{ opacity: item.status !== 'Approved' ? 0.45 : 1, cursor: item.status !== 'Approved' ? 'not-allowed' : 'pointer' }}
                          >
                            <Download size={12} /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {preview && (
        <div className="portal-modal-backdrop" onMouseDown={() => setPreview(null)}>
          <div className="portal-modal" style={{ width: 'min(960px, 95vw)' }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{preview.request.request_number}</h3>
                <p>Certificate preview</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="portal-primary-btn"
                  onClick={() => downloadPdf(preview.request)}
                >
                  <Download size={14} /> Download
                </button>
                <button type="button" onClick={() => setPreview(null)}>×</button>
              </div>
            </div>
            <div style={{ height: '70vh', background: 'white' }}>
              <iframe title="NOC certificate preview" src={preview.url} className="h-full w-full border-0" />
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowForm(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Apply for NOC</h3>
                <p>Submit details for society review.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form className="portal-form" onSubmit={submit}>
              <label className="portal-field-full">
                NOC Type
                <select
                  value={form.noc_type}
                  onChange={(event) => setForm({ ...form, noc_type: event.target.value })}
                  required
                >
                  {types.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
                </select>
              </label>
              <label className="portal-field-full">
                Purpose
                <textarea
                  value={form.purpose}
                  onChange={(event) => setForm({ ...form, purpose: event.target.value })}
                  rows="4"
                  required
                />
              </label>
              <label className="portal-field-full">
                Remarks
                <textarea
                  value={form.remarks}
                  onChange={(event) => setForm({ ...form, remarks: event.target.value })}
                  rows="3"
                />
              </label>
              <label className="portal-field-full">
                Required Documents
                <input
                  type="file"
                  multiple
                  onChange={handleFiles}
                  style={{ border: '1px dashed var(--portal-line)', padding: 12 }}
                />
              </label>
              {form.documents.length > 0 && (
                <div className="portal-field-full" style={{ padding: '8px 12px', background: '#ecfdf5', color: '#047857', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                  {form.documents.length} document(s) attached.
                </div>
              )}
              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="portal-primary-btn" disabled={saving}>
                  <Send size={14} /> {saving ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentNOCRequests;
