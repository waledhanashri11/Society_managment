import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Image, MessageSquareWarning, Trash2 } from 'lucide-react';
import { complaintAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [formData, setFormData] = useState({ status: '', reply: '' });
  const [loading, setLoading] = useState(true);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const getComplaintImages = (complaint) => Array.isArray(complaint.complaint_image_urls) && complaint.complaint_image_urls.length
    ? complaint.complaint_image_urls
    : Array.isArray(complaint.complaint_images) ? complaint.complaint_images : [];

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = async () => {
    try {
      const response = await complaintAPI.getAll();
      setComplaints(response.data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'pending').length,
    inProgress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
    closed: complaints.filter((c) => c.status === 'closed').length
  }), [complaints]);

  const handleEdit = (complaint) => {
    setEditingComplaint(complaint);
    setFormData({ status: complaint.status, reply: complaint.reply || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try { 
        await complaintAPI.delete(id); 
        fetchComplaints(); 
      } catch (error) { 
        console.error('Error deleting complaint:', error); 
        alert('Error deleting complaint'); 
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await complaintAPI.update(editingComplaint.id, formData);
      setShowModal(false);
      fetchComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
      alert('Error updating complaint');
    }
  };

  const handleChange = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  const filteredComplaints = useMemo(() => {
    if (statusFilter === 'all') return complaints;
    return complaints.filter((c) => c.status === statusFilter);
  }, [complaints, statusFilter]);

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Complaints</h1><p>Track resident issues and admin replies.</p></div>
        <div className="portal-date-chip"><MessageSquareWarning size={15} /> Complaint Desk</div>
      </div>

      {loading ? <CardSkeleton count={4} /> : (
        <div className="portal-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: '12px', marginBottom: '14px' }}>
          <div className="portal-kpi">
            <span>Total</span>
            <strong>{stats.total}</strong>
            <small>All requests</small>
            <div className="portal-kpi-icon"><MessageSquareWarning size={18} /></div>
          </div>
          <div className="portal-kpi orange">
            <span>Pending</span>
            <strong>{stats.pending}</strong>
            <small>Needs attention</small>
            <div className="portal-kpi-icon" style={{ color: '#dd6b20', background: '#fff5e9' }}><Edit3 size={18} /></div>
          </div>
          <div className="portal-kpi" style={{ borderColor: '#bfdbfe' }}>
            <span>In Progress</span>
            <strong style={{ color: '#2563eb' }}>{stats.inProgress}</strong>
            <small>Work started</small>
            <div className="portal-kpi-icon" style={{ color: '#2563eb', background: '#eff6ff' }}><Edit3 size={18} /></div>
          </div>
          <div className="portal-kpi green">
            <span>Resolved</span>
            <strong>{stats.resolved}</strong>
            <small>Fixed issues</small>
            <div className="portal-kpi-icon"><CheckCircle2 size={18} /></div>
          </div>
          <div className="portal-kpi" style={{ borderColor: '#cbd5e1' }}>
            <span>Closed</span>
            <strong style={{ color: '#475569' }}>{stats.closed}</strong>
            <small>Confirmed closed</small>
            <div className="portal-kpi-icon" style={{ color: '#475569', background: '#f1f5f9' }}><CheckCircle2 size={18} /></div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="portal-filters" style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button 
          className={`portal-light-btn ${statusFilter === 'all' ? 'active' : ''}`}
          style={{ background: statusFilter === 'all' ? '#1473e6' : '#eef3f8', color: statusFilter === 'all' ? 'white' : '#40506a', fontWeight: 'bold' }}
          onClick={() => setStatusFilter('all')}
        >
          All ({stats.total})
        </button>
        <button 
          className={`portal-light-btn ${statusFilter === 'pending' ? 'active' : ''}`}
          style={{ background: statusFilter === 'pending' ? '#1473e6' : '#eef3f8', color: statusFilter === 'pending' ? 'white' : '#40506a', fontWeight: 'bold' }}
          onClick={() => setStatusFilter('pending')}
        >
          Pending ({stats.pending})
        </button>
        <button 
          className={`portal-light-btn ${statusFilter === 'in_progress' ? 'active' : ''}`}
          style={{ background: statusFilter === 'in_progress' ? '#1473e6' : '#eef3f8', color: statusFilter === 'in_progress' ? 'white' : '#40506a', fontWeight: 'bold' }}
          onClick={() => setStatusFilter('in_progress')}
        >
          In Progress ({stats.inProgress})
        </button>
        <button 
          className={`portal-light-btn ${statusFilter === 'resolved' ? 'active' : ''}`}
          style={{ background: statusFilter === 'resolved' ? '#1473e6' : '#eef3f8', color: statusFilter === 'resolved' ? 'white' : '#40506a', fontWeight: 'bold' }}
          onClick={() => setStatusFilter('resolved')}
        >
          Resolved ({stats.resolved})
        </button>
        <button 
          className={`portal-light-btn ${statusFilter === 'closed' ? 'active' : ''}`}
          style={{ background: statusFilter === 'closed' ? '#1473e6' : '#eef3f8', color: statusFilter === 'closed' ? 'white' : '#40506a', fontWeight: 'bold' }}
          onClick={() => setStatusFilter('closed')}
        >
          Closed ({stats.closed})
        </button>
      </div>

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head"><div><h2>Complaint Queue</h2><p>Review, reply and update complaint status.</p></div></div>
        <div className="portal-table-wrap">
          {loading ? <TableSkeleton rows={5} columns={7} /> : (
            <table className="portal-data-table">
              <thead><tr><th>Title</th><th>Description</th><th>Resident</th><th>Status</th><th>Photos</th><th>Date</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
              <tbody>
                {filteredComplaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td><strong>{complaint.title}</strong></td>
                    <td className="portal-truncate">{complaint.description}</td>
                    <td>{complaint.user_name}</td>
                    <td><span className={`portal-status ${complaint.status}`}>{complaint.status.replace('_', ' ')}</span></td>
                    <td>
                      {getComplaintImages(complaint).length ? (
                        <button className="portal-link-button" onClick={() => setViewingPhoto({ title: complaint.title, images: getComplaintImages(complaint), index: 0 })}>
                          <Image size={13} /> View Photo
                        </button>
                      ) : (
                        <span className="portal-muted-text">-</span>
                      )}
                    </td>
                    <td>{new Date(complaint.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="portal-row-actions" style={{ justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(complaint)} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '4px 8px' }}>
                          <Edit3 size={13} /> {complaint.status === 'closed' ? 'View' : 'Reply'}
                        </button>
                        {complaint.status !== 'closed' && (
                          <button className="danger" onClick={() => handleDelete(complaint.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '4px 8px' }}>
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !filteredComplaints.length && <div className="portal-empty">No complaints found.</div>}
        </div>
      </section>

      {showModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowModal(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="portal-modal-head"><div><h3>{editingComplaint?.status === 'closed' ? 'View Complaint' : 'Reply to Complaint'}</h3><p>{editingComplaint?.title}</p></div><button onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit} className="portal-form">
              
              {/* Form inputs */}
              {editingComplaint?.status === 'closed' ? (
                <div className="portal-field-full" style={{ marginBottom: '4px' }}>
                  <strong>Status</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>Closed (Resident Confirmed)</p>
                </div>
              ) : (
                <label className="portal-field-full">
                  <span>Status</span>
                  <select name="status" value={formData.status} onChange={handleChange} required>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
              )}

              <label className="portal-field-full">
                <span>Reply / Action Taken</span>
                <textarea 
                  name="reply" 
                  value={formData.reply} 
                  onChange={handleChange} 
                  rows="4" 
                  disabled={editingComplaint?.status === 'closed'}
                  placeholder="Enter actions taken or updates for the resident..."
                />
              </label>

              {/* Timeline Display */}
              <div className="portal-field-full" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b', fontSize: '11px', textTransform: 'uppercase' }}>Complaint Timeline</strong>
                <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: '#475467' }}>
                  <div>📅 <strong>Created:</strong> {fullDate(editingComplaint?.created_at)}</div>
                  {editingComplaint?.in_progress_at && <div>🔵 <strong>In Progress:</strong> {fullDate(editingComplaint?.in_progress_at)}</div>}
                  {editingComplaint?.resolved_at && <div>🟢 <strong>Resolved:</strong> {fullDate(editingComplaint?.resolved_at)}</div>}
                  {editingComplaint?.closed_at && <div>⚫ <strong>Closed:</strong> {fullDate(editingComplaint?.closed_at)}</div>}
                  {editingComplaint?.reopened_at && (
                    <div style={{ padding: '6px 8px', background: '#fff5e9', borderLeft: '3px solid #dd6b20', borderRadius: '4px' }}>
                      <div>⚠️ <strong>Reopened:</strong> {fullDate(editingComplaint?.reopened_at)}</div>
                      {editingComplaint?.reopened_comment && <div style={{ marginTop: '2px' }}><em>Comment: "{editingComplaint?.reopened_comment}"</em></div>}
                    </div>
                  )}
                </div>
              </div>

              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setShowModal(false)}>Close</button>
                {editingComplaint?.status !== 'closed' && (
                  <button className="portal-primary-btn">Update Complaint</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="portal-modal-backdrop" onMouseDown={() => setViewingPhoto(null)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div><h3>Complaint Photo</h3><p>{viewingPhoto.title}</p></div>
              <button type="button" onClick={() => setViewingPhoto(null)}>×</button>
            </div>
            <div className="p-4">
              <img src={viewingPhoto.images[viewingPhoto.index]} alt="Complaint proof" className="max-h-[70vh] w-full rounded-xl object-contain bg-slate-50" />
              {viewingPhoto.images.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {viewingPhoto.images.map((image, index) => (
                    <button key={image} type="button" className={`rounded-lg border px-3 py-2 text-xs font-bold ${index === viewingPhoto.index ? 'border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600'}`} onClick={() => setViewingPhoto({ ...viewingPhoto, index })}>
                      Photo {index + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
