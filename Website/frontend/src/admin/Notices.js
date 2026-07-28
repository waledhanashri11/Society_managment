/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Download, Edit3, Eye, FileText, Megaphone, Plus, Printer, Radio, Trash2, XCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { noticeAPI } from '../services/api';
import { CardSkeleton } from '../components/Skeletons';
import { useTranslation } from 'react-i18next';

const emptyPoll = {
  enabled: false,
  question: '',
  poll_type: 'yes_no',
  options: ['Yes', 'No'],
  start_at: '',
  end_at: '',
  anonymous: false,
  allow_vote_change: false,
  show_results_before_end: false,
  mandatory: false
};

const emptyForm = { title: '', description: '', poll: emptyPoll };

const dateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return offsetDate.toISOString().slice(0, 16);
};
const defaultPollTimes = () => {
  const start = new Date();
  const end = new Date(start.getTime() + (24 * 60 * 60 * 1000));
  return { start_at: dateInput(start), end_at: dateInput(end) };
};
const toServerDateTime = (value) => value ? new Date(value).toISOString() : '';
const fullDate = (value) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const pollTypeLabel = (type) => ({ yes_no: 'Yes / No', single_choice: 'Single Choice', multiple_choice: 'Multiple Choice' }[type] || type);

function ResultsView({ poll, showVoters = false }) {
  const { t } = useTranslation();
  if (!poll?.results) return <p className="portal-muted">{t('notices.resultsHidden')}</p>;
  const result = poll.results;
  return (
    <div className="notice-poll-results">
      <div className="notice-poll-summary">
        <span>{t('notices.totalEligible')} <strong>{result.total_eligible}</strong></span>
        <span>{t('notices.votesCast')} <strong>{result.votes_cast}</strong></span>
        <span>{t('notices.participation')} <strong>{result.participation_percent}%</strong></span>
        <span>{t('notices.winningOption')} <strong>{result.winning_option}</strong></span>
      </div>
      {result.options.map((option) => (
        <div className="notice-result-row" key={option.id}>
          <div><strong>{option.option_text}</strong><span>{option.votes} {t('notices.votes')} · {option.percent}%</span></div>
          <i><b style={{ width: `${option.percent}%` }} /></i>
        </div>
      ))}
      {showVoters && result.voters?.length > 0 && (
        <div className="notice-voter-list">
          <strong>{t('notices.participation')}</strong>
          {result.voters.map((voter) => (
            <span key={`${voter.resident_id}-${voter.vote_timestamp}`}>
              {voter.resident_name} · {t('notices.flat')} {voter.flat_no || '-'} · {fullDate(voter.vote_timestamp)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const Notices = () => {
  const { t } = useTranslation();

  const filters = useMemo(() => [
    ['all', t('notices.allNotices')],
    ['with_polls', t('notices.withPolls')],
    ['active_polls', t('notices.activePollsFilter')],
    ['closed_polls', t('notices.closedPollsFilter')]
  ], [t]);

  const [notices, setNotices] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const notify = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const [noticeRes, statsRes] = await Promise.all([
        noticeAPI.getAll({ params: { filter }, force: true }),
        noticeAPI.getStats({ force: true })
      ]);
      setNotices(Array.isArray(noticeRes.data) ? noticeRes.data : []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Error fetching notices:', error);
      notify('error', 'Could not load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotices(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingNotice(null);
    setFormData({ ...emptyForm, poll: { ...emptyPoll, ...defaultPollTimes() } });
    setShowModal(true);
  };

  const openEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title || '',
      description: notice.description || '',
      poll: notice.poll ? {
        enabled: true,
        question: notice.poll.question || '',
        poll_type: notice.poll.poll_type || 'yes_no',
        options: notice.poll.options?.map((option) => option.option_text) || ['Yes', 'No'],
        start_at: dateInput(notice.poll.start_at),
        end_at: dateInput(notice.poll.end_at),
        anonymous: Boolean(notice.poll.anonymous),
        allow_vote_change: Boolean(notice.poll.allow_vote_change),
        show_results_before_end: Boolean(notice.poll.show_results_before_end),
        mandatory: Boolean(notice.poll.mandatory)
      } : { ...emptyPoll }
    });
    setShowModal(true);
  };

  const updatePoll = (patch) => setFormData((current) => ({ ...current, poll: { ...current.poll, ...patch } }));

  const setPollEnabled = (enabled) => {
    setFormData((current) => ({
      ...current,
      poll: {
        ...current.poll,
        enabled,
        ...(enabled && (!current.poll.start_at || !current.poll.end_at) ? defaultPollTimes() : {})
      }
    }));
  };

  const handlePollType = (pollType) => {
    updatePoll({ poll_type: pollType, options: pollType === 'yes_no' ? ['Yes', 'No'] : formData.poll.options.length >= 2 ? formData.poll.options : ['', ''] });
  };

  const handleOption = (index, value) => {
    updatePoll({ options: formData.poll.options.map((option, i) => i === index ? value : option) });
  };

  const addOption = () => {
    if (formData.poll.options.length < 10) updatePoll({ options: [...formData.poll.options, ''] });
  };

  const removeOption = (index) => {
    if (formData.poll.options.length > 2) updatePoll({ options: formData.poll.options.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...formData,
        poll: formData.poll.enabled ? {
          ...formData.poll,
          start_at: toServerDateTime(formData.poll.start_at),
          end_at: toServerDateTime(formData.poll.end_at)
        } : { enabled: false }
      };
      if (editingNotice) {
        await noticeAPI.update(editingNotice.id, payload);
        notify('success', 'Notice updated successfully');
      } else {
        await noticeAPI.create(payload);
        notify('success', 'Notice published successfully');
      }
      setShowModal(false);
      fetchNotices();
    } catch (error) {
      console.error('Error saving notice:', error);
      notify('error', error.response?.data?.message || 'Error saving notice');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await noticeAPI.delete(id);
      if (selectedNotice?.id === id) setSelectedNotice(null);
      notify('success', 'Notice deleted');
      fetchNotices();
    } catch (error) {
      notify('error', error.response?.data?.message || 'Error deleting notice');
    }
  };

  const handleClosePoll = async (notice) => {
    try {
      await noticeAPI.closePoll(notice.id);
      notify('success', 'Poll closed');
      fetchNotices();
      const refreshed = await noticeAPI.getById(notice.id, { force: true });
      setSelectedNotice(refreshed.data);
    } catch (error) {
      notify('error', error.response?.data?.message || 'Could not close poll');
    }
  };

  const reportElement = (notice) => {
    const element = document.createElement('section');
    const poll = notice.poll;
    element.style.cssText = 'width:760px;padding:30px;font-family:Arial,sans-serif;color:#122033;background:#fff;';
    element.innerHTML = `
      <h1 style="margin:0 0 8px;font-size:24px;">${t('notices.pollReport')}</h1>
      <p style="margin:0 0 24px;color:#687588;">${notice.title}</p>
      <h2 style="font-size:16px;">${poll?.question || 'No poll question'}</h2>
      <p><strong>${t('notices.totalEligible')}:</strong> ${poll?.results?.total_eligible || 0}</p>
      <p><strong>${t('notices.votesCast')}:</strong> ${poll?.results?.votes_cast || 0}</p>
      <p><strong>${t('notices.participation')}:</strong> ${poll?.results?.participation_percent || 0}%</p>
      <p><strong>${t('notices.winningOption')}:</strong> ${poll?.results?.winning_option || '-'}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:18px;">
        <thead><tr><th style="text-align:left;border-bottom:1px solid #ddd;padding:8px;">Option</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:8px;">Votes</th><th style="text-align:right;border-bottom:1px solid #ddd;padding:8px;">%</th></tr></thead>
        <tbody>${(poll?.results?.options || []).map((option) => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${option.option_text}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${option.votes}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${option.percent}%</td></tr>`).join('')}</tbody>
      </table>`;
    return element;
  };

  const exportPdf = async (notice) => {
    const element = reportElement(notice);
    document.body.appendChild(element);
    try {
      await html2pdf().set({ margin: 8, filename: `Poll_Report_${notice.id}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(element).save();
    } finally {
      element.remove();
    }
  };

  const printReport = (notice) => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return notify('error', 'Popup blocked');
    win.document.write(`<html><body>${reportElement(notice).outerHTML}<script>window.print();<\/script></body></html>`);
    win.document.close();
  };

  const kpis = useMemo(() => [
    [t('notices.totalNotices'), stats.total_notices || 0, Megaphone, ''],
    [t('notices.noticesWithPolls'), stats.notices_with_polls || 0, Radio, 'blue'],
    [t('notices.activePolls'), stats.active_polls || 0, CheckCircle2, 'green'],
    [t('notices.closedPolls'), stats.closed_polls || 0, XCircle, 'red'],
    [t('notices.totalVotes'), stats.total_votes || 0, BarChart3, 'orange'],
    [t('notices.participation'), `${stats.participation_percent || 0}%`, FileText, 'blue']
  ], [stats, t]);

  const pollToggleOptions = useMemo(() => [
    ['anonymous', t('notices.anonymousVoting')],
    ['allow_vote_change', t('notices.allowVoteChange')],
    ['show_results_before_end', t('notices.showResultsBeforeEnd')],
    ['mandatory', t('notices.mandatoryVoting')]
  ], [t]);

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div><h1>{t('notices.title')}</h1><p>{t('notices.subtitle')}</p></div>
        <button className="portal-primary-btn" onClick={openCreate}><Plus size={17} /> {t('notices.createNotice')}</button>
      </div>

      {message.text && <div className={message.type === 'success' ? 'settings-success' : 'settings-error'}>{message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{message.text}</div>}

      <div className="portal-kpis notice-kpis">
        {kpis.map(([label, value, Icon, color]) => (
          <div className={`portal-kpi ${color}`} key={label}>
            <span>{label}</span><strong>{value}</strong><small>{t('notices.noticeBoard')}</small><div className="portal-kpi-icon"><Icon size={16} /></div>
          </div>
        ))}
      </div>

      <div className="notice-filter-bar">
        {filters.map(([key, label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}
      </div>

      {loading ? <CardSkeleton count={4} /> : <div className="portal-notice-grid">
        {notices.map((notice) => (
          <article key={notice.id} className="portal-notice-card notice-card">
            <div className="portal-notice-icon"><Megaphone size={18} /></div>
            <div className="portal-notice-content">
              <div className="notice-card-head">
                <h3>{notice.title}</h3>
                <span className={`notice-poll-chip ${notice.poll_status?.toLowerCase().replace(/\s+/g, '-')}`}>{notice.poll_status || t('notices.noPoll')}</span>
              </div>
              <p>{notice.description}</p>
              {notice.poll && <small className="notice-poll-question">{t('notices.poll')}: {notice.poll.question}</small>}
              <span>{fullDate(notice.created_at)}</span>
              <div className="portal-row-actions">
                <button onClick={() => setSelectedNotice(notice)}><Eye size={13} /> {t('notices.details')}</button>
                <button onClick={() => openEdit(notice)}><Edit3 size={13} /> {t('notices.edit')}</button>
                {notice.poll && notice.poll_status !== 'Poll Closed' && <button onClick={() => handleClosePoll(notice)}><XCircle size={13} /> {t('notices.closePoll')}</button>}
                {notice.poll?.results && <button onClick={() => exportPdf(notice)}><Download size={13} /> {t('notices.exportPdf')}</button>}
                {notice.poll?.results && <button onClick={() => printReport(notice)}><Printer size={13} /> {t('notices.print')}</button>}
                <button className="danger" onClick={() => handleDelete(notice.id)}><Trash2 size={13} /> {t('notices.delete')}</button>
              </div>
            </div>
          </article>
        ))}
      </div>}
      {!loading && !notices.length && <section className="portal-panel"><div className="portal-empty">{t('notices.noNotices')}</div></section>}

      {selectedNotice && (
        <div className="portal-modal-backdrop" onMouseDown={() => setSelectedNotice(null)}>
          <div className="portal-modal notice-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head"><div><h3>{selectedNotice.title}</h3><p>{fullDate(selectedNotice.created_at)}</p></div><button onClick={() => setSelectedNotice(null)}>×</button></div>
            <div className="notice-detail-body">
              <p>{selectedNotice.description}</p>
              {selectedNotice.poll ? (
                <section className="portal-panel notice-poll-panel">
                  <div className="portal-panel-head"><div><h2>{t('notices.pollReport')}</h2><p>{selectedNotice.poll.status} · {pollTypeLabel(selectedNotice.poll.poll_type)}</p></div></div>
                  <div className="portal-panel-body">
                    <h3>{selectedNotice.poll.question}</h3>
                    <p className="portal-muted">{t('notices.votingPeriod')}: {fullDate(selectedNotice.poll.start_at)} {t('notices.to')} {fullDate(selectedNotice.poll.end_at)}</p>
                    <ResultsView poll={selectedNotice.poll} showVoters={!selectedNotice.poll.anonymous} />
                  </div>
                </section>
              ) : <div className="portal-empty">{t('notices.noPollAttached')}</div>}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowModal(false)}>
          <div className="portal-modal notice-form-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head"><div><h3>{editingNotice ? t('notices.editNotice') : t('notices.createNotice')}</h3><p>{t('notices.attachPollHint')}</p></div><button onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit} className="portal-form notice-pro-form">
              <label className="portal-field-full"><span>{t('notices.noticeTitle')}</span><input name="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t('notices.noticeTitlePlaceholder')} required /></label>
              <label className="portal-field-full"><span>{t('notices.description')}</span><textarea name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="4" required /></label>
              <label className="notice-toggle notice-poll-switch portal-field-full">
                <input type="checkbox" checked={formData.poll.enabled} onChange={(e) => setPollEnabled(e.target.checked)} />
                <span>
                  <strong>{t('notices.enablePoll')}</strong>
                  <small>{t('notices.enablePollSubtitle')}</small>
                </span>
              </label>

              {formData.poll.enabled && (
                <>
                  <label className="portal-field-full"><span>{t('notices.pollQuestion')}</span><input value={formData.poll.question} onChange={(e) => updatePoll({ question: e.target.value })} required /></label>
                  <label><span>{t('notices.pollType')}</span><select value={formData.poll.poll_type} onChange={(e) => handlePollType(e.target.value)}><option value="yes_no">Yes / No</option><option value="single_choice">Single Choice</option><option value="multiple_choice">Multiple Choice</option></select></label>
                  <label><span>{t('notices.votingStart')}</span><input type="datetime-local" value={formData.poll.start_at} onChange={(e) => updatePoll({ start_at: e.target.value })} required /></label>
                  <label><span>{t('notices.votingEnd')}</span><input type="datetime-local" value={formData.poll.end_at} onChange={(e) => updatePoll({ end_at: e.target.value })} required /></label>
                  <div className="portal-field-full notice-options-editor">
                    <span>{t('notices.pollOptions')}</span>
                    {formData.poll.options.map((option, index) => (
                      <div key={index}>
                        <input value={option} onChange={(e) => handleOption(index, e.target.value)} disabled={formData.poll.poll_type === 'yes_no'} required />
                        {formData.poll.poll_type !== 'yes_no' && <button type="button" className="portal-icon-danger" onClick={() => removeOption(index)}><Trash2 size={12} /></button>}
                      </div>
                    ))}
                    {formData.poll.poll_type !== 'yes_no' && formData.poll.options.length < 10 && <button type="button" className="portal-light-btn" onClick={addOption}>{t('notices.addOption')}</button>}
                  </div>
                  {pollToggleOptions.map(([key, label]) => (
                    <label className="notice-toggle" key={key}><input type="checkbox" checked={formData.poll[key]} onChange={(e) => updatePoll({ [key]: e.target.checked })} /> <span>{label}</span></label>
                  ))}
                </>
              )}

              <div className="portal-form-actions"><button type="button" className="portal-light-btn" onClick={() => setShowModal(false)}>{t('notices.cancel')}</button><button className="portal-primary-btn">{editingNotice ? t('notices.updateNotice') : t('notices.publishNotice')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notices;
