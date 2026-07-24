/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileCheck2, Plus, Printer, RefreshCw, Search, Send, Upload, XCircle } from 'lucide-react';
import { nocAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const statuses = ['All', 'Submitted', 'Under Review', 'Additional Information Required', 'Approved', 'Rejected', 'Completed'];
const defaultNocTypes = [
  'Property Sale',
  'Rental',
  'Bank Loan',
  'Renovation',
  'Parking',
  'Water Connection',
  'Electricity Connection',
  'General NOC'
];

const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fullDateTime = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const parseDocuments = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    return [{ name: value }];
  }
};

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'Submitted':
      return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }; // Blue
    case 'Under Review':
      return { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }; // Orange
    case 'Additional Information Required':
      return { background: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }; // Purple
    case 'Approved':
      return { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }; // Green
    case 'Rejected':
      return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }; // Red
    case 'Completed':
      return { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }; // Gray
    default:
      return { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  }
};

const ResidentNOCRequests = () => {
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [filters, setFilters] = useState({ status: 'All', search: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [uploadModal, setUploadModal] = useState(null);
  const [uploadDocs, setUploadDocs] = useState([]);
  const [uploadRemarks, setUploadRemarks] = useState('');

  const [form, setForm] = useState({
    noc_type: 'Property Sale',
    purpose: '',
    remarks: '',
    required_date: '',
    contact_number: '',
    documents: []
  });

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [requestRes, typeRes] = await Promise.all([nocAPI.getAll(), nocAPI.getTypes()]);
      setRequests(unwrap(requestRes));
      const typeList = unwrap(typeRes);
      setTypes(typeList.length ? typeList : defaultNocTypes.map((t, i) => ({ id: i, name: t })));
      if (typeList.length) {
        setForm((current) => ({ ...current, noc_type: current.noc_type || typeList[0]?.name }));
      }
    } catch (err) {
      setError('Could not load NOC requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
    pending: requests.filter((item) => ['Submitted', 'Pending', 'Under Review'].includes(item.status)).length,
    additional_info: requests.filter((item) => item.status === 'Additional Information Required').length,
    approved: requests.filter((item) => ['Approved', 'Completed'].includes(item.status)).length,
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

  const handleAdditionalFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const encoded = await Promise.all(files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, data: reader.result });
      reader.readAsDataURL(file);
    })));
    setUploadDocs(encoded);
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!form.noc_type || !form.purpose.trim()) return notify('NOC type and purpose are required');
    setSaving(true);
    try {
      await nocAPI.createRequest(form);
      setShowForm(false);
      setForm({ noc_type: types[0]?.name || 'Property Sale', purpose: '', remarks: '', required_date: '', contact_number: '', documents: [] });
      notify('NOC request submitted successfully!');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not submit NOC request');
    } finally {
      setSaving(false);
    }
  };

  const submitAdditionalDocs = async (e) => {
    e.preventDefault();
    if (!uploadDocs.length) return notify('Please select at least one document');
    setSaving(true);
    try {
      await nocAPI.uploadInfo(uploadModal.id, { documents: uploadDocs, remarks: uploadRemarks });
      notify('Additional documents uploaded successfully!');
      setUploadModal(null);
      setUploadDocs([]);
      setUploadRemarks('');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to upload additional documents');
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (reqItem) => {
    try {
      const { data } = await nocAPI.getById(reqItem.id);
      setSelected(data);
    } catch (err) {
      notify('Could not load request details');
    }
  };

  const downloadPdf = async (request) => {
    if (!['Approved', 'Completed'].includes(request.status)) {
      return notify('Certificate is available only after approval');
    }
    try {
      const response = await nocAPI.getPdf(request.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/html' }));
      const printWin = window.open(url, '_blank');
      if (!printWin) {
        notify('Pop-up blocked. Please allow pop-ups to print NOC.');
      }
    } catch (err) {
      notify(err.response?.data?.message || 'PDF download failed');
    }
  };

  return (
    <div className="portal-module">
      {toast && <div className="portal-toast">{toast}</div>}

      <div className="portal-page-title">
        <div>
          <h1>My NOC Applications</h1>
          <p>Apply for society No Objection Certificates and track your application status.</p>
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
            <div className="portal-kpi">
              <span>Total Requests</span>
              <strong>{summary.total}</strong>
              <small>All NOC applications</small>
            </div>
            <div className="portal-kpi orange">
              <span>Pending / Under Review</span>
              <strong>{summary.pending}</strong>
              <small>Processing by committee</small>
            </div>
            <div className="portal-kpi" style={{ borderLeft: '4px solid #a855f7' }}>
              <span>Action Required</span>
              <strong style={{ color: '#7e22ce' }}>{summary.additional_info}</strong>
              <small>Additional documents requested</small>
            </div>
            <div className="portal-kpi green">
              <span>Approved</span>
              <strong>{summary.approved}</strong>
              <small>Ready to download</small>
            </div>
          </div>

          <section className="portal-panel" style={{ marginBottom: 16 }}>
            <div className="portal-form-grid" style={{ gridTemplateColumns: '180px 1fr auto' }}>
              <label>
                <span>Status Filter</span>
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                >
                  {statuses.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </label>
              <label>
                <span>Search</span>
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search by NOC number or type..."
                />
              </label>
              <button type="button" onClick={load} className="portal-light-btn">
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </section>

          <section className="portal-panel portal-table-card">
            <div className="portal-panel-head">
              <div>
                <h2>My NOC Records</h2>
                <p>Track your submitted applications and approval timeline.</p>
              </div>
              <span className="portal-muted-text" style={{ fontSize: '11px', fontWeight: 'bold' }}>{filteredRequests.length} records</span>
            </div>

            <div className="portal-table-wrap">
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>NOC NUMBER</th>
                    <th>NOC TYPE</th>
                    <th>PURPOSE</th>
                    <th>STATUS</th>
                    <th>REQUESTED DATE</th>
                    <th>APPROVED DATE</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredRequests.length ? (
                    <tr>
                      <td colSpan="7">
                        <div className="portal-empty">
                          <FileCheck2 size={28} /><br />
                          No NOC requests found.<br />
                          <button type="button" onClick={() => setShowForm(true)} className="portal-primary-btn" style={{ marginTop: 10 }}>Apply for NOC</button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRequests.map((item) => {
                    const badgeStyle = getStatusBadgeStyle(item.status);
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.request_number}</strong></td>
                        <td>{item.noc_type}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.purpose}>
                          {item.purpose}
                        </td>
                        <td>
                          <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', ...badgeStyle }}>
                            {item.status}
                          </span>
                        </td>
                        <td>{fullDate(item.requested_at)}</td>
                        <td>{item.status === 'Approved' ? fullDate(item.approved_at) : '—'}</td>
                        <td>
                          <div className="portal-row-actions" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="portal-light-btn" onClick={() => openDetails(item)}>
                              <Eye size={12} /> Details
                            </button>
                            {item.status === 'Additional Information Required' && (
                              <button type="button" className="portal-primary-btn" style={{ background: '#7e22ce', padding: '4px 8px', fontSize: '10px' }} onClick={() => setUploadModal(item)}>
                                <Upload size={12} /> Upload Docs
                              </button>
                            )}
                            {['Approved', 'Completed'].includes(item.status) && (
                              <button type="button" className="portal-primary-btn" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => downloadPdf(item)}>
                                <Printer size={12} /> Download PDF
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* DETAILS & TIMELINE MODAL */}
      {selected && (
        <div className="portal-modal-backdrop" onMouseDown={() => setSelected(null)}>
          <div className="portal-modal" style={{ maxWidth: '640px', maxHeight: '90vh' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{selected.request_number}</h3>
                <p>NOC Request Details & Activity Timeline</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}>×</button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div><strong>NOC Type:</strong> {selected.noc_type}</div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '800', ...getStatusBadgeStyle(selected.status) }}>
                    {selected.status}
                  </span>
                </div>
                <div><strong>Requested Date:</strong> {fullDate(selected.requested_at)}</div>
                <div><strong>Required Date:</strong> {fullDate(selected.required_date)}</div>
                <div><strong>Contact Number:</strong> {selected.contact_number || '-'}</div>
                <div><strong>Approved Date:</strong> {fullDate(selected.approved_at)}</div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '12px', color: '#475569' }}>Purpose:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px', background: '#fff', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  {selected.purpose}
                </p>
              </div>

              {selected.admin_remarks && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ fontSize: '12px', color: '#7e22ce' }}>Admin Remarks / Instructions:</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', background: '#faf5ff', color: '#6b21a8', padding: '10px', border: '1px solid #e9d5ff', borderRadius: '6px' }}>
                    {selected.admin_remarks}
                  </p>
                </div>
              )}

              {selected.rejected_reason && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ fontSize: '12px', color: '#b91c1c' }}>Rejection Reason:</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', background: '#fef2f2', color: '#991b1b', padding: '10px', border: '1px solid #fca5a5', borderRadius: '6px' }}>
                    {selected.rejected_reason}
                  </p>
                </div>
              )}

              {/* Uploaded Documents */}
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ fontSize: '12px', color: '#475569' }}>Uploaded Supporting Documents:</strong>
                <div style={{ display: 'grid', gap: '8px', marginTop: '6px' }}>
                  {parseDocuments(selected.documents).length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No documents attached.</div>
                  ) : (
                    parseDocuments(selected.documents).map((doc, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>📄 {doc.name || `Document ${idx + 1}`}</span>
                        {doc.data && (
                          <a href={doc.data} target="_blank" rel="noreferrer" className="portal-light-btn" style={{ fontSize: '10px', padding: '3px 8px' }}>
                            View Document
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', marginBottom: '12px' }}>Activity Timeline</strong>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {(selected.history || []).map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '12px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', marginTop: '4px', flexShrink: 0 }} />
                      <div>
                        <strong>{log.action}</strong>
                        {log.remarks && <p style={{ margin: '2px 0 0', color: '#475569' }}>{log.remarks}</p>}
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{fullDateTime(log.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="portal-form-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="portal-light-btn" onClick={() => setSelected(null)}>Close</button>
                {['Approved', 'Completed'].includes(selected.status) && (
                  <button type="button" className="portal-primary-btn" onClick={() => downloadPdf(selected)}>
                    <Printer size={14} /> Download Certificate PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPLY NOC FORM MODAL */}
      {showForm && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowForm(false)}>
          <div className="portal-modal" style={{ maxWidth: '520px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Apply for No Objection Certificate (NOC)</h3>
                <p>Fill out the application details for society approval.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form className="portal-form" onSubmit={submitRequest} style={{ padding: '20px' }}>
              <label className="portal-field-full">
                <span>NOC Type *</span>
                <select
                  value={form.noc_type}
                  onChange={(e) => setForm({ ...form, noc_type: e.target.value })}
                  required
                >
                  {defaultNocTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="portal-field-full">
                <span>Purpose *</span>
                <textarea
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  rows="3"
                  placeholder="State the exact purpose for requesting this NOC..."
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  <span>Required Date</span>
                  <input
                    type="date"
                    value={form.required_date}
                    onChange={(e) => setForm({ ...form, required_date: e.target.value })}
                  />
                </label>
                <label>
                  <span>Contact Number</span>
                  <input
                    type="text"
                    placeholder="Mobile number"
                    value={form.contact_number}
                    onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  />
                </label>
              </div>

              <label className="portal-field-full">
                <span>Supporting Documents (PDF / JPG / PNG)</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFiles}
                  style={{ border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '6px' }}
                />
              </label>
              {form.documents.length > 0 && (
                <div style={{ padding: '6px 12px', background: '#ecfdf5', color: '#047857', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                  {form.documents.length} document(s) attached.
                </div>
              )}

              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="portal-primary-btn" disabled={saving}>
                  <Send size={14} /> {saving ? 'Submitting...' : 'Submit NOC Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD ADDITIONAL DOCUMENTS MODAL */}
      {uploadModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setUploadModal(null)}>
          <div className="portal-modal" style={{ maxWidth: '480px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Upload Additional Documents</h3>
                <p>{uploadModal.request_number} · {uploadModal.noc_type}</p>
              </div>
              <button type="button" onClick={() => setUploadModal(null)}>×</button>
            </div>
            <form className="portal-form" onSubmit={submitAdditionalDocs} style={{ padding: '20px' }}>
              <div style={{ background: '#faf5ff', padding: '10px', borderRadius: '6px', border: '1px solid #e9d5ff', marginBottom: '14px', fontSize: '12px', color: '#6b21a8' }}>
                <strong>Admin Message:</strong> {uploadModal.admin_remarks || 'Please upload additional requested documents.'}
              </div>

              <label className="portal-field-full">
                <span>Select Files (PDF / JPG / PNG)</span>
                <input
                  type="file"
                  multiple
                  onChange={handleAdditionalFiles}
                  required
                  style={{ border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '6px' }}
                />
              </label>

              <label className="portal-field-full">
                <span>Remarks (Optional)</span>
                <textarea
                  rows="2"
                  placeholder="Notes for admin..."
                  value={uploadRemarks}
                  onChange={(e) => setUploadRemarks(e.target.value)}
                />
              </label>

              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setUploadModal(null)}>Cancel</button>
                <button className="portal-primary-btn" style={{ background: '#7e22ce' }} disabled={saving}>
                  {saving ? 'Uploading...' : 'Submit Additional Documents'}
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
