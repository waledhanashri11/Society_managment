import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Download, Eye, FileCheck2, Plus, RefreshCw, Search, Share2, Trash2, XCircle
} from 'lucide-react';
import { nocAPI } from '../services/api';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];
const statuses = ['All', 'Pending', 'Under Review', 'Approved', 'Rejected'];
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

const statusBadgeClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (normalized === 'rejected') return 'bg-red-50 text-red-700 ring-red-200';
  if (normalized === 'under review') return 'bg-blue-50 text-blue-700 ring-blue-200';
  return 'bg-amber-50 text-amber-700 ring-amber-200';
};

const Field = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 truncate text-sm font-semibold text-slate-900" title={String(value || '-')}>{value || '-'}</p>
  </div>
);

const ActionButton = ({ title, onClick, children, tone = 'blue' }) => {
  const tones = {
    blue: 'text-blue-700 hover:bg-blue-50',
    green: 'text-emerald-700 hover:bg-emerald-50',
    red: 'text-red-700 hover:bg-red-50',
    slate: 'text-slate-700 hover:bg-slate-100'
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-full transition ${tones[tone] || tones.blue}`}
    >
      {children}
    </button>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
      ))}
    </div>
    <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
    <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
  </div>
);

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

  const load = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const [requestRes, typeRes] = await Promise.all([
        nocAPI.getAll({ params: { status: nextFilters.status, search: nextFilters.search } }),
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

  const resetFilters = () => {
    const nextFilters = { status: 'All', search: '' };
    setFilters(nextFilters);
    load(nextFilters);
  };

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
    const newWindow = window.open('about:blank', '_blank');

    try {
      const response = await nocAPI.generateShareLink(request.id);
      const shareUrl = response.data?.data?.shareUrl || response.data?.shareUrl;
      const cleanShareUrl = String(shareUrl || '').trim().replace(/[\r\n\s]+/g, '');

      const residentName = request.resident_name;
      const nocNumber = request.request_number;
      const flatNumber = `Flat ${request.flat_no || ''}${request.wing ? `, Wing ${request.wing}` : ''}`;

      let societyName = 'Society Management System';
      try {
        const settings = JSON.parse(localStorage.getItem('adminSettings'));
        if (settings && settings.societyName) {
          societyName = settings.societyName;
        }
      } catch (e) {}

      const messageText = `Dear ${residentName},

Your No Objection Certificate has been approved.

NOC Number: ${nocNumber}
Flat Number: ${flatNumber}

Download your certificate:

${cleanShareUrl}

Regards,
${societyName}`;

      let phone = request.resident_phone || '';
      phone = phone.replace(/\D/g, '');
      if (phone.length === 10) {
        phone = `91${phone}`;
      }

      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
      if (newWindow) {
        newWindow.location.href = whatsappUrl;
      } else {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      if (newWindow) {
        newWindow.close();
      }
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

  const summaryCards = [
    { label: 'Total Requests', value: summary.total, note: 'All NOC applications', icon: FileCheck2, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Pending NOCs', value: summary.pending, note: 'Awaiting admin action', icon: RefreshCw, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Approved NOCs', value: summary.approved, note: 'Ready for download', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Rejected NOCs', value: summary.rejected, note: 'Rejected requests', icon: XCircle, tone: 'bg-red-50 text-red-700' }
  ];

  return (
    <div>
      {toast && (
        <div className="portal-toast">
          {toast}
        </div>
      )}

      <div className="portal-page-title">
        <div>
          <h1>NOC Management</h1>
          <p>Review, approve, reject, download, and share resident NOC certificates.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowType(true)}
          className="portal-primary-button"
        >
          <Plus size={16} /> Add NOC Type
        </button>
      </div>

      {error && (
        <div className="portal-error">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className="portal-kpis">
            {summaryCards.map(({ label, value, note, icon: Icon, tone }) => (
              <article key={label} className={`portal-kpi ${tone.includes('emerald') ? 'green' : tone.includes('red') ? 'red' : ''}`}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </div>
                <div className="portal-kpi-icon"><Icon size={16} /></div>
              </article>
            ))}
          </div>

          <section className="portal-panel" style={{ marginBottom: 16 }}>
            <div className="portal-form-grid" style={{ gridTemplateColumns: 'minmax(150px, .45fr) minmax(220px, 1fr) auto auto' }}>
              <label className="block">
                <span>Status</span>
                <select
                  value={filters.status}
                  onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                >
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="block">
                <span>Search</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                    placeholder="Resident, flat, type, or NOC number"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </label>
              <button
                type="button"
                onClick={() => load()}
                className="portal-primary-button"
              >
                <Search size={17} /> Apply Filter
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="portal-primary-button"
                style={{ background: '#f8fafc', color: '#334155', boxShadow: 'none', border: '1px solid #e2e8f0' }}
              >
                Reset Filter
              </button>
            </div>
          </section>

          <section className="portal-panel">
            <div className="portal-panel-head">
              <div>
                <h2>NOC Requests</h2>
                <p>Complete approval workflow with audit history.</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{requests.length} records</span>
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[13%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-100">
                  <tr>
                    {['NOC Number', 'Resident', 'Flat', 'Type', 'Purpose', 'Status', 'Requested Date', 'Actions'].map((heading) => (
                      <th key={heading} className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-600">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!requests.length ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-16">
                        <div className="mx-auto max-w-sm text-center">
                          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                            <FileCheck2 size={30} />
                          </div>
                          <h3 className="mt-4 text-lg font-black text-slate-900">No NOC requests found</h3>
                          <p className="mt-2 text-sm text-slate-500">Try changing the filters or create a new NOC type for resident requests.</p>
                        </div>
                      </td>
                    </tr>
                  ) : pagedRequests.map((item, index) => (
                    <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} transition hover:bg-blue-50/60`}>
                      <td className="px-6 py-4 align-middle text-sm font-black text-slate-950" title={item.request_number}>
                        <span className="block truncate">{item.request_number}</span>
                      </td>
                      <td className="px-6 py-4 align-middle text-sm font-semibold text-slate-800" title={item.resident_name || '-'}>
                        <span className="block truncate">{item.resident_name || '-'}</span>
                      </td>
                      <td className="px-6 py-4 align-middle text-sm font-semibold text-slate-700" title={`${item.flat_no || '-'} ${item.wing || ''}`}>
                        <span className="block truncate">{item.flat_no || '-'} {item.wing ? `(${item.wing})` : ''}</span>
                      </td>
                      <td className="px-6 py-4 align-middle text-sm font-semibold text-slate-700" title={item.noc_type || '-'}>
                        <span className="block truncate">{item.noc_type || '-'}</span>
                      </td>
                      <td className="px-6 py-4 align-middle text-sm font-medium text-slate-600" title={item.purpose || '-'}>
                        <span className="block truncate">{item.purpose || '-'}</span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusBadgeClass(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-6 py-4 align-middle text-sm font-semibold text-slate-600">{fullDate(item.requested_at)}</td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <ActionButton title="View" onClick={() => openDetails(item)}><Eye size={17} /></ActionButton>
                          {item.status === 'Pending' && <ActionButton title="Mark under review" onClick={() => handleAction('review', item)} tone="slate"><RefreshCw size={17} /></ActionButton>}
                          {['Pending', 'Under Review'].includes(item.status) && <ActionButton title="Approve" onClick={() => handleAction('approve', item)} tone="green"><CheckCircle2 size={17} /></ActionButton>}
                          {item.status === 'Approved' && <ActionButton title="Download" onClick={() => downloadPdf(item)} tone="green"><Download size={17} /></ActionButton>}
                          {item.status === 'Approved' && <ActionButton title="Share" onClick={() => handleSendWhatsApp(item)} tone="blue"><Share2 size={17} /></ActionButton>}
                          {item.status !== 'Approved' && <ActionButton title="Reject" onClick={() => setRejecting(item)} tone="red"><Trash2 size={17} /></ActionButton>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {!requests.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                  <FileCheck2 className="mx-auto text-blue-700" size={34} />
                  <h3 className="mt-3 text-base font-black text-slate-900">No NOC requests found</h3>
                  <p className="mt-1 text-sm text-slate-500">No matching records are available right now.</p>
                </div>
              ) : pagedRequests.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950" title={item.request_number}>{item.request_number}</p>
                      <p className="mt-1 truncate text-sm text-slate-500" title={item.resident_name || '-'}>{item.resident_name || '-'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ring-1 ${statusBadgeClass(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <Field label="Flat" value={`${item.flat_no || '-'} ${item.wing ? `(${item.wing})` : ''}`} />
                    <Field label="Type" value={item.noc_type} />
                    <Field label="Date" value={fullDate(item.requested_at)} />
                    <Field label="Purpose" value={item.purpose} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <ActionButton title="View" onClick={() => openDetails(item)}><Eye size={17} /></ActionButton>
                    {item.status === 'Pending' && <ActionButton title="Mark under review" onClick={() => handleAction('review', item)} tone="slate"><RefreshCw size={17} /></ActionButton>}
                    {['Pending', 'Under Review'].includes(item.status) && <ActionButton title="Approve" onClick={() => handleAction('approve', item)} tone="green"><CheckCircle2 size={17} /></ActionButton>}
                    {item.status === 'Approved' && <ActionButton title="Download" onClick={() => downloadPdf(item)} tone="green"><Download size={17} /></ActionButton>}
                    {item.status === 'Approved' && <ActionButton title="Share" onClick={() => handleSendWhatsApp(item)}><Share2 size={17} /></ActionButton>}
                    {item.status !== 'Approved' && <ActionButton title="Reject" onClick={() => setRejecting(item)} tone="red"><Trash2 size={17} /></ActionButton>}
                  </div>
                </article>
              ))}
            </div>

            {!loading && requests.length > 8 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm font-bold text-slate-600 sm:flex-row sm:items-center sm:justify-end">
                <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                <span className="text-center">Page {page} of {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
              </div>
            )}
          </section>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">{selected.request_number}</h2>
                <p className="text-sm text-slate-500">NOC request details and history</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100"><XCircle size={20} /></button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Resident" value={selected.resident_name} />
              <Field label="Flat" value={`${selected.flat_no || '-'} Wing ${selected.wing || '-'}`} />
              <Field label="NOC Type" value={selected.noc_type} />
              <Field label="Status" value={selected.status} />
              <Field label="Purpose" value={selected.purpose} />
              <Field label="Remarks" value={selected.remarks || '-'} />
              <Field label="Rejected Reason" value={selected.rejected_reason || '-'} />
            </div>
            {selected.status === 'Approved' && (
              <div className="flex flex-wrap gap-3 border-y border-slate-200 bg-slate-50 px-5 py-4">
                <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800" onClick={() => downloadPdf(selected)}><Eye size={16} /> View Certificate</button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800" onClick={() => downloadFile(selected)}><Download size={16} /> Download PDF</button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700" onClick={() => handleSendWhatsApp(selected)}><Share2 size={16} /> Share</button>
              </div>
            )}
            <div className="p-5">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Documents</h3>
              <div className="mt-3 space-y-2">
                {parseDocuments(selected.documents).length ? parseDocuments(selected.documents).map((doc, index) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3" key={`${doc.name || 'document'}-${index}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{doc.name || `Document ${index + 1}`}</p>
                      <p className="truncate text-xs text-slate-500">{doc.type || 'Uploaded document'}</p>
                    </div>
                    {doc.data && <button className="rounded-lg px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50" onClick={() => window.open(doc.data, '_blank', 'noopener,noreferrer')}>View</button>}
                  </div>
                )) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No documents attached.</div>}
              </div>
              <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-slate-700">Approval History</h3>
              <div className="mt-3 space-y-2">
                {(selected.history || []).length ? selected.history.map((item) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3" key={item.id}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{item.action}</p>
                      <p className="truncate text-xs text-slate-500">{item.remarks || item.actor_name || 'System update'}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-slate-500">{fullDate(item.created_at)}</span>
                  </div>
                )) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No history yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setRejecting(null)}>
          <form className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl" onSubmit={(event) => { event.preventDefault(); handleAction('reject', rejecting, { rejected_reason: rejectReason }); }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Reject NOC</h2>
                <p className="text-sm text-slate-500">Add a reason for the resident.</p>
              </div>
              <button type="button" onClick={() => setRejecting(null)} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100"><XCircle size={20} /></button>
            </div>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Reason</span>
              <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} required rows="4" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </label>
            <button className="mt-4 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={saving}>{saving ? 'Saving...' : 'Reject Request'}</button>
          </form>
        </div>
      )}

      {showType && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setShowType(false)}>
          <form className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl" onSubmit={createType} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Add NOC Type</h2>
                <p className="text-sm text-slate-500">Create a reusable certificate category.</p>
              </div>
              <button type="button" onClick={() => setShowType(false)} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100"><XCircle size={20} /></button>
            </div>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Name</span>
              <input value={newType.name} onChange={(event) => setNewType({ ...newType, name: event.target.value })} list="noc-types" required className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </label>
            <datalist id="noc-types">{types.map((type) => <option key={type.id} value={type.name} />)}</datalist>
            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Description</span>
              <textarea value={newType.description} onChange={(event) => setNewType({ ...newType, description: event.target.value })} rows="3" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </label>
            <button className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={saving}>{saving ? 'Saving...' : 'Create Type'}</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default NOCManagement;
