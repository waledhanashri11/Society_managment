import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { noticeAPI } from '../services/api';

const Notices = () => {
  const [notices, setNotices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotices(); }, []);

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
    setFormData({ title: '', description: '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this notice?')) {
      try { await noticeAPI.delete(id); fetchNotices(); }
      catch (error) { console.error('Error deleting notice:', error); alert('Error deleting notice'); }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await noticeAPI.create(formData);
      setShowModal(false);
      fetchNotices();
    } catch (error) {
      console.error('Error creating notice:', error);
      alert('Error creating notice');
    }
  };

  const handleChange = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  if (loading) return <div className="portal-empty">Loading notices...</div>;

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>Notices</h1><p>Create and manage announcements for residents.</p></div>
        <button className="portal-primary-btn" onClick={handleAdd}><Plus size={17} /> Create Notice</button>
      </div>

      <div className="portal-notice-grid">
        {notices.map((notice) => (
          <article key={notice.id} className="portal-notice-card">
            <div className="portal-notice-icon"><Megaphone size={18} /></div>
            <div className="portal-notice-content">
              <h3>{notice.title}</h3>
              <p>{notice.description}</p>
              <span>{new Date(notice.created_at).toLocaleString()}</span>
            </div>
            <button className="portal-icon-danger" onClick={() => handleDelete(notice.id)} aria-label="Delete notice"><Trash2 size={15} /></button>
          </article>
        ))}
      </div>
      {!notices.length && <section className="portal-panel"><div className="portal-empty">No notices published yet.</div></section>}

      {showModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowModal(false)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head"><div><h3>Create Notice</h3><p>Share an update with all residents.</p></div><button onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit} className="portal-form">
              <label><span>Title</span><input name="title" value={formData.title} onChange={handleChange} required /></label>
              <label className="portal-field-full"><span>Description</span><textarea name="description" value={formData.description} onChange={handleChange} rows="4" required /></label>
              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowModal(false)}>Cancel</button><button className="portal-primary-btn">Publish Notice</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notices;
