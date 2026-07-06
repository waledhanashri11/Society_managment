import React, { useState, useEffect } from 'react';
import { maintenanceAPI, complaintAPI, noticeAPI } from '../services/api';
import { getUser } from '../utils/auth';

const ResidentDashboard = () => {
  const [maintenance, setMaintenance] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notices, setNotices] = useState([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    fetchData();
  }, []);

  const ensureArray = (response) => {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    return [];
  };

  const fetchData = async () => {
    try {
      const [maintenanceRes, complaintsRes, noticesRes] = await Promise.all([
        maintenanceAPI.getUserMaintenance(),
        complaintAPI.getUserComplaints(),
        noticeAPI.getAll()
      ]);
      setMaintenance(ensureArray(maintenanceRes.data));
      setComplaints(ensureArray(complaintsRes.data));
      setNotices(ensureArray(noticesRes.data));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    try {
      await complaintAPI.create(complaintForm);
      setShowComplaintModal(false);
      setComplaintForm({ title: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating complaint:', error);
      alert('Error creating complaint');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-800',
      in_progress: 'bg-sky-100 text-sky-800',
      resolved: 'bg-emerald-100 text-emerald-800',
      paid: 'bg-emerald-100 text-emerald-800'
    };
    const cls = map[status] || 'bg-slate-100 text-slate-800';
    return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{status.replace('_', ' ')}</span>;
  };

  if (loading) {
    return <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Welcome, {user?.name}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl p-5 shadow-sm bg-cyan-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">Maintenance Records</p>
              <p className="mt-2 text-3xl font-semibold">{maintenance.length}</p>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </div>

        <div className="rounded-2xl p-5 shadow-sm bg-amber-500 text-slate-950">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">Pending Payments</p>
              <p className="mt-2 text-3xl font-semibold">{maintenance.filter(m => m.status === 'pending').length}</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </div>

        <div className="rounded-2xl p-5 shadow-sm bg-sky-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">My Complaints</p>
              <p className="mt-2 text-3xl font-semibold">{complaints.length}</p>
            </div>
            <div className="text-3xl">📝</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Maintenance Status</h3>
          </div>

          <div className="mt-4">
            {maintenance.length === 0 ? (
              <p className="text-sm text-slate-500">No maintenance records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-3">Month/Year</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenance.map((m) => (
                      <tr key={m.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3">{m.month}/{m.year}</td>
                        <td className="py-3">₹{parseFloat(m.amount).toLocaleString()}</td>
                        <td className="py-3">{getStatusBadge(m.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">My Complaints</h3>
            <button
              className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
              onClick={() => setShowComplaintModal(true)}
            >
              Raise Complaint
            </button>
          </div>

          <div className="mt-4">
            {complaints.length === 0 ? (
              <p className="text-sm text-slate-500">No complaints found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-3">Title</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Reply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3">{c.title}</td>
                        <td className="py-3">{getStatusBadge(c.status)}</td>
                        <td className="py-3">{c.reply || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Society Notices</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {notices.length === 0 ? (
            <p className="text-sm text-slate-500">No notices available</p>
          ) : (
            notices.map((notice) => (
              <article key={notice.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <h6 className="font-semibold">{notice.title}</h6>
                <p className="mt-2 text-sm text-slate-600">{notice.description}</p>
                <small className="text-xs text-slate-400">{new Date(notice.created_at).toLocaleString()}</small>
              </article>
            ))
          )}
        </div>
      </section>

      {showComplaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h5 className="text-lg font-semibold">Raise Complaint</h5>
              <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setShowComplaintModal(false)}>Close</button>
            </div>
            <form onSubmit={handleComplaintSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  value={complaintForm.title}
                  onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  value={complaintForm.description}
                  onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                  rows="4"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white hover:bg-cyan-700">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentDashboard;
