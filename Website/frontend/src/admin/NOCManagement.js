import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Download, Eye, FileCheck2, Plus, RefreshCw, Search, XCircle
} from 'lucide-react';
import { nocAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const statuses = ['All', 'Pending', 'Under Review', 'Approved', 'Rejected'];
const badgeClass = (status) => `portal-status ${String(status || '').toLowerCase().replace(/\s+/g, '-')}`;
const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const parseDocuments = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    return [{ name: value }];
  }
};

const NOCManagement = () => {
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [filters, setFilters] = useState({ status: 'All', search: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showType, setShowType] = useState(false);
  const [newType, setNewType] = useState({ name: '', description: '' });
  const [page, setPage] = useState(1);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [requestRes, typeRes] = await Promise.all([
        nocAPI.getAll({ params: { status: filters.status, search: filters.search } }),
        nocAPI.getTypes()
      ]);
      setRequests(unwrap(requestRes));
      setTypes(unwrap(typeRes));
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load NOC requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === 'Pending').length,
    approved: requests.filter((item) => item.status === 'Approved').length,
    rejected: requests.filter((item) => item.status === 'Rejected').length
  }), [requests]);
  const totalPages = Math.max(1, Math.ceil(requests.length / 8));
  const pagedRequests = requests.slice((page - 1) * 8, page * 8);

  const openDetails = async (request) => {
    try {
      const { data } = await nocAPI.getById(request.id);
      setSelected(data);
    } catch (err) {
      notify(err.response?.data?.message || 'Could not load request details');
    }
  };

  const handleAction = async (action, request, payload = {}) => {
    setSaving(true);
    try {
      if (action === 'review') await nocAPI.markReview(request.id, payload);
      if (action === 'approve') await nocAPI.approve(request.id, payload);
      if (action === 'reject') await nocAPI.reject(request.id, payload);
      notify(action === 'approve' ? 'NOC approved successfully' : action === 'reject' ? 'NOC rejected successfully' : 'NOC marked under review');
      setRejecting(null);
      setRejectReason('');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (request) => {
    try {
      const response = await nocAPI.getPdf(request.id);
      const url = window.URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      notify(err.response?.data?.message || 'PDF is not available yet');
    }
  };

  const downloadFile = async (request) => {
    try {
      const response = await nocAPI.getPdf(request.id);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${request.request_number}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      notify(err.response?.data?.message || 'PDF download failed');
    }
  };

  const handleSendWhatsApp = async (request) => {
    try {
      const response = await nocAPI.generateShareLink(request.id);
      const shareUrl = response.data?.data?.shareUrl || response.data?.shareUrl;

      const residentName = request.resident_name;
      const nocNumber = request.request_number;
      const flatNumber = `Flat ${request.flat_no || ''}${request.wing ? `, Wing ${request.wing}` : ''}`;
      const issueDate = fullDate(request.approved_at);
      
      let societyName = 'Society Management System';
      try {
        const settings = JSON.parse(localStorage.getItem('adminSettings'));
        if (settings && settings.societyName) {
          societyName = settings.societyName;
        }
      } catch (e) {}

      const messageText = `Dear ${residentName},\n\nYour No Objection Certificate has been approved.\n\nNOC Number: ${nocNumber}\nFlat Number: ${flatNumber}\nIssue Date: ${issueDate}\n\nDownload your certificate:\n${shareUrl}\n\nRegards,\n${societyName}`;

      const encodedText = encodeURIComponent(messageText);

      let phone = request.resident_phone || '';
      phone = phone.replace(/\D/g, '');
      if (phone.length === 10) {
        phone = `91${phone}`;
      }

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      notify(err.response?.data?.message || 'Could not generate WhatsApp share link');
    }
  };

  const createType = async (event) => {
    event.preventDefault();
    if (!newType.name.trim()) return notify('NOC type name is required');
    setSaving(true);
    try {
      await nocAPI.createType(newType);
      setNewType({ name: '', description: '' });
      setShowType(false);
      notify('NOC type created');
      const typeRes = await nocAPI.getTypes({}, { force: true });
      setTypes(unwrap(typeRes));
    } catch (err) {
      notify(err.response?.data?.message || 'Could not create NOC type');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {toast && <div className="portal-toast">{toast}</div>}
      <div className="portal-page-title">
        <div><h1>NOC Management</h1><p>Review, approve, reject, and download resident NOC certificates.</p></div>
        <button className="portal-primary-button" onClick={() => setShowType(true)}><Plus size={16} /> Add NOC Type</button>
      </div>

      {error && <div className="portal-error">{error}</div>}

      {loading ? <CardSkeleton count={4} /> : (
        <div className="portal-kpis">
          <article className="portal-kpi"><span>Total Requests</span><strong>{summary.total}</strong><small>All NOC applications</small><div className="portal-kpi-icon"><FileCheck2 size={16} /></div></article>
          <article className="portal-kpi"><span>Pending NOCs</span><strong>{summary.pending}</strong><small>Awaiting admin action</small><div className="portal-kpi-icon"><RefreshCw size={16} /></div></article>
          <article className="portal-kpi green"><span>Approved NOCs</span><strong>{summary.approved}</strong><small>Ready for download</small><div className="portal-kpi-icon"><CheckCircle2 size={16} /></div></article>
          <article className="portal-kpi red"><span>Rejected NOCs</span><strong>{summary.rejected}</strong><small>Rejected requests</small><div className="portal-kpi-icon"><XCircle size={16} /></div></article>
        </div>
      )}

      <section className="portal-panel" style={{ marginBottom: 16 }}>
        <div className="portal-form-grid">
          <label><span>Status</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label><span>Search</span><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Resident, flat, type, NOC number" /></label>
          <button className="portal-primary-button" onClick={load}><Search size={16} /> Apply Filters</button>
        </div>
      </section>

      <section className="portal-panel">
        <div className="portal-panel-head"><div><h2>NOC Requests</h2><p>Complete approval workflow with audit history.</p></div></div>
        {loading ? <TableSkeleton rows={6} columns={8} /> : (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead><tr><th>NOC No.</th><th>Resident</th><th>Flat</th><th>Type</th><th>Purpose</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
              <tbody>
                {!requests.length ? (
                  <tr><td colSpan="8" className="portal-empty">No NOC requests found.</td></tr>
                ) : pagedRequests.map((item) => (
                  <tr key={item.id}>
                    <td>{item.request_number}</td>
                    <td>{item.resident_name}</td>
                    <td>{item.flat_no || '-'} {item.wing ? `(${item.wing})` : ''}</td>
                    <td>{item.noc_type}</td>
                    <td>{item.purpose}</td>
                    <td><span className={badgeClass(item.status)}>{item.status}</span></td>
                    <td>{fullDate(item.requested_at)}</td>
                    <td>
                      <div className="portal-row-actions">
                        <button title="View" onClick={() => openDetails(item)}><Eye size={15} /></button>
                        {item.status === 'Pending' && <button title="Mark under review" onClick={() => handleAction('review', item)}><RefreshCw size={15} /></button>}
                        {['Pending', 'Under Review'].includes(item.status) && <button title="Approve" onClick={() => handleAction('approve', item)}><CheckCircle2 size={15} /></button>}
                        {item.status !== 'Approved' && <button title="Reject" onClick={() => setRejecting(item)}><XCircle size={15} /></button>}
                        {item.status === 'Approved' && (
                          <>
                            <button title="Download PDF" onClick={() => downloadPdf(item)}><Download size={15} /></button>
                            <button title="Send via WhatsApp" onClick={() => handleSendWhatsApp(item)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
                              <span style={{ fontSize: '15px' }} role="img" aria-label="whatsapp">📱</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && requests.length > 8 && (
          <div className="portal-pagination">
            <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        )}
      </section>

      {selected && (
        <div className="portal-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="portal-modal-head"><h2>{selected.request_number}</h2><button onClick={() => setSelected(null)}><XCircle size={18} /></button></div>
            <div className="portal-detail-grid">
              <span>Resident</span><strong>{selected.resident_name}</strong>
              <span>Flat</span><strong>{selected.flat_no || '-'} Wing {selected.wing || '-'}</strong>
              <span>NOC Type</span><strong>{selected.noc_type}</strong>
              <span>Status</span><strong>{selected.status}</strong>
              <span>Purpose</span><strong>{selected.purpose}</strong>
              <span>Remarks</span><strong>{selected.remarks || '-'}</strong>
              <span>Rejected Reason</span><strong>{selected.rejected_reason || '-'}</strong>
            </div>
            {selected.status === 'Approved' && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  className="portal-primary-button"
                  onClick={() => downloadPdf(selected)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 12px' }}
                >
                  <Eye size={14} /> View Certificate
                </button>
                <button
                  type="button"
                  className="portal-primary-button"
                  onClick={() => downloadFile(selected)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 12px' }}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button
                  type="button"
                  className="portal-primary-button"
                  onClick={() => handleSendWhatsApp(selected)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 12px', backgroundColor: '#25D366', borderColor: '#25D366' }}
                >
                  📱 Send via WhatsApp
                </button>
              </div>
            )}
            <h3>Documents</h3>
            <div className="portal-feed" style={{ padding: '0 20px 12px' }}>
              {parseDocuments(selected.documents).length ? parseDocuments(selected.documents).map((doc, index) => (
                <div className="portal-feed-item" key={`${doc.name || 'document'}-${index}`}>
                  <span className="portal-feed-icon"><FileCheck2 size={14} /></span>
                  <div className="portal-feed-main"><strong>{doc.name || `Document ${index + 1}`}</strong><span>{doc.type || 'Uploaded document'}</span></div>
                  {doc.data && <button className="portal-link-button" onClick={() => window.open(doc.data, '_blank', 'noopener,noreferrer')}>View</button>}
                </div>
              )) : <div className="portal-empty">No documents attached.</div>}
            </div>
            <h3>Approval History</h3>
            <div className="portal-feed">
              {(selected.history || []).length ? selected.history.map((item) => (
                <div className="portal-feed-item" key={item.id}>
                  <span className="portal-feed-icon"><FileCheck2 size={14} /></span>
                  <div className="portal-feed-main"><strong>{item.action}</strong><span>{item.remarks || item.actor_name || 'System update'}</span></div>
                  <span className="portal-feed-time">{fullDate(item.created_at)}</span>
                </div>
              )) : <div className="portal-empty">No history yet.</div>}
            </div>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="portal-modal-backdrop" onClick={() => setRejecting(null)}>
          <form className="portal-modal" onSubmit={(e) => { e.preventDefault(); handleAction('reject', rejecting, { rejected_reason: rejectReason }); }} onClick={(e) => e.stopPropagation()}>
            <div className="portal-modal-head"><h2>Reject NOC</h2><button type="button" onClick={() => setRejecting(null)}><XCircle size={18} /></button></div>
            <label><span>Reason</span><textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required rows="4" /></label>
            <button className="portal-primary-button danger" disabled={saving}>{saving ? 'Saving...' : 'Reject Request'}</button>
          </form>
        </div>
      )}

      {showType && (
        <div className="portal-modal-backdrop" onClick={() => setShowType(false)}>
          <form className="portal-modal" onSubmit={createType} onClick={(e) => e.stopPropagation()}>
            <div className="portal-modal-head"><h2>Add NOC Type</h2><button type="button" onClick={() => setShowType(false)}><XCircle size={18} /></button></div>
            <label><span>Name</span><input value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} list="noc-types" required /></label>
            <datalist id="noc-types">{types.map((type) => <option key={type.id} value={type.name} />)}</datalist>
            <label><span>Description</span><textarea value={newType.description} onChange={(e) => setNewType({ ...newType, description: e.target.value })} rows="3" /></label>
            <button className="portal-primary-button" disabled={saving}>{saving ? 'Saving...' : 'Create Type'}</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default NOCManagement;
