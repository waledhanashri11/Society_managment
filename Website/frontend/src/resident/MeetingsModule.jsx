import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar, CalendarDays, CheckCircle2, Clock, DollarSign, Eye,
  FileText, MapPin, Printer, QrCode, Send, X
} from 'lucide-react';
import { meetingAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const ResidentMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingDetail, setMeetingDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQrScanModal, setShowQrScanModal] = useState(false);
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, fRes] = await Promise.all([
        meetingAPI.getAll(),
        meetingAPI.getFines()
      ]);
      setMeetings(mRes.data || []);
      setFines(fRes.data || []);
    } catch (err) {
      console.error('Failed to load resident meeting data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDetail = async (m) => {
    setSelectedMeeting(m);
    try {
      const [detRes, comRes] = await Promise.all([
        meetingAPI.getById(m.id),
        meetingAPI.getComments(m.id)
      ]);
      setMeetingDetail(detRes.data);
      setComments(comRes.data || []);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to load meeting details.');
    }
  };

  const handleSelfMarkAttendance = async (m) => {
    setSelectedMeeting(m);
    setShowQrScanModal(true);
  };

  const submitSelfAttendance = async (e) => {
    e.preventDefault();
    try {
      await meetingAPI.selfMarkAttendance(selectedMeeting.id, { qr_code_token: qrTokenInput.trim() });
      alert('Attendance marked successfully as Present!');
      setShowQrScanModal(false);
      setQrTokenInput('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const handlePayFine = async (fineId) => {
    if (!window.confirm('Proceed to pay this absence fine?')) return;
    try {
      await meetingAPI.payFine(fineId);
      alert('Meeting absence fine paid successfully!');
      loadData();
    } catch (err) {
      alert('Failed to pay fine');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await meetingAPI.addComment(selectedMeeting.id, { comment_text: newComment });
      setNewComment('');
      const { data } = await meetingAPI.getComments(selectedMeeting.id);
      setComments(data || []);
    } catch (err) {
      alert('Failed to post comment');
    }
  };

  const upcomingMeetings = meetings.filter(m => m.status !== 'Completed' && m.status !== 'Cancelled');
  const pastMeetings = meetings.filter(m => m.status === 'Completed' || m.status === 'Cancelled');

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>Society Meetings</h1>
          <p>View upcoming society meetings, agendas, and minutes of meeting (MoM).</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={activeTab === 'upcoming' ? 'portal-primary-btn' : 'portal-light-btn'}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Meetings ({upcomingMeetings.length})
        </button>
        <button
          className={activeTab === 'past' ? 'portal-primary-btn' : 'portal-light-btn'}
          onClick={() => setActiveTab('past')}
        >
          Completed Meetings & MoM ({pastMeetings.length})
        </button>
        <button
          className={activeTab === 'fines' ? 'portal-primary-btn' : 'portal-light-btn'}
          onClick={() => setActiveTab('fines')}
        >
          My Absence Fines ({fines.length})
        </button>
      </div>

      {/* UPCOMING MEETINGS */}
      {activeTab === 'upcoming' && (
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head">
            <div>
              <h2>Upcoming Society Meetings</h2>
              <p>Schedule of upcoming general body and committee meetings.</p>
            </div>
          </div>
          <div className="portal-table-wrap">
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : (
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>Meeting Title</th>
                    <th>Type</th>
                    <th>Date & Time</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMeetings.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.title}</strong>
                        {m.is_compulsory && <br />}
                        {m.is_compulsory && <small className="portal-status overdue" style={{ fontSize: '9px', padding: '1px 5px' }}>Compulsory (Fine ₹{m.fine_amount})</small>}
                      </td>
                      <td>{m.meeting_type}</td>
                      <td>
                        <div>{new Date(m.meeting_date).toLocaleDateString()}</div>
                        <small className="portal-muted-text">{m.start_time} - {m.end_time}</small>
                      </td>
                      <td>{m.venue}</td>
                      <td>
                        <span className="portal-status pending">
                          Upcoming
                        </span>
                      </td>
                      <td>
                        <div className="portal-row-actions">
                          <button onClick={() => handleOpenDetail(m)} title="View Details"><Eye size={14} /> Details & Q&A</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !upcomingMeetings.length && <div className="portal-empty">No upcoming society meetings scheduled at this time.</div>}
          </div>
        </section>
      )}

      {/* COMPLETED / PAST MEETINGS & MOM */}
      {activeTab === 'past' && (
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head">
            <div>
              <h2>Completed Meetings & Minutes of Meeting (MoM)</h2>
              <p>Review past meeting discussions, approved resolutions, decisions and official MoM reports.</p>
            </div>
          </div>
          <div className="portal-table-wrap">
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : (
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>Meeting Title</th>
                    <th>Type</th>
                    <th>Date & Time</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pastMeetings.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.title}</strong>
                      </td>
                      <td>{m.meeting_type}</td>
                      <td>
                        <div>{new Date(m.meeting_date).toLocaleDateString()}</div>
                        <small className="portal-muted-text">{m.start_time} - {m.end_time}</small>
                      </td>
                      <td>{m.venue}</td>
                      <td>
                        <span className="portal-status resolved">
                          Completed
                        </span>
                      </td>
                      <td>
                        <div className="portal-row-actions">
                          <button className="portal-primary-btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleOpenDetail(m)} title="View Minutes of Meeting">
                            <FileText size={13} /> View MoM Report & Decisions
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !pastMeetings.length && <div className="portal-empty">No completed meetings recorded yet.</div>}
          </div>
        </section>
      )}



      {/* FINES TAB */}
      {activeTab === 'fines' && (
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head">
            <div>
              <h2>Absence Fines</h2>
              <p>Fines for compulsory society meetings missed without prior approval.</p>
            </div>
          </div>
          <div className="portal-table-wrap">
            {loading ? (
              <TableSkeleton rows={4} columns={6} />
            ) : (
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>Meeting</th>
                    <th>Reason</th>
                    <th>Fine Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fines.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.meeting_title}</strong></td>
                      <td>{f.reason}</td>
                      <td><strong>₹{f.amount}</strong></td>
                      <td>{new Date(f.due_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`portal-status ${f.status === 'Paid' ? 'resolved' : f.status === 'Waived' ? 'in_progress' : 'overdue'}`}>
                          {f.status}
                        </span>
                      </td>
                      <td>
                        {f.status === 'Pending' && (
                          <button className="portal-primary-btn" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={() => handlePayFine(f.id)}>
                            Pay Fine
                          </button>
                        )}
                        {f.status === 'Paid' && <small className="portal-muted-text">Paid on {new Date(f.paid_at).toLocaleDateString()}</small>}
                        {f.status === 'Waived' && <small className="portal-muted-text">{f.waived_reason}</small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !fines.length && <div className="portal-empty">No absence fines recorded on your account.</div>}
          </div>
        </section>
      )}

      {/* QR ATTENDANCE MODAL */}
      {showQrScanModal && selectedMeeting && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowQrScanModal(false)}>
          <div className="portal-modal" style={{ maxWidth: '400px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Mark Attendance</h3>
                <p>{selectedMeeting.title}</p>
              </div>
              <button onClick={() => setShowQrScanModal(false)}>×</button>
            </div>
            <form onSubmit={submitSelfAttendance} className="portal-form">
              <label className="portal-field-full">
                <span>QR Code Passcode Token</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. MEET-XXXXXX"
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                />
              </label>
              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setShowQrScanModal(false)}>Cancel</button>
                <button type="submit" className="portal-primary-btn">Confirm Present</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL & Published MoM View */}
      {showDetailModal && meetingDetail && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowDetailModal(false)}>
          <div className="portal-modal" style={{ maxWidth: '640px', maxHeight: '90vh' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{meetingDetail.title}</h3>
                <p>{meetingDetail.meeting_type} · {new Date(meetingDetail.meeting_date).toLocaleDateString()}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {meetingDetail.report?.is_published && (
                  <button
                    type="button"
                    className="portal-light-btn"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => {
                      const printWin = window.open('', '_blank');
                      const rep = meetingDetail.report;
                      printWin.document.write(`
                        <html><head><title>MoM Report - ${meetingDetail.title}</title>
                        <style>body{font-family:sans-serif;padding:30px;color:#1e293b}h1{font-size:22px}h3{border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin-top:20px}.box{background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:12px}</style>
                        </head><body>
                        <h1>${meetingDetail.title}</h1>
                        <p><strong>Date & Time:</strong> ${new Date(meetingDetail.meeting_date).toLocaleDateString()} (${meetingDetail.start_time} - ${meetingDetail.end_time})<br/>
                        <strong>Venue:</strong> ${meetingDetail.venue}<br/>
                        <strong>Type:</strong> ${meetingDetail.meeting_type}</p>
                        ${rep.prepared_by ? `<p><strong>Prepared By:</strong> ${rep.prepared_by}</p>` : ''}
                        <h3>Agenda & Summary</h3><p>${rep.summary || '-'}</p>
                        <h3>Discussion Summary</h3><p>${rep.discussion || '-'}</p>
                        <h3>Decisions Taken & Resolutions</h3><p>${rep.decisions_taken || '-'}</p>
                        ${meetingDetail.actions && meetingDetail.actions.length ? `
                          <h3>Action Items</h3>
                          <ul>${meetingDetail.actions.map(a => `<li><strong>${a.action_text}</strong> (Assigned to: ${a.responsible_person || a.assignee_name || 'Unassigned'}, Due: ${a.due_date ? new Date(a.due_date).toLocaleDateString() : '-'})</li>`).join('')}</ul>
                        ` : ''}
                        <script>window.print();</script></body></html>
                      `);
                      printWin.document.close();
                    }}
                  >
                    <Printer size={13} /> Print MoM
                  </button>
                )}
                <button onClick={() => setShowDetailModal(false)}>×</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
              <div className="portal-detail-grid" style={{ padding: '16px' }}>
                <span>Date & Time</span><strong>{new Date(meetingDetail.meeting_date).toLocaleDateString()} ({meetingDetail.start_time} - {meetingDetail.end_time})</strong>
                <span>Venue</span><strong>{meetingDetail.venue}</strong>
                <span>Attendance Status</span>
                <div>
                  <span className={`portal-status ${meetingDetail.my_attendance === 'Present' ? 'resolved' : meetingDetail.my_attendance === 'Late' ? 'pending' : meetingDetail.my_attendance === 'Excused' ? 'in_progress' : 'rejected'}`}>
                    {meetingDetail.my_attendance || 'Not Marked'}
                  </span>
                </div>
              </div>

              {/* Personal Fine Notification Callout for Resident */}
              {meetingDetail.my_fine && (
                <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '11px' }}>
                  <strong>⚠️ Absence Fine Notice:</strong> A fine of ₹{meetingDetail.my_fine.amount} has been issued for missing this compulsory meeting. Status: <strong>{meetingDetail.my_fine.status}</strong>.
                </div>
              )}

              {/* Agendas */}
              {meetingDetail.agendas && meetingDetail.agendas.length > 0 && (
                <div style={{ padding: '16px', borderTop: '1px solid var(--portal-line)' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '12px' }}>Agenda Items</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px' }}>
                    {meetingDetail.agendas.map((ag, i) => (
                      <li key={i}>{ag.item_text}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Published MoM Report */}
              {meetingDetail.report && meetingDetail.report.is_published ? (
                <div style={{ padding: '16px', borderTop: '1px solid var(--portal-line)', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: '#1e293b' }}>Minutes of Meeting (MoM)</h4>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: '#e8f8ef', color: '#05783b', fontWeight: 'bold' }}>
                      Official Published MoM
                    </span>
                  </div>
                  {meetingDetail.report.prepared_by && <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#64748b' }}><strong>Prepared By:</strong> {meetingDetail.report.prepared_by}</p>}
                  <p style={{ margin: '0 0 6px', fontSize: '11px' }}><strong>Executive Summary:</strong> {meetingDetail.report.summary}</p>
                  {meetingDetail.report.discussion && (
                    <p style={{ margin: '0 0 6px', fontSize: '11px' }}><strong>Discussion Summary:</strong> {meetingDetail.report.discussion}</p>
                  )}
                  <p style={{ margin: '0 0 6px', fontSize: '11px' }}><strong>Decisions Taken & Resolutions:</strong> {meetingDetail.report.decisions_taken}</p>

                  {/* Documents / Attachments */}
                  {meetingDetail.documents && meetingDetail.documents.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <strong style={{ fontSize: '11px', color: '#334155' }}>Attachments:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {meetingDetail.documents.map((doc, idx) => (
                          <a key={idx} href={doc.file_path} target="_blank" rel="noreferrer" style={{ fontSize: '10px', background: '#fff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', textDecoration: 'none', color: '#1d4ed8' }}>
                            📄 {doc.file_name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '16px', borderTop: '1px solid var(--portal-line)', fontStyle: 'italic', fontSize: '11px', color: '#64748b' }}>
                  Minutes of Meeting (MoM) report has not been published yet by administration.
                </div>
              )}

              {/* Resident Q&A Comments */}
              <div style={{ padding: '16px', borderTop: '1px solid var(--portal-line)' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '12px' }}>Resident Discussion & Q&A</h4>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'grid', gap: '8px', marginBottom: '12px' }}>
                  {comments.length === 0 ? (
                    <div className="portal-muted-text" style={{ fontSize: '11px' }}>No comments posted yet.</div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} style={{ background: '#f1f5f9', padding: '8px 10px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--portal-muted)' }}>
                          <strong>{c.user_name} ({c.wing ? `${c.wing}-${c.flat_no}` : c.user_role})</strong>
                          <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--portal-text)' }}>{c.comment_text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Ask a question or post comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    style={{ flex: 1, border: '1px solid var(--portal-line)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}
                  />
                  <button type="submit" className="portal-primary-btn" style={{ padding: '8px 12px' }}>
                    <Send size={14} /> Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentMeetings;
