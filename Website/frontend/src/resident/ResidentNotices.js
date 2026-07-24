import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Megaphone, Radio, XCircle } from 'lucide-react';
import { noticeAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';

const fullDate = (value) => value
  ? new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  : '-';

const pollTypeLabel = (type) => ({
  yes_no: 'Yes / No',
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice'
}[type] || 'Poll');

function ResultsView({ poll }) {
  if (!poll?.results_visible) {
    return <p className="notice-poll-meta">Results will be visible after the poll closes.</p>;
  }

  if (!poll.results) return null;

  return (
    <div className="notice-poll-results">
      <div className="notice-poll-summary">
        <span>Votes Cast <strong>{poll.results.votes_cast} / {poll.results.total_eligible}</strong></span>
        <span>Participation <strong>{poll.results.participation_percent}%</strong></span>
        <span>Winning Option <strong>{poll.results.winning_option}</strong></span>
      </div>
      {poll.results.options.map((option) => (
        <div className="notice-result-row" key={option.id}>
          <div>
            <strong>{option.option_text}</strong>
            <span>{option.votes} votes - {option.percent}%</span>
          </div>
          <i><b style={{ width: `${option.percent}%` }} /></i>
        </div>
      ))}
    </div>
  );
}

const ResidentNotices = () => {
  const [notices, setNotices] = useState([]);
  const [selectedVotes, setSelectedVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ type: 'success', text: '' });

  const notify = (text, type = 'success') => {
    setToast({ type, text });
    window.setTimeout(() => setToast({ type: 'success', text: '' }), 2800);
  };

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await noticeAPI.getAll({ force: true });
      const noticeList = Array.isArray(data) ? data : data?.data || [];
      setNotices(noticeList);
      const prefilled = {};
      noticeList.forEach((notice) => {
        if (notice.poll?.my_vote_option_ids?.length) {
          prefilled[notice.id] = notice.poll.my_vote_option_ids;
        }
      });
      setSelectedVotes(prefilled);
    } catch (error) {
      notify('Could not load notices', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const stats = useMemo(() => ({
    total: notices.length,
    polls: notices.filter((notice) => notice.has_poll).length,
    active: notices.filter((notice) => notice.poll_status === 'Poll Active').length
  }), [notices]);

  const changeSelection = (notice, optionId) => {
    const poll = notice.poll;
    if (!poll || poll.status !== 'Poll Active') return;

    setSelectedVotes((current) => {
      const existing = current[notice.id] || [];
      if (poll.poll_type === 'multiple_choice') {
        return {
          ...current,
          [notice.id]: existing.includes(optionId)
            ? existing.filter((id) => id !== optionId)
            : [...existing, optionId]
        };
      }
      return { ...current, [notice.id]: [optionId] };
    });
  };

  const submitVote = async (notice) => {
    const optionIds = selectedVotes[notice.id] || [];
    if (!optionIds.length) return notify('Please select an option first', 'error');

    try {
      await noticeAPI.vote(notice.id, { option_ids: optionIds });
      notify(notice.poll?.my_vote_option_ids?.length ? 'Vote updated successfully' : 'Vote submitted successfully');
      await fetchNotices();
    } catch (error) {
      notify(error.response?.data?.message || 'Could not submit vote', 'error');
    }
  };

  return (
    <div className="portal-module">
      {toast.text && (
        <div className={toast.type === 'success' ? 'resident-toast' : 'portal-toast portal-toast-error'}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {toast.text}
        </div>
      )}

      <div className="portal-page-title">
        <div>
          <h1>Notices</h1>
          <p>Read society notices and vote in active polls from one place.</p>
        </div>
        <div className="portal-date-chip"><Bell size={15} /> {loading ? '...' : `${stats.total} Notices`}</div>
      </div>

      <div className="portal-kpis notice-kpis resident-notice-kpis">
        <div className="portal-kpi green"><span>Total Notices</span><strong>{stats.total}</strong><small>Published</small><div className="portal-kpi-icon"><Megaphone size={16} /></div></div>
        <div className="portal-kpi blue"><span>Notices with Polls</span><strong>{stats.polls}</strong><small>Voting enabled</small><div className="portal-kpi-icon"><Radio size={16} /></div></div>
        <div className="portal-kpi orange"><span>Active Polls</span><strong>{stats.active}</strong><small>Open now</small><div className="portal-kpi-icon"><CheckCircle2 size={16} /></div></div>
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : notices.length ? (
        <div className="portal-notice-grid">
          {notices.map((notice) => {
            const poll = notice.poll;
            const currentSelection = selectedVotes[notice.id] || [];
            const alreadyVoted = Boolean(poll?.my_vote_option_ids?.length);
            const canVote = poll?.status === 'Poll Active' && (!alreadyVoted || poll.allow_vote_change);

            return (
              <section className="portal-notice-card notice-card" key={notice.id}>
                <span className="portal-notice-icon"><Megaphone size={18} /></span>
                <div className="portal-notice-content">
                  <div className="notice-card-head">
                    <h3>{notice.title}</h3>
                    <span className={`notice-poll-chip ${notice.poll_status?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {notice.poll_status || 'No Poll'}
                    </span>
                  </div>
                  <p>{notice.description}</p>
                  <span>{fullDate(notice.created_at)}</span>

                  {poll && (
                    <div className="notice-poll-vote">
                      <div>
                        <small className="notice-poll-question">Poll - {pollTypeLabel(poll.poll_type)}</small>
                        <h4>{poll.question}</h4>
                        <p className="notice-poll-meta">Voting: {fullDate(poll.start_at)} to {fullDate(poll.end_at)}</p>
                      </div>

                      <div className="notice-poll-options">
                        {poll.options.map((option) => (
                          <label className={`notice-poll-option ${currentSelection.includes(option.id) ? 'selected' : ''}`} key={option.id}>
                            <input
                              type={poll.poll_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                              name={`poll-${poll.id}`}
                              checked={currentSelection.includes(option.id)}
                              disabled={!canVote}
                              onChange={() => changeSelection(notice, option.id)}
                            />
                            {option.option_text}
                          </label>
                        ))}
                      </div>

                      {alreadyVoted && <p className="notice-vote-confirmation"><CheckCircle2 size={14} /> Your vote has been recorded.</p>}
                      {poll.status === 'Upcoming Poll' && <p className="notice-poll-meta">Poll opens on {fullDate(poll.start_at)}.</p>}
                      {poll.status === 'Poll Closed' && <p className="notice-poll-meta">Voting is closed for this poll.</p>}
                      {poll.status === 'Poll Active' && alreadyVoted && !poll.allow_vote_change && <p className="notice-poll-meta">Vote change is disabled for this poll.</p>}

                      {canVote && (
                        <button className="portal-primary-btn notice-vote-btn" onClick={() => submitVote(notice)}>
                          {alreadyVoted ? 'Change Vote' : 'Submit Vote'}
                        </button>
                      )}

                      <ResultsView poll={poll} />
                    </div>
                  )}
                </div>
              </section>
            );
          })}
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
