import React, { useState, useEffect } from 'react';
import { FiEdit3, FiTrash2 } from 'react-icons/fi';
import { complaintAPI } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { TableSkeleton } from '../components/Skeletons';

const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [formData, setFormData] = useState({
    status: '',
    reply: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

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

  const handleEdit = (complaint) => {
    setEditingComplaint(complaint);
    setFormData({
      status: complaint.status,
      reply: complaint.reply || ''
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await complaintAPI.update(editingComplaint.id, formData);
      setShowModal(false);
      fetchComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
      alert('Error updating complaint');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getStatusBadge = (status) => {
    const mapping = {
      pending: { variant: 'warning', label: 'Pending' },
      in_progress: { variant: 'info', label: 'In Progress' },
      resolved: { variant: 'success', label: 'Resolved' }
    };
    const badge = mapping[status] || { variant: 'primary', label: status };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Complaints</p>
          <h2 className="text-3xl font-semibold text-slate-900">Manage resident issues</h2>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Complaints</p>
          <h2 className="text-3xl font-semibold text-slate-900">Manage resident issues</h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Title</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Description</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Resident</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {complaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td className="px-6 py-4 text-slate-800">{complaint.title}</td>
                  <td className="px-6 py-4 text-slate-600">{complaint.description}</td>
                  <td className="px-6 py-4 text-slate-700">{complaint.user_name}</td>
                  <td className="px-6 py-4">{getStatusBadge(complaint.status)}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(complaint.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" className="gap-2" onClick={() => handleEdit(complaint)}>
                        <FiEdit3 className="h-4 w-4" /> Reply
                      </Button>
                      <Button variant="danger" size="sm" className="gap-2" onClick={() => handleDelete(complaint.id)}>
                        <FiTrash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Reply to Complaint</h3>
                <p className="text-sm text-slate-500">Update status and send feedback to the resident.</p>
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form className="space-y-5 pt-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Reply</label>
                <textarea
                  name="reply"
                  value={formData.reply}
                  onChange={handleChange}
                  rows="4"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowModal(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
