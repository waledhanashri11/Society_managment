import React, { useState, useEffect } from 'react';
import { noticeAPI } from '../services/api';

const Notices = () => {
  const [notices, setNotices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const response = await noticeAPI.getAll();
      setNotices(response.data);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      title: '',
      description: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this notice?')) {
      try {
        await noticeAPI.delete(id);
        fetchNotices();
      } catch (error) {
        console.error('Error deleting notice:', error);
        alert('Error deleting notice');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await noticeAPI.create(formData);
      setShowModal(false);
      fetchNotices();
    } catch (error) {
      console.error('Error creating notice:', error);
      alert('Error creating notice');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Notices</h2>
          <p className="mt-1 text-sm text-slate-500">Publish updates for residents and staff.</p>
        </div>
        <button className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700" onClick={handleAdd}>
          Create Notice
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {notices.map((notice) => (
          <div key={notice.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{notice.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{notice.description}</p>
            <p className="mt-4 text-xs text-slate-400">{new Date(notice.created_at).toLocaleString()}</p>
            <button className="mt-4 rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700" onClick={() => handleDelete(notice.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Notice</h3>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setShowModal(false)}>Close</button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input type="text" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="title" value={formData.title} onChange={handleChange} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" name="description" value={formData.description} onChange={handleChange} rows="4" required />
              </div>
              <button type="submit" className="rounded-xl bg-cyan-600 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-700">Create</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notices;
