import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays, Clock, DollarSign,
  Plus, UserCheck
} from 'lucide-react';
import { meetingAPI } from '../services/api';
import { TableSkeleton } from '../components/Skeletons';
import { useTranslation } from 'react-i18next';

const money = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

function AdminMeetings() {
  const { t } = useTranslation();
  const translateMeetingType = (type) => {
    if (type === 'Annual General Meeting (AGM)') return t('meetings.agm');
    if (type === 'Committee Meeting') return t('meetings.committeeMeeting');
    if (type === 'Emergency Meeting') return t('meetings.emergencyMeeting');
    if (type === 'Budget Meeting') return t('meetings.budgetMeeting');
    return type;
  };
  const translateStatus = (status) => {
    if (status === 'Completed') return t('meetings.statusCompleted', 'Completed');
    if (status === 'Scheduled') return t('meetings.scheduled', 'Scheduled');
    return status;
  };
  const [meetings, setMeetings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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
          <h1>{t('meetings.title')}</h1>
          <p>{t('meetings.subtitle')}</p>
        </div>
        <button className="portal-primary-btn" onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <Plus size={16} /> {t('meetings.scheduleMeeting', 'Schedule Meeting')}
        </button>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="portal-kpis">
          <div className="portal-kpi">
            <span>{t('meetings.totalMeetings')}</span>
            <strong>{analytics.totalMeetings}</strong>
            <small>{t('meetings.recordedSystem')}</small>
            <div className="portal-kpi-icon"><CalendarDays size={18} /></div>
          </div>
          <div className="portal-kpi green">
            <span>{t('meetings.avgAttendance')}</span>
            <strong>{analytics.attendancePercentage}%</strong>
            <small>{t('meetings.participation')}</small>
            <div className="portal-kpi-icon"><UserCheck size={18} /></div>
          </div>
          <div className="portal-kpi orange">
            <span>{t('meetings.upcomingMeetings')}</span>
            <strong>{analytics.upcomingMeetings}</strong>
            <small>{t('meetings.scheduledAhead')}</small>
            <div className="portal-kpi-icon"><Clock size={18} /></div>
          </div>
          <div className="portal-kpi red">
            <span>{t('meetings.absenceFines')}</span>
            <strong>{money(analytics.fines?.pending_fines)}</strong>
            <small>{t('meetings.compulsoryFines')}</small>
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
          {t('meetings.directory')}
        </button>
        <button
          className={activeTab === 'fines' ? 'portal-primary-btn' : 'portal-light-btn'}
          onClick={() => setActiveTab('fines')}
        >
          {t('meetings.compAbsenceFinesCount', { count: fines.length })}
        </button>
      </div>

      {/* Meetings List */}
      {activeTab === 'list' && (
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head">
            <div>
              <h2>{t('meetings.panelTitle')}</h2>
              <p>{t('meetings.panelSubtitle')}</p>
            </div>
          </div>

          <div className="portal-form-grid" style={{ gridTemplateColumns: '1fr 220px' }}>
            <label>
              <span>{t('common.search', 'Search')}</span>
              <input
                type="text"
                placeholder={t('meetings.searchPlaceholder', 'Search meetings by title...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              <span>{t('meetings.meetingType', 'Meeting Type')}</span>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">{t('meetings.allMeetingTypes', 'All Meeting Types')}</option>
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
                    <th>{t('meetings.meetingDetails')}</th>
                    <th>{t('meetings.type')}</th>
                    <th>{t('meetings.dateTime')}</th>
                    <th>{t('meetings.venue')}</th>
                    <th>{t('meetings.status')}</th>
                    <th style={{ textAlign: 'right' }}>{t('meetings.actions')}</th>
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
                              {t('meetings.compAbsenceFines')} ({money(m.fine_amount)})
                            </small>
                          </div>
                        )}
                      </td>
                      <td>{translateMeetingType(m.meeting_type)}</td>
                      <td>
                        <div>{new Date(m.meeting_date).toLocaleDateString()}</div>
                        <small className="portal-muted-text">{m.start_time} - {m.end_time}</small>
                      </td>
                      <td>{m.venue}</td>
                      <td>
                        <span className={`portal-status ${m.status === 'Completed' ? 'resolved' : 'pending'}`}>
                          {translateStatus(m.status)}
                        </span>
                      </td>
                      <td>
                        <div className="portal-row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="portal-light-btn" onClick={() => handleOpenDetail(m)}>{t('common.view', 'View')}</button>
                          <button type="button" className="portal-light-btn" onClick={() => handleOpenAttendance(m)}>{t('meetings.attendance', 'Attendance')}</button>
                          <button type="button" className="portal-primary-btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleOpenReportModal(m)}>{t('meetings.momReport', 'MoM Report')}</button>
                          <button type="button" className="portal-light-btn" style={{ color: '#ef4444' }} onClick={() => handleDelete(m.id)}>{t('common.delete', 'Delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !meetings.length && <div className="portal-empty">{t('common.noData', 'No data available')}</div>}
          </div>
        </section>
      )}

      {/* Compulsory Fines List */}
      {activeTab === 'fines' && (
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head">
            <div>
              <h2>{t('meetings.compAbsenceFines')}</h2>
              <p>{t('meetings.finesRecordedSubtitle')}</p>
            </div>
          </div>
          <div className="portal-table-wrap">
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : (
              <table className="portal-data-table">
                <thead>
                  <tr>
                    <th>{t('meetings.residentFlat')}</th>
                    <th>{t('meetings.meetingTitle')}</th>
                    <th>{t('meetings.fineAmount')}</th>
                    <th>{t('common.dueDate', 'Due Date')}</th>
                    <th>{t('meetings.status')}</th>
                    <th style={{ textAlign: 'right' }}>{t('meetings.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {fines.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.resident_name}</strong>
                        <div className="portal-muted-text">{t('common.flat', 'Flat')} {f.flat_no} · Wing {f.wing}</div>
                      </td>
                      <td>{f.meeting_title}</td>
                      <td><strong style={{ color: '#dc2626' }}>{money(f.amount)}</strong></td>
                      <td>{new Date(f.due_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`portal-status ${f.status === 'Paid' ? 'resolved' : 'overdue'}`}>
                          {f.status === 'Paid' ? t('common.paid', 'Paid') : (f.status === 'Pending' ? t('common.pending', 'Pending') : t('common.overdue', 'Overdue'))}
                        </span>
                      </td>
                      <td>
                        <div className="portal-row-actions" style={{ justifyContent: 'flex-end' }}>
                          {f.status === 'Pending' && (
                            <button type="button" className="portal-light-btn" onClick={() => handleWaiveFine(f.id)}>
                              {t('meetings.waiveFine')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !fines.length && <div className="portal-empty">{t('common.noData', 'No data available')}</div>}
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

              <div className="portal-field-full" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', margin: '4px 0' }}>
                <input 
                  type="checkbox" 
                  id="is_compulsory_check"
                  checked={formData.is_compulsory} 
                  onChange={(e) => setFormData({ ...formData, is_compulsory: e.target.checked })} 
                />
                <label htmlFor="is_compulsory_check" style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                  Compulsory Meeting (Fine absent residents)
                </label>
              </div>

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

