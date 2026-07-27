import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Megaphone, Radio, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  if (!poll?.results_visible) {
    return <p className="notice-poll-meta">{t('notices.resultsAfterClose', 'Results will be visible after the poll closes.')}</p>;
  }

  if (!poll.results) return null;

  return (
    <div className="notice-poll-results">
      <div className="notice-poll-summary">
        <span>{t('notices.votesCast', 'Votes Cast')} <strong>{poll.results.votes_cast} / {poll.results.total_eligible}</strong></span>
        <span>{t('notices.participation', 'Participation')} <strong>{poll.results.participation_percent}%</strong></span>
        <span>{t('notices.winningOption', 'Winning Option')} <strong>{poll.results.winning_option}</strong></span>
      </div>
      {poll.results.options.map((option) => (
        <div className="notice-result-row" key={option.id}>
          <div>
            <strong>{option.option_text}</strong>
            <span>{option.votes} {t('notices.votes', 'votes')} - {option.percent}%</span>
          </div>
          <i><b style={{ width: `${option.percent}%` }} /></i>
        </div>
      ))}
    </div>
  );
}

const ResidentNotices = () => {
  const { t } = useTranslation();
  const [notices, setNotices] = useState([]);
  const [selectedVotes, setSelectedVotes] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ type: 'success', text: '' });

  const notify = (text, type = 'success') => {
    setToast({ type, text });
    window.setTimeout(() => setToast({ type: 'success', text: '' }), 2800);
  };

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await noticeAPI.getAll({ params: { filter }, force: true });
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
  }, [filter]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const filteredNotices = useMemo(() => {
    if (!search.trim()) return notices;
    const term = search.toLowerCase();
    return notices.filter((n) =>
      n.title?.toLowerCase().includes(term) ||
      n.description?.toLowerCase().includes(term) ||
      n.poll?.question?.toLowerCase().includes(term)
    );
  }, [notices, search]);

  const stats = useMemo(() => ({
    total: notices.length,
    polls: notices.filter((notice) => notice.has_poll).length,
    active: notices.filter((notice) => notice.poll_status === 'Poll Active').length,
    closed: notices.filter((notice) => notice.poll_status === 'Poll Closed').length
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
          <h1>{t('nav.notices', 'Notices')}</h1>
          <p>{t('notices.subtitle', 'Read society notices and vote in active polls from one place.')}</p>
        </div>
        <div className="portal-date-chip"><Bell size={15} /> {loading ? '...' : `${stats.total} ${t('nav.notices', 'Notices')}`}</div>
      </div>

      <div className="portal-kpis notice-kpis resident-notice-kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="portal-kpi green"><span>{t('notices.totalNotices', 'Total Notices')}</span><strong>{stats.total}</strong><small>{t('notices.published', 'Published')}</small><div className="portal-kpi-icon"><Megaphone size={16} /></div></div>
        <div className="portal-kpi blue"><span>{t('notices.withPolls', 'Notices with Polls')}</span><strong>{stats.polls}</strong><small>{t('notices.votingEnabled', 'Voting enabled')}</small><div className="portal-kpi-icon"><Radio size={16} /></div></div>
        <div className="portal-kpi orange"><span>{t('notices.activePolls', 'Active Polls')}</span><strong>{stats.active}</strong><small>{t('notices.openNow', 'Open now')}</small><div className="portal-kpi-icon"><CheckCircle2 size={16} /></div></div>
        <div className="portal-kpi red"><span>{t('notices.closedPolls', 'Closed Polls')}</span><strong>{stats.closed}</strong><small>{t('notices.ended', 'Ended')}</small><div className="portal-kpi-icon"><XCircle size={16} /></div></div>
      </div>

      <section className="portal-panel" style={{ marginBottom: 16 }}>
        <div className="portal-form-grid" style={{ gridTemplateColumns: '1fr 180px' }}>
          <label>
            <span>{t('common.search', 'Search')}</span>
            <input
              type="text"
              placeholder={t('notices.searchPlaceholder', 'Search by title, description, or poll question...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            <span>{t('notices.filter', 'Filter')}</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">{t('notices.allNotices', 'All Notices')}</option>
              <option value="with_polls">{t('notices.withPollsFilter', 'Notices with Polls')}</option>
              <option value="active_polls">{t('notices.activePollsFilter', 'Active Polls')}</option>
              <option value="closed_polls">{t('notices.closedPollsFilter', 'Closed Polls')}</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <CardSkeleton count={4} />
      ) : filteredNotices.length ? (
        <div className="portal-notice-grid">
          {filteredNotices.map((notice) => {
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
                      {notice.poll_status === 'Poll Active' ? t('notices.pollActive', 'Poll Active') : notice.poll_status === 'Poll Closed' ? t('notices.pollClosed', 'Poll Closed') : notice.poll_status === 'Upcoming Poll' ? t('notices.upcomingPoll', 'Upcoming Poll') : (notice.poll_status || t('notices.noPoll', 'No Poll'))}
                    </span>
                  </div>
                  <p>{notice.description}</p>
                  <span>{fullDate(notice.created_at)}</span>

                  {poll && (
                    <div className="notice-poll-vote" style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--portal-line)' }}>
                      <div>
                        <small className="notice-poll-question" style={{ color: 'var(--portal-blue)', fontWeight: 'bold' }}>{t('notices.pollTag', 'Poll')} - {pollTypeLabel(poll.poll_type)}</small>
                        <h4 style={{ margin: '6px 0', fontSize: '14px', fontWeight: 'bold' }}>{poll.question}</h4>
                        <p className="notice-poll-meta" style={{ fontSize: '11px', color: 'var(--portal-muted)' }}>{t('notices.votingDates', 'Voting: {{start}} to {{end}}', { start: fullDate(poll.start_at), end: fullDate(poll.end_at) })}</p>
                      </div>

                      <div className="notice-poll-options" style={{ display: 'grid', gap: '8px', margin: '14px 0' }}>
                        {poll.options.map((option) => (
                          <label className={`notice-poll-option ${currentSelection.includes(option.id) ? 'selected' : ''}`} key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: canVote ? 'pointer' : 'default', padding: '8px', border: '1px solid var(--portal-line)', borderRadius: '6px', background: currentSelection.includes(option.id) ? 'var(--portal-light-bg)' : 'transparent' }}>
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

                      {alreadyVoted && <p className="notice-vote-confirmation" style={{ color: 'var(--portal-green)', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', margin: '8px 0' }}><CheckCircle2 size={14} /> {t('notices.voteRecorded', 'Your vote has been recorded.')}</p>}
                      {poll.status === 'Upcoming Poll' && <p className="notice-poll-meta" style={{ fontSize: '11px', color: 'var(--portal-muted)' }}>{t('notices.pollOpensOn', 'Poll opens on {{date}}.', { date: fullDate(poll.start_at) })}</p>}
                      {poll.status === 'Poll Closed' && <p className="notice-poll-meta" style={{ fontSize: '11px', color: 'var(--portal-muted)' }}>{t('notices.votingClosed', 'Voting is closed for this poll.')}</p>}
                      {poll.status === 'Poll Active' && alreadyVoted && !poll.allow_vote_change && <p className="notice-poll-meta" style={{ fontSize: '11px', color: 'var(--portal-muted)' }}>{t('notices.voteChangeDisabled', 'Vote change is disabled for this poll.')}</p>}

                      {canVote && (
                        <button className="portal-primary-btn notice-vote-btn" onClick={() => submitVote(notice)} style={{ marginTop: '8px' }}>
                          {alreadyVoted ? t('notices.changeVote', 'Change Vote') : t('notices.submitVote', 'Submit Vote')}
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
            {t('notices.noNoticesPublished', 'No notices published yet.')}
          </div>
        </section>
      )}
    </div>
  );
};

export default ResidentNotices;
