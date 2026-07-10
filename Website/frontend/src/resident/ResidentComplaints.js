import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquarePlus, MessageSquareWarning, Send } from 'lucide-react';
import { complaintAPI } from '../services/api';
import { TableSkeleton } from '../components/Skeletons';

const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ResidentComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ title: '', description: '' });

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const loadComplaints = useCallback(async () => {
    try {
      const { data } = await complaintAPI.getUserComplaints();
      setComplaints(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      notify('Could not load complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const submitComplaint = async (event) => {
    event.preventDefault();
    try {
      await complaintAPI.create(form);
      setForm({ title: '', description: '' });
      setShowForm(false);
      notify('Complaint submitted');
      loadComplaints();
    } catch (error) {
      notify(error.response?.data?.message || 'Could not submit complaint');
    }
  };

  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div>
          <h1>Complaints</h1>
          <p>Raise a new complaint and track your previous requests.</p>
        </div>
        <button className="portal-primary-btn" onClick={() => setShowForm(true)}>
          <MessageSquarePlus size={16} /> Raise Complaint
        </button>
      </div>

      <section className="portal-panel portal-table-card">
        {loading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : complaints.length ? (
          <div className="portal-table-wrap">
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Status</th>
                  <th>Reply</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.title}</strong><div className="portal-muted-text">{item.description}</div></td>
                    <td><span className={`portal-status ${item.status}`}>{String(item.status).replace('_', ' ')}</span></td>
                    <td>{item.reply || '—'}</td>
                    <td>{fullDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="portal-empty">
            <MessageSquareWarning size={26} /><br />
            No complaints raised yet.
          </div>
        )}
      </section>

      {showForm && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowForm(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div><h3>Raise a complaint</h3><p>Tell the society team what needs attention.</p></div>
              <button type="button" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form className="portal-form" onSubmit={submitComplaint}>
              <label className="portal-field-full">
                Subject
                <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>
              <label className="portal-field-full">
                Description
                <textarea required rows="5" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="portal-primary-btn"><Send size={15} /> Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentComplaints;
