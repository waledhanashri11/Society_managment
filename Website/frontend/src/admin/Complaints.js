import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, MessageSquareWarning, Trash2 } from 'lucide-react';
import { complaintAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [formData, setFormData] = useState({ status: '', reply: '' });
  const [loading, setLoading] = useState(true);

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
    open: complaints.filter((complaint) => complaint.status !== 'resolved').length,
    resolved: complaints.filter((complaint) => complaint.status === 'resolved').length
  }), [complaints]);

  const handleEdit = (complaint) => {
    setEditingComplaint(complaint);
    setFormData({ status: complaint.status, reply: complaint.reply || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try { await complaintAPI.delete(id); fetchComplaints(); }
      catch (error) { console.error('Error deleting complaint:', error); alert('Error deleting complaint'); }
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

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Complaints</h1><p>Track resident issues and admin replies.</p></div>
        <div className="portal-date-chip"><MessageSquareWarning size={15} /> Complaint Desk</div>
      </div>

      {loading ? <CardSkeleton count={3} /> : <div className="portal-kpis">
        <div className="portal-kpi"><span>Total Complaints</span><strong>{stats.total}</strong><small>All requests</small><div className="portal-kpi-icon"><MessageSquareWarning size={18} /></div></div>
        <div className="portal-kpi orange"><span>Open / In Progress</span><strong>{stats.open}</strong><small>Needs follow-up</small><div className="portal-kpi-icon"><Edit3 size={18} /></div></div>
        <div className="portal-kpi green"><span>Resolved</span><strong>{stats.resolved}</strong><small>Closed issues</small><div className="portal-kpi-icon"><CheckCircle2 size={18} /></div></div>
      </div>}

      <section className="portal-panel portal-table-card">
        <div className="portal-panel-head"><div><h2>Complaint Queue</h2><p>Review, reply and update complaint status.</p></div></div>
        <div className="portal-table-wrap">
          {loading ? <TableSkeleton rows={5} columns={6} /> : <table className="portal-data-table">
            <thead><tr><th>Title</th><th>Description</th><th>Resident</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {complaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td><strong>{complaint.title}</strong></td>
                  <td className="portal-truncate">{complaint.description}</td>
                  <td>{complaint.user_name}</td>
                  <td><span className={`portal-status ${complaint.status}`}>{complaint.status.replace('_', ' ')}</span></td>
                  <td>{new Date(complaint.created_at).toLocaleDateString()}</td>
                  <td><div className="portal-row-actions"><button onClick={() => handleEdit(complaint)}><Edit3 size={14} /> Reply</button><button className="danger" onClick={() => handleDelete(complaint.id)}><Trash2 size={14} /> Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>}
          {!loading && !complaints.length && <div className="portal-empty">No complaints found.</div>}
        </div>
      </section>

      {showModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowModal(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head"><div><h3>Reply to Complaint</h3><p>{editingComplaint?.title}</p></div><button onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit} className="portal-form">
              <label><span>Status</span><select name="status" value={formData.status} onChange={handleChange} required><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select></label>
              <label className="portal-field-full"><span>Reply</span><textarea name="reply" value={formData.reply} onChange={handleChange} rows="4" /></label>
              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowModal(false)}>Cancel</button><button className="portal-primary-btn">Update Complaint</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
