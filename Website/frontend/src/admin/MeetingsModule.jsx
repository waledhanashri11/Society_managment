/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays, CheckCircle2, Clock, DollarSign, Edit3, Eye,
  FileText, Plus, Printer, QrCode, Search, Trash2, UserCheck, Users, X
} from 'lucide-react';
import { meetingAPI } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/Skeletons';

const money = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

const AdminMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingDetail, setMeetingDetail] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);

  // Create/Edit Form
  const [formData, setFormData] = useState({
    title: '',
    meeting_type: 'Committee Meeting',
    meeting_date: '',
    start_time: '10:00',
    end_time: '11:30',
    venue: 'Club House',
    description: '',
    is_compulsory: false,
    fine_amount: 100,
    fine_due_days: 7
  });

  // Report Form
  const [reportData, setReportData] = useState({
    summary: '',
    discussion: '',
    decisions_taken: '',
    remarks: '',
    prepared_by: '',
    is_published: false,
    action_items: []
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, aRes, fRes] = await Promise.all([
        meetingAPI.getAll({ title: search, meeting_type: filterType, status: filterStatus }),
        meetingAPI.getAnalytics(),
        meetingAPI.getFines()
      ]);
      setMeetings(mRes.data || []);
      setAnalytics(aRes.data || null);
      setFines(fRes.data || []);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDetail = async (m) => {
    setSelectedMeeting(m);
    try {
      const { data } = await meetingAPI.getById(m.id);
      setMeetingDetail(data);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to load meeting details.');
    }
  };

  const handleOpenAttendance = async (m) => {
    setSelectedMeeting(m);
    try {
      const { data } = await meetingAPI.getAttendance(m.id);
      setAttendanceList(data);
      setShowAttendanceModal(true);
    } catch (err) {
      alert('Failed to load attendance roster.');
    }
  };

  const handleToggleAttendance = (residentId, currentStatus) => {
    const nextMap = { Present: 'Absent', Absent: 'Late', Late: 'Excused', Excused: 'Present' };
    const next = nextMap[currentStatus] || 'Present';
    setAttendanceList(prev => prev.map(item => item.resident_id === residentId ? { ...item, status: next } : item));
  };

  const handleSaveAttendance = async () => {
    try {
      await meetingAPI.saveAttendance(selectedMeeting.id, { attendance: attendanceList });
      alert('Attendance saved successfully');
      setShowAttendanceModal(false);
      loadData();
    } catch (err) {
      alert('Error saving attendance');
    }
  };

  const handleMarkAllPresent = async () => {
    try {
      await meetingAPI.markAllPresent(selectedMeeting.id);
      const { data } = await meetingAPI.getAttendance(selectedMeeting.id);
      setAttendanceList(data);
    } catch (err) {
      alert('Failed to mark all present');
    }
  };

  const handleSaveMeeting = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await meetingAPI.update(formData.id, formData);
        alert('Meeting updated!');
      } else {
        await meetingAPI.create(formData);
        alert('Meeting scheduled!');
      }
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      alert('Failed to save meeting');
    }
  };

  const handleOpenReportModal = async (m) => {
    setSelectedMeeting(m);
    try {
      const { data } = await meetingAPI.getById(m.id);
      setMeetingDetail(data);
      const existing = data.report || {};
      setReportData({
        summary: existing.summary || '',
        discussion: existing.discussion || '',
        decisions_taken: existing.decisions_taken || '',
        remarks: existing.remarks || '',
        prepared_by: existing.prepared_by || '',
        is_published: existing.is_published || false,
        action_items: data.actions && data.actions.length ? data.actions.map(a => ({
          action_text: a.action_text || '',
          responsible_person: a.responsible_person || a.assignee_name || '',
          due_date: a.due_date ? a.due_date.split('T')[0] : ''
        })) : [{ action_text: '', responsible_person: '', due_date: '' }]
      });
      setShowReportModal(true);
    } catch (err) {
      alert('Failed to load meeting report');
    }
  };

  const handleSaveReport = async (publish = false) => {
    try {
      await meetingAPI.saveReport(selectedMeeting.id, { ...reportData, is_published: publish });
      alert(publish ? 'Meeting Report (MoM) Published!' : 'Meeting Report Draft Saved');
      setShowReportModal(false);
      loadData();
    } catch (err) {
      alert('Failed to save meeting report');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this meeting?')) return;
    try {
      await meetingAPI.delete(id);
      loadData();
    } catch (err) {
      alert('Failed to delete meeting');
    }
  };

  const handleWaiveFine = async (fineId) => {
    const reason = window.prompt('Reason for waiving fine:');
    if (!reason) return;
    try {
      await meetingAPI.waiveFine(fineId, { waived_reason: reason });
      loadData();
    } catch (err) {
      alert('Failed to waive fine');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      meeting_type: 'Committee Meeting',
      meeting_date: '',
      start_time: '10:00',
      end_time: '11:30',
      venue: 'Club House',
      description: '',
      is_compulsory: false,
      fine_amount: 100,
      fine_due_days: 7
    });
  };

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>Meetings Management</h1>
          <p>Schedule society meetings, record attendance, and publish official Minutes of Meeting (MoM).</p>
        </div>
        <button className="portal-primary-btn" onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <Plus size={16} /> Schedule Meeting
        </button>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="portal-kpis">
          <div className="portal-kpi">
            <span>Total Meetings</span>
            <strong>{analytics.totalMeetings}</strong>
            <small>Recorded in system</small>
            <div className="portal-kpi-icon"><CalendarDays size={18} /></div>
          </div>
          <div className="portal-kpi green">
            <span>Avg Attendance Rate</span>
            <strong>{analytics.attendancePercentage}%</strong>
            <small>Resident participation</small>
            <div className="portal-kpi-icon"><UserCheck size={18} /></div>
          </div>
          <div className="portal-kpi orange">
            <span>Upcoming Meetings</span>
            <strong>{analytics.upcomingMeetings}</strong>
            <small>Scheduled ahead</small>
            <div className="portal-kpi-icon"><Clock size={18} /></div>
          </div>
          <div className="portal-kpi red">
            <span>Absence Fines</span>
            <strong>{money(analytics.fines?.pending_fines)}</strong>
            <small>Compulsory absence fines</small>
            <div className="portal-kpi-icon"><DollarSign size={18} /></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={activeTab === 'list' ? 'portal-primary-btn' : 'portal-light-btn'}
          onClick={() => setActiveTab('list')}
        >
          Meetings Directory
        </button>
        <button
          className={activeTab === 'fines' ? 'portal-primary-btn' : 'portal-light-btn'}
          onClick={() => setActiveTab('fines')}
        >
          Compulsory Absence Fines ({fines.length})
        </button>
      </div>

      {/* Meetings List */}
      {activeTab === 'list' && (
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head">
            <div>
              <h2>Society Meetings Directory</h2>
              <p>Search, filter and manage society & committee meetings.</p>
            </div>
          </div>

          <div className="portal-form-grid" style={{ gridTemplateColumns: '1fr 220px' }}>
            <label>
              <span>Search</span>
              <input
                type="text"
                placeholder="Search meetings by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              <span>Meeting Type</span>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">All Meeting Types</option>
                <option value="Annual General Meeting (AGM)">AGM</option>
                <option value="Committee Meeting">Committee Meeting</option>
                <option value="Emergency Meeting">Emergency Meeting</option>
                <option value="Budget Meeting">Budget Meeting</option>
              </select>
            </label>
          </div>

          <div className="portal-table-wrap">
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : (
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>MEETING DETAILS</th>
                    <th>TYPE</th>
                    <th>DATE & TIME</th>
                    <th>VENUE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.title}</strong>
                        {m.is_compulsory && (
                          <div>
                            <small className="portal-status overdue" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              Compulsory ({money(m.fine_amount)})
                            </small>
                          </div>
                        )}
                      </td>
                      <td>{m.meeting_type}</td>
                      <td>
                        <div>{new Date(m.meeting_date).toLocaleDateString()}</div>
                        <small className="portal-muted-text">{m.start_time} - {m.end_time}</small>
                      </td>
                      <td>{m.venue}</td>
                      <td>
                        <span className={`portal-status ${m.status === 'Completed' ? 'resolved' : 'pending'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td>
                        <div className="portal-row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="portal-light-btn" onClick={() => handleOpenDetail(m)}>View</button>
                          <button type="button" className="portal-light-btn" onClick={() => handleOpenAttendance(m)}>Attendance</button>
                          <button type="button" className="portal-primary-btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleOpenReportModal(m)}>MoM Report</button>
                          <button type="button" className="portal-light-btn" style={{ color: '#ef4444' }} onClick={() => handleDelete(m.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !meetings.length && <div className="portal-empty">No meetings found.</div>}
          </div>
        </section>
      )}

      {/* Compulsory Fines List */}
      {activeTab === 'fines' && (
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head">
            <div>
              <h2>Compulsory Absence Fines</h2>
              <p>Fines recorded for residents absent during mandatory meetings.</p>
            </div>
          </div>
          <div className="portal-table-wrap">
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : (
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>RESIDENT & FLAT</th>
                    <th>MEETING TITLE</th>
                    <th>FINE AMOUNT</th>
                    <th>DUE DATE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {fines.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.resident_name}</strong>
                        <div className="portal-muted-text">Flat {f.flat_no} · Wing {f.wing}</div>
                      </td>
                      <td>{f.meeting_title}</td>
                      <td><strong style={{ color: '#dc2626' }}>{money(f.amount)}</strong></td>
                      <td>{new Date(f.due_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`portal-status ${f.status === 'Paid' ? 'resolved' : 'overdue'}`}>
                          {f.status}
                        </span>
                      </td>
                      <td>
                        <div className="portal-row-actions" style={{ justifyContent: 'flex-end' }}>
                          {f.status === 'Pending' && (
                            <button type="button" className="portal-light-btn" onClick={() => handleWaiveFine(f.id)}>
                              Waive Fine
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !fines.length && <div className="portal-empty">No absence fines recorded.</div>}
          </div>
        </section>
      )}

      {/* CREATE / EDIT MEETING MODAL */}
      {showCreateModal && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowCreateModal(false)}>
          <div className="portal-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{formData.id ? 'Edit Meeting' : 'Schedule Meeting'}</h3>
                <p>Provide details for the meeting.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveMeeting} className="portal-form">
              <label className="portal-field-full">
                <span>Meeting Title</span>
                <input type="text" required placeholder="e.g. Annual General Body Meeting 2026" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </label>

              <label>
                <span>Meeting Type</span>
                <select value={formData.meeting_type} onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}>
                  <option value="Annual General Meeting (AGM)">AGM</option>
                  <option value="Committee Meeting">Committee Meeting</option>
                  <option value="Emergency Meeting">Emergency Meeting</option>
                  <option value="Budget Meeting">Budget Meeting</option>
                </select>
              </label>

              <label>
                <span>Meeting Date</span>
                <input type="date" required value={formData.meeting_date} onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })} />
              </label>

              <label>
                <span>Start Time</span>
                <input type="time" required value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
              </label>

              <label>
                <span>End Time</span>
                <input type="time" required value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
              </label>

              <label className="portal-field-full">
                <span>Venue / Location</span>
                <input type="text" required placeholder="e.g. Society Clubhouse" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} />
              </label>

              <label className="portal-field-full" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={formData.is_compulsory} onChange={(e) => setFormData({ ...formData, is_compulsory: e.target.checked })} style={{ width: 'auto' }} />
                <span>Compulsory Meeting (Fine absent residents)</span>
              </label>

              {formData.is_compulsory && (
                <>
                  <label>
                    <span>Fine Amount (₹)</span>
                    <input type="number" value={formData.fine_amount} onChange={(e) => setFormData({ ...formData, fine_amount: Number(e.target.value) })} />
                  </label>
                  <label>
                    <span>Due Days</span>
                    <input type="number" value={formData.fine_due_days} onChange={(e) => setFormData({ ...formData, fine_due_days: Number(e.target.value) })} />
                  </label>
                </>
              )}

              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="portal-primary-btn">Save Meeting</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTENDANCE ROSTER MODAL */}
      {showAttendanceModal && selectedMeeting && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowAttendanceModal(false)}>
          <div className="portal-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Attendance Roster</h3>
                <p>{selectedMeeting.title}</p>
              </div>
              <button onClick={() => setShowAttendanceModal(false)}>×</button>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button type="button" className="portal-light-btn" onClick={handleMarkAllPresent}>Mark All Present</button>
              </div>
              <div className="portal-table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="portal-data-table">
                  <thead>
                    <tr>
                      <th>RESIDENT & FLAT</th>
                      <th style={{ textAlign: 'right' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceList.map((att) => (
                      <tr key={att.resident_id}>
                        <td>
                          <strong>{att.resident_name}</strong>
                          <div className="portal-muted-text">Flat {att.flat_no} · Wing {att.wing}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(att.resident_id, att.status)}
                            className={`portal-status ${att.status === 'Present' ? 'resolved' : 'rejected'}`}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {att.status}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="portal-form-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="portal-light-btn" onClick={() => setShowAttendanceModal(false)}>Close</button>
                <button type="button" className="portal-primary-btn" onClick={handleSaveAttendance}>Save Roster</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOM REPORT MODAL */}
      {showReportModal && selectedMeeting && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowReportModal(false)}>
          <div className="portal-modal" style={{ maxWidth: '640px' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Minutes of Meeting (MoM)</h3>
                <p>{selectedMeeting.title}</p>
              </div>
              <button onClick={() => setShowReportModal(false)}>×</button>
            </div>
            <div className="portal-form" style={{ padding: '20px' }}>
              <label className="portal-field-full">
                <span>Executive Summary</span>
                <textarea rows="2" placeholder="Overview..." value={reportData.summary} onChange={(e) => setReportData({ ...reportData, summary: e.target.value })} />
              </label>
              <label className="portal-field-full">
                <span>Discussion Summary</span>
                <textarea rows="3" placeholder="Discussion points..." value={reportData.discussion} onChange={(e) => setReportData({ ...reportData, discussion: e.target.value })} />
              </label>
              <label className="portal-field-full">
                <span>Decisions Taken</span>
                <textarea rows="3" placeholder="Decisions..." value={reportData.decisions_taken} onChange={(e) => setReportData({ ...reportData, decisions_taken: e.target.value })} />
              </label>
              <label className="portal-field-full">
                <span>Internal Remarks (Admin Only)</span>
                <textarea rows="2" placeholder="Internal remarks..." value={reportData.remarks} onChange={(e) => setReportData({ ...reportData, remarks: e.target.value })} />
              </label>
              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => handleSaveReport(false)}>Save Draft</button>
                <button type="button" className="portal-primary-btn" onClick={() => handleSaveReport(true)}>Publish MoM Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && meetingDetail && (
        <div className="portal-modal-backdrop" onMouseDown={() => setShowDetailModal(false)}>
          <div className="portal-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>{meetingDetail.title}</h3>
                <p>{meetingDetail.meeting_type}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="portal-detail-grid" style={{ padding: '16px' }}>
              <span>Date & Time</span><strong>{new Date(meetingDetail.meeting_date).toLocaleDateString()} ({meetingDetail.start_time} - {meetingDetail.end_time})</strong>
              <span>Venue</span><strong>{meetingDetail.venue}</strong>
            </div>
            {meetingDetail.report && (
              <div style={{ padding: '16px', borderTop: '1px solid var(--portal-line)' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '12px' }}>Minutes of Meeting (MoM)</h4>
                <p style={{ margin: '0 0 4px', fontSize: '11px' }}><strong>Summary:</strong> {meetingDetail.report.summary}</p>
                <p style={{ margin: '0 0 4px', fontSize: '11px' }}><strong>Discussion:</strong> {meetingDetail.report.discussion}</p>
                <p style={{ margin: 0, fontSize: '11px' }}><strong>Decisions:</strong> {meetingDetail.report.decisions_taken}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMeetings;

