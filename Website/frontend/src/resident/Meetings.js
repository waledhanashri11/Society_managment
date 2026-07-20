import React, { useEffect, useMemo, useState } from 'react';
import { 
  Calendar, Clock, MapPin, AlertTriangle, Vote, Download,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { meetingAPI } from '../services/api';
import { TableSkeleton } from '../components/Skeletons';

const dateStr = (val) => val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ResidentMeetings = () => {
  const [tab, setTab] = useState('list'); // 'list', 'calendar'
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Search & Filters
  const [searchTitle, setSearchTitle] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Calendar State
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Modal State
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await meetingAPI.getAll({ force: true });
      setMeetings(res.data);
    } catch (err) {
      console.error('Error fetching resident meetings:', err);
      setMessage({ type: 'error', text: 'Failed to load meetings.' });
    } finally {
      setLoading(false);
    }
  };

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleOpenDetails = async (meetingId) => {
    setLoading(true);
    try {
      const res = await meetingAPI.getById(meetingId);
      setSelectedMeeting(res.data);
      setShowDetailsModal(true);
    } catch (err) {
      notify('error', 'Failed to retrieve meeting details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCastVote = async (choice) => {
    if (voting) return;
    setVoting(true);
    try {
      await meetingAPI.castVote(selectedMeeting.id, choice);
      notify('success', 'Your vote has been cast successfully.');
      // Refresh modal data
      const res = await meetingAPI.getById(selectedMeeting.id);
      setSelectedMeeting(res.data);
      loadData();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to register your vote.');
    } finally {
      setVoting(false);
    }
  };

  // Filter application
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      if (searchTitle && !m.title.toLowerCase().includes(searchTitle.toLowerCase())) return false;
      if (filterType && m.meeting_type !== filterType) return false;
      if (filterStatus && m.status !== filterStatus) return false;
      if (filterPriority && m.priority !== filterPriority) return false;
      if (filterDate && !m.meeting_date.startsWith(filterDate)) return false;
      return true;
    });
  }, [meetings, searchTitle, filterType, filterStatus, filterPriority, filterDate]);

  // Calendar render helpers
  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(calYear, calMonth, 1);
    const endOfMonth = new Date(calYear, calMonth + 1, 0);
    const startDayOfWeek = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ blank: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayMeetings = meetings.filter(m => m.meeting_date && m.meeting_date.startsWith(dStr));
      days.push({ day: i, dateStr: dStr, meetings: dayMeetings });
    }
    return days;
  }, [calMonth, calYear, meetings]);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  // Voting metrics calculation
  const voteMetrics = useMemo(() => {
    if (!selectedMeeting?.vote) return null;
    const v = selectedMeeting.vote;
    const total = Number(v.yes_count) + Number(v.no_count) + Number(v.abstain_count);
    return {
      total,
      yesPct: total > 0 ? Math.round((Number(v.yes_count) / total) * 100) : 0,
      noPct: total > 0 ? Math.round((Number(v.no_count) / total) * 100) : 0,
      abstainPct: total > 0 ? Math.round((Number(v.abstain_count) / total) * 100) : 0
    };
  }, [selectedMeeting]);

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>Society Meetings</h1>
          <p>Browse scheduled general body assemblies, committee panels, download agenda papers, view minutes, and vote on community decisions.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          style={{
            paddingBottom: '8px', paddingLeft: '4px', paddingRight: '4px', fontWeight: '600', fontSize: '14px',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === 'list' ? '2px solid #4f46e5' : '2px solid transparent',
            color: tab === 'list' ? '#4f46e5' : '#64748b'
          }}
          onClick={() => setTab('list')}
        >
          Meetings List
        </button>
        <button
          style={{
            paddingBottom: '8px', paddingLeft: '4px', paddingRight: '4px', fontWeight: '600', fontSize: '14px',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === 'calendar' ? '2px solid #4f46e5' : '2px solid transparent',
            color: tab === 'calendar' ? '#4f46e5' : '#64748b'
          }}
          onClick={() => setTab('calendar')}
        >
          Calendar View
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : tab === 'list' ? (
        <>
          {/* Filters tool */}
          <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', padding: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
              Search Title
              <input type="text" value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} placeholder="Search..." style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
              Meeting Type
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}>
                <option value="">All Types</option>
                <option value="Annual General Meeting (AGM)">AGM</option>
                <option value="Committee Meeting">Committee Meeting</option>
                <option value="Emergency Meeting">Emergency Meeting</option>
                <option value="Budget Meeting">Budget Meeting</option>
                <option value="Special Meeting">Special Meeting</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
              Status
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}>
                <option value="">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
              Priority
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}>
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
              Date
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} />
            </label>
          </div>

          <section className="portal-panel portal-table-card">
            <div className="portal-panel-head"><div><h2>Meeting Register</h2><p>{filteredMeetings.length} meetings found.</p></div></div>
            <div className="portal-table-wrap">
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Venue</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeetings.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.title}</strong><br/><small style={{ color: '#64748b' }}>{m.meeting_type}</small></td>
                      <td>{dateStr(m.meeting_date)}</td>
                      <td>{m.start_time} - {m.end_time}</td>
                      <td>{m.venue}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: m.priority === 'Urgent' ? '#fee2e2' : m.priority === 'High' ? '#ffedd5' : '#f1f5f9',
                          color: m.priority === 'Urgent' ? '#991b1b' : m.priority === 'High' ? '#c2410c' : '#475569'
                        }}>
                          {m.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`portal-status ${m.status === 'Completed' ? 'paid' : m.status === 'Cancelled' ? 'pending' : 'pending'}`} style={{
                          backgroundColor: m.status === 'Completed' ? '#dcfce7' : m.status === 'Cancelled' ? '#fee2e2' : '#e0f2fe',
                          color: m.status === 'Completed' ? '#166534' : m.status === 'Cancelled' ? '#991b1b' : '#0369a1'
                        }}>
                          {m.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => handleOpenDetails(m.id)}
                          style={{
                            padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                            backgroundColor: '#fff', color: '#4f46e5', cursor: 'pointer'
                          }}
                        >
                          View Details & Vote
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredMeetings.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No meetings found matching your criteria.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="portal-panel">
          <div className="portal-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Meeting Calendar</h2>
              <p>Review meeting agenda dates visually.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="portal-light-btn" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
              <strong style={{ minWidth: '120px', textAlign: 'center', fontSize: '16px' }}>
                {new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </strong>
              <button className="portal-light-btn" onClick={handleNextMonth}><ChevronRight size={16} /></button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: '#e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '16px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ backgroundColor: '#f8fafc', padding: '10px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: '#475569' }}>{d}</div>
            ))}
            {calendarDays.map((item, idx) => (
              <div key={idx} style={{ backgroundColor: '#ffffff', minHeight: '100px', padding: '8px', borderTop: '1px solid #e2e8f0', position: 'relative' }}>
                {!item.blank && (
                  <>
                    <strong style={{ fontSize: '13px', color: '#1e293b' }}>{item.day}</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      {item.meetings.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleOpenDetails(m.id)}
                          style={{
                            textAlign: 'left', border: 'none', borderRadius: '4px', padding: '3px 6px', fontSize: '10px', fontWeight: '500', cursor: 'pointer',
                            backgroundColor: m.status === 'Completed' ? '#dcfce7' : m.status === 'Cancelled' ? '#fee2e2' : '#e0f2fe',
                            color: m.status === 'Completed' ? '#166534' : m.status === 'Cancelled' ? '#991b1b' : '#0369a1',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}
                          title={`${m.title} (${m.start_time})`}
                        >
                          {m.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MEETING DETAILS & VOTING MODAL */}
      {showDetailsModal && selectedMeeting && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowDetailsModal(false)}>
          <div className="portal-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-head">
              <div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>{selectedMeeting.meeting_type}</span>
                <h3>{selectedMeeting.title}</h3>
              </div>
              <button onClick={() => setShowDetailsModal(false)}>x</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #edf2f7', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} style={{ color: '#4f46e5' }} /> <span>Date: <strong>{dateStr(selectedMeeting.meeting_date)}</strong></span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} style={{ color: '#4f46e5' }} /> <span>Time: <strong>{selectedMeeting.start_time} - {selectedMeeting.end_time}</strong></span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} style={{ color: '#4f46e5' }} /> <span>Venue: <strong>{selectedMeeting.venue}</strong></span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} style={{ color: '#4f46e5' }} /> <span>Priority: <strong>{selectedMeeting.priority}</strong></span></div>
              </div>

              {/* Attendance tracking details */}
              {selectedMeeting.my_attendance && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0fdf4', padding: '10px 14px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '13px', color: '#166534' }}>
                  <CheckCircle2 size={16} />
                  <span>You were marked <strong>{selectedMeeting.my_attendance}</strong> for this meeting.</span>
                </div>
              )}

              <div>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>Description:</strong>
                <p style={{ marginTop: '6px', fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>{selectedMeeting.description || 'No description provided.'}</p>
              </div>

              {/* Agenda items list */}
              <div>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>Agenda Items:</strong>
                {selectedMeeting.agendas && selectedMeeting.agendas.length > 0 ? (
                  <ol style={{ marginTop: '6px', paddingLeft: '20px', fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
                    {selectedMeeting.agendas.map(a => <li key={a.id}>{a.item_text}</li>)}
                  </ol>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>No agendas defined.</p>
                )}
              </div>

              {/* Voting Poll Section */}
              {selectedMeeting.vote && (
                <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '16px' }}>
                  <strong style={{ fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Vote size={17} style={{ color: '#7c3aed' }} /> Active Proposal Voting Poll
                  </strong>
                  
                  <div style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '16px' }}>
                    <p style={{ fontWeight: '600', fontSize: '14px', color: '#581c87', marginBottom: '12px' }}>
                      Question: {selectedMeeting.vote.question}
                    </p>

                    {selectedMeeting.vote.has_voted ? (
                      <div>
                        <span style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                          ✓ You already voted: <strong style={{ textTransform: 'uppercase' }}>{selectedMeeting.vote.my_choice}</strong>. Here are the current results:
                        </span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          {/* YES */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>YES ({selectedMeeting.vote.yes_count})</span><strong>{voteMetrics.yesPct}%</strong></div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${voteMetrics.yesPct}%`, height: '100%', backgroundColor: '#22c55e' }} />
                            </div>
                          </div>
                          {/* NO */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>NO ({selectedMeeting.vote.no_count})</span><strong>{voteMetrics.noPct}%</strong></div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${voteMetrics.noPct}%`, height: '100%', backgroundColor: '#ef4444' }} />
                            </div>
                          </div>
                          {/* ABSTAIN */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>ABSTAIN ({selectedMeeting.vote.abstain_count})</span><strong>{voteMetrics.abstainPct}%</strong></div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${voteMetrics.abstainPct}%`, height: '100%', backgroundColor: '#64748b' }} />
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px' }}>
                            Total votes cast: {voteMetrics.total}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '10px' }}>
                          Please select your vote choice on this proposal. This vote cannot be modified after casting.
                        </span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            disabled={voting}
                            onClick={() => handleCastVote('YES')}
                            style={{ flex: 1, padding: '8px', border: '1px solid #22c55e', borderRadius: '6px', backgroundColor: '#fff', color: '#166534', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                          >
                            YES
                          </button>
                          <button
                            disabled={voting}
                            onClick={() => handleCastVote('NO')}
                            style={{ flex: 1, padding: '8px', border: '1px solid #ef4444', borderRadius: '6px', backgroundColor: '#fff', color: '#991b1b', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                          >
                            NO
                          </button>
                          <button
                            disabled={voting}
                            onClick={() => handleCastVote('ABSTAIN')}
                            style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#475569', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                          >
                            ABSTAIN
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Minutes report display */}
              {selectedMeeting.report && (
                <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '16px' }}>
                  <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block', marginBottom: '8px' }}>Minutes of Meeting (MoM) Summary:</strong>
                  
                  <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#475569' }}>Overview:</span>
                      <p style={{ margin: '4px 0 0', color: '#1e293b' }}>{selectedMeeting.report.summary}</p>
                    </div>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#475569' }}>Discussion Detail:</span>
                      <p style={{ margin: '4px 0 0', color: '#1e293b' }}>{selectedMeeting.report.discussion}</p>
                    </div>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#475569' }}>Decisions Taken:</span>
                      <p style={{ margin: '4px 0 0', color: '#1e293b' }}>{selectedMeeting.report.decisions_taken}</p>
                    </div>
                    {selectedMeeting.report.remarks && (
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#475569' }}>Remarks:</span>
                        <p style={{ margin: '4px 0 0', color: '#1e293b' }}>{selectedMeeting.report.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents download section */}
              {selectedMeeting.documents && selectedMeeting.documents.length > 0 && (
                <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '16px' }}>
                  <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block', marginBottom: '8px' }}>Documents & Attachments:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedMeeting.documents.map(doc => (
                      <a
                        key={doc.id}
                        href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/..${doc.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px',
                          textDecoration: 'none', color: '#4f46e5', fontWeight: '500', fontSize: '13px', backgroundColor: '#fcfcfc'
                        }}
                      >
                        <Download size={14} /> {doc.file_name} ({doc.file_type ? doc.file_type.split('/')[1].toUpperCase() : 'DOC'})
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action items listing */}
              {selectedMeeting.actions && selectedMeeting.actions.length > 0 && (
                <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '16px' }}>
                  <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block', marginBottom: '8px' }}>Follow-up Action Items:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedMeeting.actions.map(act => (
                      <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px' }}>
                        <div>
                          <strong>{act.action_text}</strong>
                          <div style={{ color: '#64748b', marginTop: '2px' }}>Assigned member: {act.assignee_name || 'Unassigned'} · Due date: {dateStr(act.due_date)}</div>
                        </div>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px',
                          backgroundColor: act.status === 'Completed' ? '#dcfce7' : act.status === 'In Progress' ? '#e0f2fe' : '#f1f5f9',
                          color: act.status === 'Completed' ? '#166534' : act.status === 'In Progress' ? '#0369a1' : '#475569'
                        }}>
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="portal-form-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button type="button" className="portal-light-btn" onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentMeetings;
