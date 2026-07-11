import React, { useEffect, useState } from 'react';
import { Bell, Megaphone } from 'lucide-react';
import { noticeAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ResidentNotices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    noticeAPI.getAll()
      .then(({ data }) => setNotices(Array.isArray(data) ? data : data?.data || []))
      .catch(() => notify('Could not load notices'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div>
          <h1>Notices</h1>
          <p>All society notices and announcements in one place.</p>
        </div>
        <div className="portal-date-chip"><Bell size={15} /> {loading ? '...' : notices.length} Notices</div>
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : notices.length ? (
        <div className="portal-notice-grid">
          {notices.map((notice) => (
            <section className="portal-notice-card" key={notice.id}>
              <span className="portal-notice-icon"><Megaphone size={18} /></span>
              <div className="portal-notice-content">
                <h3>{notice.title}</h3>
                <p>{notice.description}</p>
                <span>{fullDate(notice.created_at)}</span>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="portal-panel">
          <div className="portal-empty">
            <Megaphone size={26} /><br />
            No notices published yet.
          </div>
        </section>
      )}
    </div>
  );
};

export default ResidentNotices;
