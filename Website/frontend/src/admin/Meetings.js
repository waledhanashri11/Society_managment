import React, { useEffect, useMemo, useState } from 'react';
import { 
  Calendar, Clock, MapPin, AlertTriangle, FileText, CheckSquare, Plus, Edit3, Trash2, 
  UserCheck, Vote, Download, ListOrdered, CalendarRange, Search,
  CheckCircle2, XCircle, BarChart2,
  Printer, Eye, Grid, Table, FilterX, MoreVertical
} from 'lucide-react';
import { meetingAPI, residentsAPI } from '../services/api';
import { TableSkeleton } from '../components/Skeletons';
import './meetings.css';

const dateStr = (val) => val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const addMinutesToTime = (time, minutesToAdd) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(2026, 0, 1, hours || 0, minutes || 0);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  return date.toTimeString().slice(0, 5);
};

const AdminMeetings = () => {
  const [tab, setTab] = useState('dashboard'); // 'dashboard', 'meetings', 'actions'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [residents, setResidents] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Search & Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPendingReportsOnly, setFilterPendingReportsOnly] = useState(false);

  // View state (card view vs table view)
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'schedule', 'agenda', 'attendance', 'mom', 'vote', 'details'
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  
  // Modal Form States
  const [meetingForm, setMeetingForm] = useState({
    title: '', meeting_type: 'Committee Meeting', meeting_date: '', start_time: '', end_time: '',
    venue: '', description: '', priority: 'Normal', notify_residents: false, documents: []
  });
  
  const [agendaForm, setAgendaForm] = useState([]); // Array of { item_text: '', order_index: 0 }
  const [attendanceForm, setAttendanceForm] = useState([]); // Array of { resident_id: X, status: 'Present'/'Absent' }
  const [attendanceSearch, setAttendanceSearch] = useState('');
  
  const [reportForm, setReportForm] = useState({
    summary: '', discussion: '', decisions_taken: '', remarks: '', documents: []
  });
  
  const [actionForm, setActionForm] = useState({
    action_text: '', assigned_to: '', due_date: '', priority: 'Normal'
  });
  
  const [voteForm, setVoteForm] = useState({ question: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [meetingsRes, residentsRes] = await Promise.all([
        meetingAPI.getAll({ force: true }),
        residentsAPI.getAll({ force: true })
      ]);
      setMeetings(meetingsRes.data);
      setResidents(residentsRes.data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setMessage({ type: 'error', text: 'Failed to load meetings data.' });
    } finally {
      setLoading(false);
    }
  };

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = meetings.length;
    const upcoming = meetings.filter(m => m.status === 'Scheduled').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const today = meetings.filter(m => m.meeting_date && m.meeting_date.startsWith(todayStr)).length;
    const completed = meetings.filter(m => m.status === 'Completed').length;
    const cancelled = meetings.filter(m => m.status === 'Cancelled').length;
    
    // Attendance Stats
    let totalPresent = 0;
    let totalAttendanceRows = 0;
    meetings.forEach(m => {
      totalPresent += Number(m.present_count || 0);
      totalAttendanceRows += Number(m.total_count || 0);
    });
    const attendancePct = totalAttendanceRows > 0 ? Math.round((totalPresent / totalAttendanceRows) * 100) : 0;
    
    // Reports pending (Scheduled/Completed meetings with no report registered)
    const pendingReports = meetings.filter(m => m.status === 'Completed' && !m.has_report).length;

    return { total, upcoming, today, completed, cancelled, attendancePct, pendingReports };
  }, [meetings]);

  // Filters application
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      if (filterPendingReportsOnly) {
        if (m.status !== 'Completed' || m.has_report) return false;
      } else {
        if (filterStatus && m.status !== filterStatus) return false;
      }
      return true;
    });
  }, [meetings, filterStatus, filterPendingReportsOnly]);

  // Actions Tracker List
  const meetingActions = useMemo(() => {
    const list = [];
    meetings.forEach(m => {
      if (m.actions && m.actions.length) {
        m.actions.forEach(a => {
          list.push({
            ...a,
            meeting_title: m.title,
            meeting_date: m.meeting_date
          });
        });
      }
    });
    return list;
  }, [meetings]);

  // File to base64 reader helper
  const handleFileChange = (e, targetForm) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ name: file.name, data: reader.result });
        };
        reader.readAsDataURL(file);
      });
    })).then(results => {
      if (targetForm === 'meeting') {
        setMeetingForm(prev => ({ ...prev, documents: [...prev.documents, ...results] }));
      } else if (targetForm === 'report') {
        setReportForm(prev => ({ ...prev, documents: [...prev.documents, ...results] }));
      }
    });
  };

  // Schedule Modal triggers
  const handleAddMeeting = () => {
    setMeetingForm({
      title: '', meeting_type: 'Committee Meeting', meeting_date: '', start_time: '', end_time: '',
      venue: '', description: '', priority: 'Normal', notify_residents: false, documents: []
    });
    setSelectedMeeting(null);
    setActiveModal('schedule');
  };

  const handleEditMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setMeetingForm({
      title: meeting.title,
      meeting_type: meeting.meeting_type,
      meeting_date: meeting.meeting_date.split('T')[0],
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      venue: meeting.venue,
      description: meeting.description || '',
      priority: meeting.priority || 'Normal',
      notify_residents: meeting.notify_residents,
      documents: []
    });
    setActiveModal('schedule');
  };

  const handleSaveMeeting = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...meetingForm,
        end_time: meetingForm.end_time || addMinutesToTime(meetingForm.start_time, 60)
      };
      if (selectedMeeting) {
        await meetingAPI.update(selectedMeeting.id, payload);
        notify('success', 'Meeting details updated successfully.');
      } else {
        await meetingAPI.create(payload);
        notify('success', 'Meeting scheduled successfully.');
      }
      setActiveModal(null);
      loadData();
    } catch (err) {
      console.error(err);
      notify('error', err.response?.data?.message || 'Error scheduling meeting.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeeting = async (id) => {
    if (window.confirm('Are you sure you want to delete this meeting? This will delete agendas, reports and documents.')) {
      try {
        await meetingAPI.delete(id);
        notify('success', 'Meeting deleted successfully.');
        loadData();
      } catch (err) {
        notify('error', 'Failed to delete meeting.');
      }
    }
  };

  // Agendas edit triggers
  const handleOpenAgendas = async (meeting) => {
    setSelectedMeeting(meeting);
    try {
      const res = await meetingAPI.getById(meeting.id);
      setAgendaForm(res.data.agendas || []);
      setActiveModal('agenda');
    } catch (err) {
      notify('error', 'Failed to load agendas.');
    }
  };

  const handleAddAgendaItem = () => {
    setAgendaForm([...agendaForm, { item_text: '', order_index: agendaForm.length }]);
  };

  const handleRemoveAgendaItem = (idx) => {
    setAgendaForm(agendaForm.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order_index: i })));
  };

  const handleAgendaTextChange = (idx, text) => {
    const updated = [...agendaForm];
    updated[idx].item_text = text;
    setAgendaForm(updated);
  };

  const handleSaveAgendas = async () => {
    setSaving(true);
    try {
      await meetingAPI.updateAgenda(selectedMeeting.id, { items: agendaForm });
      notify('success', 'Meeting agenda saved.');
      setActiveModal(null);
      loadData();
    } catch (err) {
      notify('error', 'Failed to update agendas.');
    } finally {
      setSaving(false);
    }
  };

  // Attendance markup sheet
  const handleOpenAttendance = async (meeting) => {
    setSelectedMeeting(meeting);
    setAttendanceSearch('');
    try {
      const res = await meetingAPI.getAttendance(meeting.id);
      setAttendanceForm(res.data || []);
      setActiveModal('attendance');
    } catch (err) {
      notify('error', 'Failed to fetch attendance details.');
    }
  };

  const handleMarkStatus = (resId, status) => {
    setAttendanceForm(prev => prev.map(item => item.resident_id === resId ? { ...item, status } : item));
  };

  const handleBulkMarkPresent = () => {
    setAttendanceForm(prev => prev.map(item => ({ ...item, status: 'Present' })));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      await meetingAPI.saveAttendance(selectedMeeting.id, { attendance: attendanceForm });
      notify('success', 'Attendance marked successfully.');
      setActiveModal(null);
      loadData();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const filteredAttendance = useMemo(() => {
    return attendanceForm.filter(item => {
      const query = attendanceSearch.toLowerCase();
      return item.resident_name.toLowerCase().includes(query) || (item.flat_no && item.flat_no.includes(query));
    });
  }, [attendanceForm, attendanceSearch]);

  const attSummary = useMemo(() => {
    const total = attendanceForm.length;
    const present = attendanceForm.filter(a => a.status === 'Present').length;
    const absent = attendanceForm.filter(a => a.status === 'Absent').length;
    const late = attendanceForm.filter(a => a.status === 'Late').length;
    const excused = attendanceForm.filter(a => a.status === 'Excused').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, excused, pct };
  }, [attendanceForm]);

  // MoM report / minutes updates
  const handleOpenMoM = async (meeting) => {
    setSelectedMeeting(meeting);
    try {
      const res = await meetingAPI.getById(meeting.id);
      const rep = res.data.report || {};
      setReportForm({
        summary: rep.summary || '',
        discussion: rep.discussion || '',
        decisions_taken: rep.decisions_taken || '',
        remarks: rep.remarks || '',
        documents: []
      });
      setActionForm({ action_text: '', assigned_to: '', due_date: '', priority: 'Normal' });
      setActiveModal('mom');
    } catch (err) {
      notify('error', 'Failed to load report data.');
    }
  };

  const handleSaveReport = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await meetingAPI.saveReport(selectedMeeting.id, reportForm);
      notify('success', 'Minutes of Meeting (MoM) saved.');
      setActiveModal(null);
      loadData();
    } catch (err) {
      notify('error', 'Failed to record Minutes of Meeting.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAction = async () => {
    if (!actionForm.action_text) return alert('Please enter action details.');
    try {
      await meetingAPI.createAction({
        meeting_id: selectedMeeting.id,
        ...actionForm
      });
      notify('success', 'Action item assigned.');
      handleOpenMoM(selectedMeeting); // refresh actions list
    } catch (err) {
      notify('error', 'Failed to create action tracker item.');
    }
  };

  const handleDeleteAction = async (actionId) => {
    if (window.confirm('Delete this action tracker?')) {
      try {
        await meetingAPI.deleteAction(actionId);
        notify('success', 'Action deleted.');
        handleOpenMoM(selectedMeeting);
      } catch (err) {
        notify('error', 'Failed to delete action.');
      }
    }
  };

  // Voting poll updates
  const handleOpenVoting = async (meeting) => {
    setSelectedMeeting(meeting);
    try {
      const res = await meetingAPI.getById(meeting.id);
      setVoteForm({ question: res.data.vote?.question || '' });
      setActiveModal('vote');
    } catch (err) {
      notify('error', 'Failed to get voting poll data.');
    }
  };

  const handleSaveVoting = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await meetingAPI.createVote({
        meeting_id: selectedMeeting.id,
        question: voteForm.question
      });
      notify('success', 'Voting poll configured successfully.');
      setActiveModal(null);
      loadData();
    } catch (err) {
      notify('error', 'Failed to save voting poll.');
    } finally {
      setSaving(false);
    }
  };

  // Details Modal
  const handleOpenDetails = async (meeting) => {
    setLoading(true);
    try {
      const res = await meetingAPI.getById(meeting.id);
      setSelectedMeeting(res.data);
      setActiveModal('details');
    } catch (err) {
      notify('error', 'Failed to retrieve meeting details.');
    } finally {
      setLoading(false);
    }
  };

  const handleActionStatusChange = async (actionId, newStatus) => {
    try {
      const action = meetingActions.find(a => a.id === actionId);
      await meetingAPI.updateAction(actionId, {
        action_text: action.action_text,
        assigned_to: action.assigned_to,
        due_date: action.due_date ? action.due_date.split('T')[0] : null,
        priority: action.priority,
        status: newStatus
      });
      notify('success', `Action marked as ${newStatus}`);
      loadData();
    } catch (err) {
      notify('error', 'Failed to update action status.');
    }
  };

  // Print minutes report preview
  const handlePrintMinutes = (meeting) => {
    const docWindow = window.open('', '_blank');
    if (!docWindow) return alert('Popups blocked. Enable popup permissions to print.');
    
    const agendasHtml = meeting.agendas?.length 
      ? `ol { margin-top: 10px; }` 
      : '';
      
    const reportHtml = `
      <html>
        <head>
          <title>Minutes of Meeting - ${meeting.title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { font-size: 26px; margin: 0; color: #0f172a; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .meta-item { font-size: 14px; }
            .meta-item strong { color: #475569; }
            h2 { font-size: 18px; color: #3b82f6; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px; }
            .content { font-size: 15px; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 14px; }
            th { background: #f1f5f9; font-weight: 600; }
            ${agendasHtml}
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Minutes of Meeting (MoM)</h1>
            <p style="margin: 5px 0 0; color: #64748b; font-weight: 500;">Society Management System</p>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item"><strong>Title:</strong> ${meeting.title}</div>
            <div class="meta-item"><strong>Type:</strong> ${meeting.meeting_type}</div>
            <div class="meta-item"><strong>Date:</strong> ${dateStr(meeting.meeting_date)}</div>
            <div class="meta-item"><strong>Time:</strong> ${meeting.start_time} - ${meeting.end_time}</div>
            <div class="meta-item"><strong>Venue:</strong> ${meeting.venue}</div>
            <div class="meta-item"><strong>Priority:</strong> ${meeting.priority}</div>
          </div>

          <h2>Meeting Description</h2>
          <div class="content">${meeting.description || 'No description provided.'}</div>

          <h2>Agenda Items Discussed</h2>
          <div class="content">
            ${meeting.agendas?.length 
              ? `<ol>${meeting.agendas.map(a => `<li>${a.item_text}</li>`).join('')}</ol>`
              : 'No agenda registered.'}
          </div>

          <h2>Minutes Summary</h2>
          <div class="content">${meeting.report?.summary || 'No summary recorded.'}</div>

          <h2>Discussion Details</h2>
          <div class="content">${meeting.report?.discussion || 'No discussion recorded.'}</div>

          <h2>Decisions Taken</h2>
          <div class="content">${meeting.report?.decisions_taken || 'No decisions recorded.'}</div>

          <h2>Assigned Action Items</h2>
          <table>
            <thead>
              <tr>
                <th>Action details</th>
                <th>Assigned to</th>
                <th>Due date</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${meeting.actions?.length
                ? meeting.actions.map(a => `
                  <tr>
                    <td>${a.action_text}</td>
                    <td>${a.assignee_name || 'Unassigned'}</td>
                    <td>${dateStr(a.due_date)}</td>
                    <td>${a.priority}</td>
                    <td>${a.status}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No actions assigned.</td></tr>'}
            </tbody>
          </table>
          
          <p style="text-align: right; font-size: 11px; color:#64748b; margin-top: 50px;">
            Minutes documented on: ${new Date(meeting.report?.created_at || new Date()).toLocaleString('en-IN')}
          </p>
          <script>window.print();</script>
        </body>
      </html>
    `;
    docWindow.document.write(reportHtml);
    docWindow.document.close();
  };

  return (
    <div className="portal-module">
      <div className="portal-page-title">
        <div>
          <h1>Society Meetings</h1>
          <p>Schedule committee assemblies, record member attendance, document MoM logs, and track action resolutions.</p>
        </div>
        <button className="portal-primary-btn" onClick={handleAddMeeting}>
          <Plus size={17} /> Schedule Meeting
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="meetings-tabs-wrapper">
        <div className="meetings-tabs">
          <button 
            className={`meetings-tab-btn ${tab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setTab('dashboard')}
          >
            <BarChart2 size={16} /> Dashboard
          </button>
          <button 
            className={`meetings-tab-btn ${tab === 'meetings' ? 'active' : ''}`} 
            onClick={() => setTab('meetings')}
          >
            <Calendar size={16} /> Meetings Register
          </button>
          <button 
            className={`meetings-tab-btn ${tab === 'actions' ? 'active' : ''}`} 
            onClick={() => setTab('actions')}
          >
            <CheckSquare size={16} /> Action Resolutions
          </button>
        </div>

        {tab === 'meetings' && (
          <div className="meetings-view-toggle">
            <button 
              className={`meetings-view-btn ${viewMode === 'grid' ? 'active' : ''}`} 
              onClick={() => setViewMode('grid')}
              title="Grid Card View"
            >
              <Grid size={16} />
            </button>
            <button 
              className={`meetings-view-btn ${viewMode === 'table' ? 'active' : ''}`} 
              onClick={() => setViewMode('table')}
              title="Detailed Table View"
            >
              <Table size={16} />
            </button>
          </div>
        )}
      </div>

      {message.text && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`} style={{ animation: 'fadeIn 0.3s ease' }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : tab === 'dashboard' ? (
        <>
          <div className="meetings-kpis-grid">
            <div 
              className={`meetings-kpi-card ${filterStatus === 'Scheduled' && !filterPendingReportsOnly ? 'active-filter' : ''}`}
              onClick={() => {
                setFilterPendingReportsOnly(false);
                setFilterStatus(prev => prev === 'Scheduled' ? '' : 'Scheduled');
                setTab('meetings');
              }}
            >
              <span>Upcoming Meetings</span>
              <strong>{kpis.upcoming}</strong>
              <small>Scheduled assemblies (Filter)</small>
              <div className="meetings-kpi-icon-wrapper">
                <CalendarRange size={20} />
              </div>
            </div>

            <div 
              className={`meetings-kpi-card green ${filterStatus === 'Completed' && !filterPendingReportsOnly ? 'active-filter' : ''}`}
              onClick={() => {
                setFilterPendingReportsOnly(false);
                setFilterStatus(prev => prev === 'Completed' ? '' : 'Completed');
                setTab('meetings');
              }}
            >
              <span>Completed Meetings</span>
              <strong>{kpis.completed}</strong>
              <small>Minutes documented (Filter)</small>
              <div className="meetings-kpi-icon-wrapper">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="meetings-kpi-card blue">
              <span>Attendance Rate</span>
              <strong>{kpis.attendancePct}%</strong>
              <small>Average participation</small>
              <div className="meetings-kpi-icon-wrapper">
                <UserCheck size={20} />
              </div>
            </div>

            <div 
              className={`meetings-kpi-card red ${filterPendingReportsOnly ? 'active-filter' : ''}`}
              onClick={() => {
                setFilterStatus('');
                setFilterPendingReportsOnly(prev => !prev);
                setTab('meetings');
              }}
            >
              <span>Pending Reports (MoM)</span>
              <strong>{kpis.pendingReports}</strong>
              <small>Awaiting documentation (Filter)</small>
              <div className="meetings-kpi-icon-wrapper">
                <FileText size={20} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            {/* Recent scheduled meetings */}
            <section className="portal-panel portal-table-card">
              <div className="portal-panel-head"><div><h2>Agenda Schedule</h2><p>Upcoming scheduled meetings.</p></div></div>
              <div className="portal-table-wrap">
                <table className="portal-data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Venue</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.slice(0, 5).map(m => (
                      <tr key={m.id}>
                        <td><strong>{m.title}</strong><br/><small className="text-slate-400">{m.meeting_type}</small></td>
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
                          <button style={{ border: 'none', background: 'none', color: '#4f46e5', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleOpenDetails(m)}>
                            View details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!meetings.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No meetings scheduled.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      ) : tab === 'meetings' ? (
        <>


          {viewMode === 'grid' ? (
            /* Redesigned Card Grid View */
            <div className="meetings-cards-grid">
              {filteredMeetings.map((m) => (
                <div key={m.id} className={`meetings-grid-card priority-${(m.priority || 'Normal').toLowerCase()}`}>
                  <div className="meetings-card-header">
                    <div className="meetings-card-type-row">
                      <span className="meetings-type-tag">{m.meeting_type.replace(' (AGM)', '')}</span>
                      
                      <div className="meetings-dropdown-container">
                        <button 
                          className="meetings-more-btn" 
                          onClick={() => setOpenDropdownId(prev => prev === m.id ? null : m.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {openDropdownId === m.id && (
                          <>
                            <div 
                              style={{ position: 'fixed', inset: 0, zIndex: 40, cursor: 'default' }} 
                              onClick={() => setOpenDropdownId(null)}
                            />
                            <div className="meetings-dropdown-menu" style={{ right: 0, top: '100%' }}>
                              <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleEditMeeting(m); }}>
                                <Edit3 size={13} /> Edit Details
                              </button>
                              <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleOpenAgendas(m); }}>
                                <ListOrdered size={13} /> Manage Agenda
                              </button>
                              <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleOpenAttendance(m); }}>
                                <UserCheck size={13} /> Mark Attendance
                              </button>
                              <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleOpenMoM(m); }}>
                                <FileText size={13} /> Record Minutes (MoM)
                              </button>
                              <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleOpenVoting(m); }}>
                                <Vote size={13} /> Configure Poll
                              </button>
                              <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                              <button className="meetings-dropdown-item danger" onClick={() => { setOpenDropdownId(null); handleDeleteMeeting(m.id); }}>
                                <Trash2 size={13} /> Delete Meeting
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <h3 className="meetings-card-title">{m.title}</h3>
                    <span className={`meetings-priority-badge ${(m.priority || 'Normal').toLowerCase()}`} style={{ marginTop: '8px', display: 'inline-block' }}>{m.priority} Priority</span>
                  </div>

                  <div className="meetings-card-body">
                    <p className="meetings-card-desc">{m.description || 'No description notes provided for this society assembly.'}</p>
                    
                    <div className="meetings-info-grid">
                      <div className="meetings-info-chip">
                        <Calendar size={14} />
                        <span><strong>Date:</strong> {dateStr(m.meeting_date)}</span>
                      </div>
                      <div className="meetings-info-chip">
                        <Clock size={14} />
                        <span><strong>Time:</strong> {m.start_time} - {m.end_time}</span>
                      </div>
                      <div className="meetings-info-chip">
                        <MapPin size={14} />
                        <span><strong>Venue:</strong> {m.venue}</span>
                      </div>
                    </div>

                    <div className="meetings-card-stats">
                      <div className="meetings-card-stat-item">
                        <ListOrdered size={12} />
                        <span>Agendas: <strong>{m.agendas?.length || 0}</strong></span>
                      </div>
                      <div className="meetings-card-stat-item">
                        <CheckSquare size={12} />
                        <span>Action items: <strong>{m.actions?.length || 0}</strong></span>
                      </div>
                    </div>

                    <div className="meetings-status-line">
                      <span className="meetings-status-text">CURRENT STATE</span>
                      <span className={`meetings-status-pill ${(m.status || 'Scheduled').toLowerCase()}`}>{m.status}</span>
                    </div>
                  </div>

                  <div className="meetings-card-footer">
                    <button 
                      className="portal-primary-btn" 
                      style={{ width: '100%', justifyContent: 'center' }} 
                      onClick={() => handleOpenDetails(m)}
                    >
                      <Eye size={14} /> View Details & Minutes
                    </button>
                  </div>
                </div>
              ))}
              {!filteredMeetings.length && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: '#94a3b8', background: '#fff', borderRadius: '16px', border: '1px solid #edf2f7' }}>
                  <FilterX size={32} style={{ margin: '0 auto 12px', color: '#cbd5e1', display: 'block' }} />
                  No meetings found matching your filter selections.
                </div>
              )}
            </div>
          ) : (
            /* Redesigned Table View */
            <section className="portal-panel portal-table-card">
              <div className="portal-panel-head">
                <div>
                  <h2>Meeting Register</h2>
                  <p>{filteredMeetings.length} meetings registered</p>
                </div>
              </div>
              <div className="portal-table-wrap">
                <table className="meetings-table-custom">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Venue</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Management Control Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMeetings.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.title}</strong><br/>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{m.meeting_type}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} style={{ color: '#6366f1' }} />
                            {dateStr(m.meeting_date)}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={13} style={{ color: '#6366f1' }} />
                            {m.start_time} - {m.end_time}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={13} style={{ color: '#6366f1' }} />
                            {m.venue}
                          </div>
                        </td>
                        <td>
                          <span className={`meetings-priority-badge ${(m.priority || 'Normal').toLowerCase()}`}>
                            {m.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`meetings-status-pill ${(m.status || 'Scheduled').toLowerCase()}`}>
                            {m.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                              className="portal-primary-btn" 
                              style={{ padding: '6px 12px', fontSize: '12px' }} 
                              onClick={() => handleOpenDetails(m)}
                            >
                              <Eye size={13} /> Details
                            </button>
                            
                            <div className="meetings-dropdown-container">
                              <button 
                                className="meetings-more-btn" 
                                onClick={() => setOpenDropdownId(prev => prev === m.id ? null : m.id)}
                                title="More actions"
                              >
                                <MoreVertical size={16} />
                              </button>
                              
                              {openDropdownId === m.id && (
                                <>
                                  <div 
                                    style={{ position: 'fixed', inset: 0, zIndex: 40, cursor: 'default' }} 
                                    onClick={() => setOpenDropdownId(null)}
                                  />
                                  <div className="meetings-dropdown-menu" style={{ right: 0, top: '100%' }}>
                                    <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleEditMeeting(m); }}>
                                      <Edit3 size={13} /> Edit Details
                                    </button>
                                    <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleOpenAgendas(m); }}>
                                      <ListOrdered size={13} /> Manage Agenda
                                    </button>
                                    <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleOpenAttendance(m); }}>
                                      <UserCheck size={13} /> Mark Attendance
                                    </button>
                                    <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleOpenMoM(m); }}>
                                      <FileText size={13} /> Record Minutes (MoM)
                                    </button>
                                    <button className="meetings-dropdown-item" onClick={() => { setOpenDropdownId(null); handleOpenVoting(m); }}>
                                      <Vote size={13} /> Configure Poll
                                    </button>
                                    <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                                    <button className="meetings-dropdown-item danger" onClick={() => { setOpenDropdownId(null); handleDeleteMeeting(m.id); }}>
                                      <Trash2 size={13} /> Delete Meeting
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredMeetings.length && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                          No meetings found matching your filter selections.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : (
        // Action tracker items
        <section className="portal-panel portal-table-card">
          <div className="portal-panel-head"><div><h2>Action Items Tracker</h2><p>Follow up status of meeting resolutions.</p></div></div>
          <div className="portal-table-wrap">
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>Resolution / Action</th>
                  <th>Source Meeting</th>
                  <th>Assigned Member</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Progress Status</th>
                </tr>
              </thead>
              <tbody>
                {meetingActions.map(a => (
                  <tr key={a.id}>
                    <td><strong>{a.action_text}</strong></td>
                    <td>{a.meeting_title}<br/><small style={{ color: '#64748b' }}>{dateStr(a.meeting_date)}</small></td>
                    <td>{a.assignee_name || <span style={{ color: '#94a3b8' }}>Unassigned</span>}</td>
                    <td>{dateStr(a.due_date)}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                        backgroundColor: a.priority === 'Urgent' ? '#fee2e2' : a.priority === 'High' ? '#ffedd5' : '#f1f5f9',
                        color: a.priority === 'Urgent' ? '#991b1b' : a.priority === 'High' ? '#c2410c' : '#475569'
                      }}>
                        {a.priority}
                      </span>
                    </td>
                    <td>
                      <select
                        value={a.status}
                        onChange={(e) => handleActionStatusChange(a.id, e.target.value)}
                        style={{
                          padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                          backgroundColor: a.status === 'Completed' ? '#dcfce7' : a.status === 'In Progress' ? '#e0f2fe' : '#f1f5f9',
                          color: a.status === 'Completed' ? '#166534' : a.status === 'In Progress' ? '#0369a1' : '#475569'
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {!meetingActions.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No follow up actions created yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SCHEDULE MEETING MODAL */}
      {activeModal === 'schedule' && (
        <div className="modal-anim-backdrop" onMouseDown={() => setActiveModal(null)}>
          <div className="modal-anim-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
            <div className="portal-modal-head">
              <div><h3>{selectedMeeting ? 'Edit Meeting' : 'Schedule Meeting'}</h3></div>
              <button onClick={() => setActiveModal(null)}>x</button>
            </div>
            <form onSubmit={handleSaveMeeting} className="portal-form">
              <label><span>Meeting Title</span><input type="text" required value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} placeholder="e.g. Annual General Body Meeting" /></label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span>Meeting Type</span>
                  <select value={meetingForm.meeting_type} onChange={(e) => setMeetingForm({ ...meetingForm, meeting_type: e.target.value })}>
                    <option value="Annual General Meeting (AGM)">Annual General Meeting (AGM)</option>
                    <option value="Committee Meeting">Committee Meeting</option>
                    <option value="Emergency Meeting">Emergency Meeting</option>
                    <option value="Budget Meeting">Budget Meeting</option>
                    <option value="Maintenance Meeting">Maintenance Meeting</option>
                    <option value="Special Meeting">Special Meeting</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label><span>Meeting Date</span><input type="date" required value={meetingForm.meeting_date} onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })} /></label>
              </div>

              <label><span>Start Time</span><input type="time" required value={meetingForm.start_time} onChange={(e) => setMeetingForm({ ...meetingForm, start_time: e.target.value, end_time: selectedMeeting ? meetingForm.end_time : '' })} /></label>

              <label><span>Venue Location</span><input type="text" required value={meetingForm.venue} onChange={(e) => setMeetingForm({ ...meetingForm, venue: e.target.value })} placeholder="e.g. Society Clubhouse" /></label>

              <label className="portal-field-full"><span>Notes</span><textarea value={meetingForm.description} onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })} rows={3} placeholder="Optional meeting notes" /></label>

              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setActiveModal(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="portal-primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AGENDA ITEMS EDITOR MODAL */}
      {activeModal === 'agenda' && selectedMeeting && (
        <div className="modal-anim-backdrop" onMouseDown={() => setActiveModal(null)}>
          <div className="modal-anim-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: '550px', width: '95%' }}>
            <div className="portal-modal-head">
              <div><h3>Manage Agenda Items</h3><p>{selectedMeeting.title}</p></div>
              <button onClick={() => setActiveModal(null)}>x</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
              {agendaForm.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#64748b' }}>#{index + 1}</span>
                  <input type="text" value={item.item_text} onChange={(e) => handleAgendaTextChange(index, e.target.value)} placeholder="e.g. Discussion on lift repair" style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  <button onClick={() => handleRemoveAgendaItem(index)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
              ))}
              <button className="portal-light-btn" style={{ borderStyle: 'dashed', justifyContent: 'center', marginTop: '10px' }} onClick={handleAddAgendaItem}><Plus size={15} /> Add Agenda Point</button>
            </div>
            <div className="portal-form-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button type="button" className="portal-light-btn" onClick={() => setActiveModal(null)} disabled={saving}>Cancel</button>
              <button type="button" className="portal-primary-btn" onClick={handleSaveAgendas} disabled={saving}>{saving ? 'Saving...' : 'Save Agendas'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE SHEET MODAL */}
      {activeModal === 'attendance' && selectedMeeting && (
        <div className="modal-anim-backdrop" onMouseDown={() => setActiveModal(null)}>
          <div className="modal-anim-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-head">
              <div><h3>Mark Meeting Attendance</h3><p>{selectedMeeting.title}</p></div>
              <button onClick={() => setActiveModal(null)}>x</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', marginTop: '12px', fontSize: '13px' }}>
              <div>Total: <strong>{attSummary.total}</strong></div>
              <div>Present: <strong style={{ color: '#166534' }}>{attSummary.present}</strong></div>
              <div>Absent: <strong style={{ color: '#991b1b' }}>{attSummary.absent}</strong></div>
              <div>Late: <strong style={{ color: '#9a3412' }}>{attSummary.late}</strong></div>
              <div>Excused: <strong style={{ color: '#475569' }}>{attSummary.excused}</strong></div>
              <div>Percentage: <strong>{attSummary.pct}%</strong></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', margin: '16px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <Search size={15} style={{ color: '#64748b' }} />
                <input type="text" value={attendanceSearch} onChange={(e) => setAttendanceSearch(e.target.value)} placeholder="Search resident or flat number..." style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} />
              </label>
              <button className="portal-light-btn" style={{ color: '#2563eb', borderColor: '#2563eb' }} onClick={handleBulkMarkPresent}>Bulk Mark Present</button>
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="portal-data-table" style={{ margin: 0 }}>
                <thead>
                  <tr><th>Resident</th><th>Flat</th><th>Attendance Status</th></tr>
                </thead>
                <tbody>
                  {filteredAttendance.map(item => (
                    <tr key={item.resident_id}>
                      <td><strong>{item.resident_name}</strong></td>
                      <td>Flat {item.flat_no || '—'} ({item.wing})</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {['Present', 'Absent', 'Late', 'Excused'].map(st => (
                            <button
                              key={st}
                              onClick={() => handleMarkStatus(item.resident_id, st)}
                              style={{
                                border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                                backgroundColor: item.status === st 
                                  ? (st === 'Present' ? '#dcfce7' : st === 'Absent' ? '#fee2e2' : st === 'Late' ? '#ffedd5' : '#f1f5f9')
                                  : '#fff',
                                color: item.status === st
                                  ? (st === 'Present' ? '#166534' : st === 'Absent' ? '#991b1b' : st === 'Late' ? '#c2410c' : '#475569')
                                  : '#64748b',
                                borderColor: item.status === st
                                  ? (st === 'Present' ? '#86efac' : st === 'Absent' ? '#fca5a5' : st === 'Late' ? '#fdba74' : '#cbd5e1')
                                  : '#cbd5e1'
                              }}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="portal-form-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
              <button type="button" className="portal-light-btn" onClick={() => setActiveModal(null)} disabled={saving}>Cancel</button>
              <button type="button" className="portal-primary-btn" onClick={handleSaveAttendance} disabled={saving}>{saving ? 'Saving...' : 'Save Attendance'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MoM REPORT & MINUTES DIALOG */}
      {activeModal === 'mom' && selectedMeeting && (
        <div className="modal-anim-backdrop" onMouseDown={() => setActiveModal(null)}>
          <div className="modal-anim-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-head">
              <div><h3>Minutes of Meeting (MoM) & Decisions Log</h3><p>{selectedMeeting.title} · {dateStr(selectedMeeting.meeting_date)}</p></div>
              <button onClick={() => setActiveModal(null)}>x</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginTop: '12px' }}>
              {/* MoM text fields */}
              <form onSubmit={handleSaveReport} className="portal-form">
                <label className="portal-field-full"><span>Summary / Overview of meeting outcomes</span><textarea required value={reportForm.summary} onChange={(e) => setReportForm({ ...reportForm, summary: e.target.value })} rows={2} placeholder="Brief executive summary" /></label>
                <label className="portal-field-full"><span>Discussions details</span><textarea required value={reportForm.discussion} onChange={(e) => setReportForm({ ...reportForm, discussion: e.target.value })} rows={3} placeholder="Summarize conversations or points raised" /></label>
                <label className="portal-field-full"><span>Decisions Taken</span><textarea required value={reportForm.decisions_taken} onChange={(e) => setReportForm({ ...reportForm, decisions_taken: e.target.value })} rows={3} placeholder="List out all approved resolutions" /></label>
                <label className="portal-field-full"><span>Remarks</span><input type="text" value={reportForm.remarks} onChange={(e) => setReportForm({ ...reportForm, remarks: e.target.value })} placeholder="Any extra references" /></label>
                
                <label className="portal-field-full">
                  <span>Upload Minutes Documents / Images</span>
                  <input type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={(e) => handleFileChange(e, 'report')} />
                  {reportForm.documents.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '6px' }}>
                      Attached: {reportForm.documents.map(d => d.name).join(', ')}
                    </div>
                  )}
                </label>

                <div className="portal-form-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
                  <button type="submit" className="portal-primary-btn" style={{ width: '100%', justifyContent: 'center' }} disabled={saving}>
                    {saving ? 'Saving report...' : 'Finalize MoM & Close Meeting'}
                  </button>
                </div>
              </form>

              {/* Action items assignment */}
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
                  <CheckSquare size={16} /> Assign Follow-up Action Items
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>
                    Action Task Details
                    <input type="text" value={actionForm.action_text} onChange={(e) => setActionForm({ ...actionForm, action_text: e.target.value })} placeholder="e.g. Procure water pump quotes" style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }} />
                  </label>
                  
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>
                    Assign To (Resident)
                    <select value={actionForm.assigned_to} onChange={(e) => setActionForm({ ...actionForm, assigned_to: e.target.value })} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}>
                      <option value="">-- Choose Member --</option>
                      {residents.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                      ))}
                    </select>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>
                      Due Date
                      <input type="date" value={actionForm.due_date} onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>
                      Priority
                      <select value={actionForm.priority} onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}>
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </label>
                  </div>

                  <button type="button" className="portal-primary-btn" style={{ justifyContent: 'center', marginTop: '4px', fontSize: '12px', padding: '6px 12px' }} onClick={handleCreateAction}>
                    <Plus size={14} /> Assign Action Task
                  </button>
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Assigned Actions Checklist:</span>
                  {(selectedMeeting.actions || []).map(act => (
                    <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', fontSize: '12px' }}>
                      <div>
                        <strong>{act.action_text}</strong>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          To: {act.assignee_name || 'Unassigned'} · Due: {dateStr(act.due_date)}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteAction(act.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                    </div>
                  ))}
                  {!(selectedMeeting.actions || []).length && (
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No actions configured.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VOTING POLL CREATION MODAL */}
      {activeModal === 'vote' && selectedMeeting && (
        <div className="modal-anim-backdrop" onMouseDown={() => setActiveModal(null)}>
          <div className="modal-anim-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="portal-modal-head">
              <div><h3>Configure Voting Poll</h3><p>{selectedMeeting.title}</p></div>
              <button onClick={() => setActiveModal(null)}>x</button>
            </div>
            <form onSubmit={handleSaveVoting} className="portal-form">
              <label className="portal-field-full">
                <span>Poll Question / Proposal text</span>
                <input type="text" required value={voteForm.question} onChange={(e) => setVoteForm({ ...voteForm, question: e.target.value })} placeholder="e.g. Should we approve a 10% increase in monthly maintenance charges?" />
              </label>

              {selectedMeeting.vote && (
                <div style={{ margin: '12px 0', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>Active Poll Results:</strong>
                  <div>• Yes Votes: <strong>{selectedMeeting.vote.yes_count}</strong></div>
                  <div style={{ marginTop: '3px' }}>• No Votes: <strong>{selectedMeeting.vote.no_count}</strong></div>
                  <div style={{ marginTop: '3px' }}>• Abstained: <strong>{selectedMeeting.vote.abstain_count}</strong></div>
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '6px', fontWeight: 'bold' }}>
                    Total Cast: {Number(selectedMeeting.vote.yes_count) + Number(selectedMeeting.vote.no_count) + Number(selectedMeeting.vote.abstain_count)}
                  </div>
                </div>
              )}

              <div className="portal-form-actions">
                <button type="button" className="portal-light-btn" onClick={() => setActiveModal(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="portal-primary-btn" disabled={saving}>{saving ? 'Creating...' : selectedMeeting.vote ? 'Update Poll' : 'Create Poll'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEETING DETAILS OVERLAY MODAL */}
      {activeModal === 'details' && selectedMeeting && (
        <div className="modal-anim-backdrop" onMouseDown={() => setActiveModal(null)}>
          <div className="modal-anim-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-head">
              <div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>{selectedMeeting.meeting_type}</span>
                <h3>{selectedMeeting.title}</h3>
              </div>
              <button onClick={() => setActiveModal(null)}>x</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #edf2f7', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} style={{ color: '#4f46e5' }} /> <span>Date: <strong>{dateStr(selectedMeeting.meeting_date)}</strong></span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} style={{ color: '#4f46e5' }} /> <span>Time: <strong>{selectedMeeting.start_time} - {selectedMeeting.end_time}</strong></span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={16} style={{ color: '#4f46e5' }} /> <span>Venue: <strong>{selectedMeeting.venue}</strong></span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} style={{ color: '#4f46e5' }} /> <span>Priority: <strong>{selectedMeeting.priority}</strong></span></div>
              </div>

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

              {/* Minutes report display */}
              {selectedMeeting.report && (
                <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>Minutes of Meeting (MoM) Report:</strong>
                    <button className="portal-light-btn" style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handlePrintMinutes(selectedMeeting)}>
                      <Printer size={12} /> Print Minutes
                    </button>
                  </div>
                  
                  <div style={{ backgroundColor: '#fdfdfd', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#475569' }}>Summary:</span>
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
                          textDecoration: 'none', color: '#4f46e5', fontWeight: '500', fontSize: '13px', backgroundColor: '#fcfcfc', transition: 'background-color 0.2s'
                        }}
                      >
                        <Download size={14} /> {doc.file_name} ({doc.file_type ? doc.file_type.split('/')[1].toUpperCase() : 'DOC'})
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action checklist status */}
              {selectedMeeting.actions && selectedMeeting.actions.length > 0 && (
                <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '16px' }}>
                  <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block', marginBottom: '8px' }}>Action Items Status Checklist:</strong>
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
              <button type="button" className="portal-light-btn" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMeetings;
