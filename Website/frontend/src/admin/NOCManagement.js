/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, Download, Eye, FileCheck2, FileText, HelpCircle,
  Plus, Printer, RefreshCw, Search, Share2, ShieldAlert, Trash2, XCircle
} from 'lucide-react';
import { nocAPI } from '../services/api';
import { TableSkeleton } from '../components/Skeletons';
import { useTranslation } from 'react-i18next';

const nocTypesList = [
  'Property Sale',
  'Rental',
  'Bank Loan',
  'Renovation',
  'Parking',
  'Water Connection',
  'Electricity Connection',
  'General NOC'
];

const statusesList = [
  'All',
  'Submitted',
  'Under Review',
  'Additional Information Required',
  'Approved',
  'Rejected',
  'Completed'
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

function NOCManagement() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

  // Filters
  const [filters, setFilters] = useState({
    status: 'All',
    noc_type: 'All',
    search: '',
    start_date: '',
    end_date: ''
  });

  // Dialog & Modal States
  const [selected, setSelected] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [requestingInfo, setRequestingInfo] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);

  const [approveForm, setApproveForm] = useState({ remarks: '', expiry_date: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [infoRemarks, setInfoRemarks] = useState('');
  const [reportsData, setReportsData] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, typeRes] = await Promise.all([
        nocAPI.getAll({ params: filters }),
        nocAPI.getTypes()
      ]);
      setRequests(reqRes.data || []);
      setTypes(typeRes.data || []);
    } catch (err) {
      console.error('Failed to load NOC requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const summary = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === 'Submitted' || r.status === 'Pending').length,
    under_review: requests.filter((r) => r.status === 'Under Review').length,
    additional_info: requests.filter((r) => r.status === 'Additional Information Required').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    rejected: requests.filter((r) => r.status === 'Rejected').length,
    completed: requests.filter((r) => r.status === 'Completed').length
  }), [requests]);

  const openDetails = async (reqItem) => {
    try {
      const { data } = await nocAPI.getById(reqItem.id);
      setSelected(data);
    } catch (err) {
      notify('Failed to load request details');
    }
  };

  const handleAction = async (actionType, id, payload = {}) => {
    setSaving(true);
    try {
      if (actionType === 'review') {
        await nocAPI.markReview(id, payload);
        notify('Marked Under Review');
      } else if (actionType === 'request-info') {
        await nocAPI.requestInfo(id, payload);
        notify('Requested Additional Information from resident');
        setRequestingInfo(null);
        setInfoRemarks('');
      } else if (actionType === 'approve') {
        await nocAPI.approve(id, payload);
        notify('NOC Approved & Certificate Generated!');
        setApproving(null);
        setApproveForm({ remarks: '', expiry_date: '' });
      } else if (actionType === 'reject') {
        await nocAPI.reject(id, payload);
        notify('NOC Request Rejected');
        setRejecting(null);
        setRejectReason('');
      } else if (actionType === 'complete') {
        await nocAPI.complete(id);
        notify('NOC Marked Completed');
      }
      setSelected(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (reqItem) => {
    try {
      const response = await nocAPI.getPdf(reqItem.id);
      let htmlText = '';
      if (response.data instanceof Blob) {
        htmlText = await response.data.text();
      } else {
        htmlText = String(response.data);
      }
      const printWin = window.open('', '_blank', 'width=900,height=750');
      if (!printWin) {
        return notify('Pop-up blocked. Please allow pop-ups to print NOC.');
      }
      printWin.document.write(htmlText);
      printWin.document.close();
    } catch (err) {
      notify('PDF is available after approval.');
    }
  };

  const loadReports = async () => {
    try {
      const { data } = await nocAPI.getReportsData();
      setReportsData(data);
      setShowReportsModal(true);
    } catch (err) {
      notify('Failed to load NOC reports');
    }
  };

  return (
    <div className="portal-module">
      {toast && <div className="portal-toast">{toast}</div>}

      {/* Page Title */}
      <div className="portal-page-title">
        <div>
          <h1>{t('noc.title')}</h1>
          <p>{t('noc.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="portal-light-btn" onClick={loadReports}>
            <FileText size={16} /> {t('noc.nocReports')}
          </button>
        </div>
      </div>

      {/* KPI Dashboard Cards */}
      <div className="portal-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="portal-kpi">
          <span>{t('noc.totalRequests')}</span>
          <strong>{summary.total}</strong>
          <small>{t('noc.allApplications')}</small>
        </div>
        <div className="portal-kpi" style={{ borderLeft: '4px solid #3b82f6' }}>
          <span>{t('noc.submitted')}</span>
          <strong style={{ color: '#1d4ed8' }}>{summary.pending}</strong>
          <small>{t('noc.awaitingInitialReview')}</small>
        </div>
        <div className="portal-kpi orange">
          <span>{t('noc.underReview')}</span>
          <strong>{summary.under_review}</strong>
          <small>{t('noc.beingProcessed')}</small>
        </div>
        <div className="portal-kpi" style={{ borderLeft: '4px solid #a855f7' }}>
          <span>{t('noc.moreInfoRequired')}</span>
          <strong style={{ color: '#7e22ce' }}>{summary.additional_info}</strong>
          <small>{t('noc.awaitingResidentResponse')}</small>
        </div>
        <div className="portal-kpi green">
          <span>{t('noc.approved')}</span>
          <strong>{summary.approved}</strong>
          <small>{t('noc.certificatesGenerated')}</small>
        </div>
        <div className="portal-kpi red">
          <span>{t('noc.rejected')}</span>
          <strong>{summary.rejected}</strong>
          <small>{t('noc.declinedApplications')}</small>
        </div>
      </div>

      {/* Filter Panel */}
      <section className="portal-panel" style={{ marginBottom: '16px' }}>
        <div className="portal-form-grid" style={{ gridTemplateColumns: '1fr 180px 180px 150px 150px' }}>
          <label>
            <span>{t('noc.search')}</span>
            <input
              type="text"
              placeholder={t('noc.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </label>

          <label>
            <span>{t('noc.statusFilter')}</span>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              {statusesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{t('noc.nocType')}</span>
            <select value={filters.noc_type} onChange={(e) => setFilters({ ...filters, noc_type: e.target.value })}>
              <option value="All">{t('noc.allTypes')}</option>
              {nocTypesList.map((tp) => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{t('noc.fromDate')}</span>
            <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
          </label>

          <label>
            <span>{t('noc.toDate')}</span>
            <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
          </label>
        </div>
      </section>

      {/* Requests Directory Table */}
      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head">
          <div>
            <h2>{t('noc.nocRequestRecords')}</h2>
            <p>{t('noc.manageIssue')}</p>
          </div>
          <span className="portal-muted-text" style={{ fontSize: '11px', fontWeight: 'bold' }}>{requests.length} {t('noc.records')}</span>
        </div>

        <div className="portal-table-wrap">
          {loading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : (
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>{t('noc.nocNumber')}</th>
                  <th>{t('noc.residentFlat')}</th>
                  <th>{t('noc.nocType')}</th>
                  <th>{t('noc.purpose')}</th>
                  <th>{t('noc.status')}</th>
                  <th>{t('noc.requestedDate')}</th>
                  <th style={{ textAlign: 'right' }}>{t('noc.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => {
                  const badgeStyle = getStatusBadgeStyle(item.status);
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.request_number}</strong>
                      </td>
                      <td>
                        <strong>{item.resident_name}</strong>
                        <div className="portal-muted-text">{t('noc.flat')} {item.flat_no || '-'} · {t('noc.wing')} {item.wing || '-'}</div>
                      </td>
                      <td>{item.noc_type}</td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.purpose}>
                        {item.purpose}
                      </td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', ...badgeStyle }}>
                          {item.status}
                        </span>
                      </td>
                      <td>{fullDate(item.requested_at)}</td>
                      <td>
                        <div className="portal-row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="portal-light-btn" onClick={() => openDetails(item)}>
                            {t('noc.viewDetails')}
                          </button>
                          {['Submitted', 'Pending'].includes(item.status) && (
                            <button type="button" className="portal-light-btn" onClick={() => handleAction('review', item.id)}>
                              {t('noc.review')}
                            </button>
                          )}
                          {['Submitted', 'Pending', 'Under Review', 'Additional Information Required'].includes(item.status) && (
                            <>
                              <button type="button" className="portal-primary-btn" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => setApproving(item)}>
                                {t('noc.approve')}
                              </button>
                              <button type="button" className="portal-light-btn" style={{ color: '#a855f7', fontSize: '10px' }} onClick={() => setRequestingInfo(item)}>
                                {t('noc.requestInfo')}
                              </button>
                              <button type="button" className="portal-light-btn" style={{ color: '#ef4444', fontSize: '10px' }} onClick={() => setRejecting(item)}>
                                {t('noc.reject')}
                              </button>
                            </>
                          )}
                          {['Approved', 'Completed'].includes(item.status) && (
                            <button 
                              type="button" 
                              style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '5px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                              onClick={() => downloadPdf(item)}
                            >
                              <Printer size={13} /> {t('noc.printPdf', 'Print Certificate')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && !requests.length && <div className="portal-empty">{t('noc.noRequestsFound')}</div>}
        </div>
      </section>

      {/* REQUEST DETAILS & TIMELINE MODAL */}
      {selected && (
        <div className="portal-modal-backdrop" onMouseDown={() => setSelected(null)}>
          <div className="portal-modal" style={{ maxWidth: '680px', maxHeight: '90vh' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{selected.request_number}</h3>
                <p>{t('noc.applicationDetails')}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}>×</button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div><strong>{t('noc.resident')}:</strong> {selected.resident_name}</div>
                <div><strong>{t('noc.flat')}:</strong> {t('noc.flat')} {selected.flat_no} · {t('noc.wing')} {selected.wing}</div>
                <div><strong>{t('noc.contact')}:</strong> {selected.contact_number || selected.resident_phone || '-'}</div>
                <div><strong>{t('noc.nocType')}:</strong> {selected.noc_type}</div>
                <div><strong>{t('noc.requiredDate')}:</strong> {fullDate(selected.required_date)}</div>
                <div>
                  <strong>{t('noc.status')}:</strong>{' '}
                  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '800', ...getStatusBadgeStyle(selected.status) }}>
                    {selected.status}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '12px', color: '#475569' }}>{t('noc.purposeOfRequest')}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px', background: '#fff', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  {selected.purpose}
                </p>
              </div>

              {selected.admin_remarks && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ fontSize: '12px', color: '#475569' }}>{t('noc.adminRemarks')}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', background: '#faf5ff', color: '#6b21a8', padding: '10px', border: '1px solid #e9d5ff', borderRadius: '6px' }}>
                    {selected.admin_remarks}
                  </p>
                </div>
              )}

              {/* Uploaded Documents */}
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ fontSize: '12px', color: '#475569' }}>{t('noc.attachedDocuments')}</strong>
                <div style={{ display: 'grid', gap: '8px', marginTop: '6px' }}>
                  {parseDocuments(selected.documents).length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>{t('noc.noDocuments')}</div>
                  ) : (
                    parseDocuments(selected.documents).map((doc, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>📄 {doc.name || `Document ${idx + 1}`}</span>
                        {doc.data && (
                          <a href={doc.data} target="_blank" rel="noreferrer" className="portal-light-btn" style={{ fontSize: '10px', padding: '3px 8px' }}>
                            {t('noc.viewDocument')}
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Complete Timeline Log */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', marginBottom: '12px' }}>{t('noc.activityTimeline')}</strong>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {(selected.history || []).map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '12px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4f46e5', marginTop: '4px', flexShrink: 0 }} />
                      <div>
                        <strong>{log.action}</strong>
                        {log.remarks && <p style={{ margin: '2px 0 0', color: '#475569' }}>{log.remarks}</p>}
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{fullDateTime(log.created_at)} · {log.actor_name || 'System'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="portal-form-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="portal-light-btn" onClick={() => setSelected(null)}>{t('noc.close')}</button>
                {['Approved', 'Completed'].includes(selected.status) && (
                  <button 
                    type="button" 
                    style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 14px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }} 
                    onClick={() => downloadPdf(selected)}
                  >
                    <Printer size={14} /> {t('noc.downloadCertificate', 'Print Certificate')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE CONFIRMATION DIALOG */}
      {approving && (
        <div className="portal-modal-backdrop" onMouseDown={() => setApproving(null)}>
          <div className="portal-modal" style={{ maxWidth: '460px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{t('noc.approveNocTitle')}</h3>
                <p>{approving.request_number} · {approving.resident_name}</p>
              </div>
              <button type="button" onClick={() => setApproving(null)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAction('approve', approving.id, approveForm); }} className="portal-form" style={{ padding: '20px' }}>
              <label className="portal-field-full">
                <span>{t('noc.expiryDate')}</span>
                <input
                  type="date"
                  value={approveForm.expiry_date}
                  onChange={(e) => setApproveForm({ ...approveForm, expiry_date: e.target.value })}
                />
              </label>
              <label className="portal-field-full">
                <span>{t('noc.adminRemarksOnCert')}</span>
                <textarea
                  rows="3"
                  placeholder={t('noc.approveRemarkPlaceholder')}
                  value={approveForm.remarks}
                  onChange={(e) => setApproveForm({ ...approveForm, remarks: e.target.value })}
                />
              </label>
              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setApproving(null)}>{t('noc.cancel')}</button>
                <button type="submit" className="portal-primary-btn" disabled={saving}>
                  {saving ? t('noc.approving') : t('noc.confirmApproval')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT CONFIRMATION DIALOG */}
      {rejecting && (
        <div className="portal-modal-backdrop" onMouseDown={() => setRejecting(null)}>
          <div className="portal-modal" style={{ maxWidth: '460px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{t('noc.rejectNocTitle')}</h3>
                <p>{rejecting.request_number} · {rejecting.resident_name}</p>
              </div>
              <button type="button" onClick={() => setRejecting(null)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAction('reject', rejecting.id, { rejected_reason: rejectReason }); }} className="portal-form" style={{ padding: '20px' }}>
              <label className="portal-field-full">
                <span>{t('noc.rejectionReason')}</span>
                <textarea
                  rows="3"
                  required
                  placeholder={t('noc.rejectionPlaceholder')}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </label>
              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setRejecting(null)}>{t('noc.cancel')}</button>
                <button type="submit" className="portal-primary-btn" style={{ background: '#dc2626' }} disabled={saving}>
                  {saving ? t('noc.rejecting') : t('noc.confirmRejection')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST MORE INFO DIALOG */}
      {requestingInfo && (
        <div className="portal-modal-backdrop" onMouseDown={() => setRequestingInfo(null)}>
          <div className="portal-modal" style={{ maxWidth: '460px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{t('noc.requestAdditionalInfo')}</h3>
                <p>{requestingInfo.request_number} · {requestingInfo.resident_name}</p>
              </div>
              <button type="button" onClick={() => setRequestingInfo(null)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAction('request-info', requestingInfo.id, { remarks: infoRemarks }); }} className="portal-form" style={{ padding: '20px' }}>
              <label className="portal-field-full">
                <span>{t('noc.infoRequired')}</span>
                <textarea
                  rows="3"
                  required
                  placeholder={t('noc.infoPlaceholder')}
                  value={infoRemarks}
                  onChange={(e) => setInfoRemarks(e.target.value)}
                />
              </label>
              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setRequestingInfo(null)}>{t('noc.cancel')}</button>
                <button type="submit" className="portal-primary-btn" style={{ background: '#7e22ce' }} disabled={saving}>
                  {t('noc.sendRequest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPORTS MODAL */}
      {showReportsModal && reportsData && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowReportsModal(false)}>
          <div className="portal-modal" style={{ maxWidth: '640px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{t('noc.nocAnalytics')}</h3>
                <p>{t('noc.issuanceStats')}</p>
              </div>
              <button type="button" onClick={() => setShowReportsModal(false)}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>{t('noc.nocsByCategory')}</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '16px', fontSize: '12px' }}>
                    {(reportsData.by_type || []).map((tp, i) => (
                      <li key={i}>{tp.noc_type}: <strong>{tp.count}</strong></li>
                    ))}
                  </ul>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>{t('noc.monthlyIssuance')}</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '16px', fontSize: '12px' }}>
                    {(reportsData.by_month || []).map((m, i) => (
                      <li key={i}>{m.month}: <strong>{m.count}</strong></li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="portal-form-actions">
                <button type="button" className="portal-primary-btn" onClick={() => window.print()}>
                  <Printer size={14} /> {t('noc.printNocReport')}
                </button>
                <button type="button" className="portal-light-btn" onClick={() => setShowReportsModal(false)}>{t('noc.close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NOCManagement;

