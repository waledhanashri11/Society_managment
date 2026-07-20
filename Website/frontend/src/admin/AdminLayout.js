import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell, Building2, CalendarDays, ChevronDown, ClipboardList, CreditCard, FileBarChart, FileCheck2, Home, LogOut, Menu,
  Megaphone, MessageSquareWarning, Settings, ShieldCheck, UserCircle, Users, X
} from 'lucide-react';
import { getUser, logout } from '../utils/auth';
import { notificationAPI, settingsAPI } from '../services/api';
import '../portal.css';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { to: '/admin/residents', label: 'Residents', icon: Users },
  { to: '/admin/flats', label: 'Flats', icon: Building2 },
  { to: '/admin/meetings', label: 'Meetings', icon: CalendarDays },
  { to: '/admin/maintenance', label: 'Maintenance', icon: ClipboardList },
  { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/admin/notices', label: 'Notices', icon: Megaphone },
  { to: '/admin/staff', label: 'Staff', icon: ShieldCheck },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { to: '/admin/noc-management', label: 'NOC Management', icon: FileCheck2 },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminSettings') || 'null') || {};
    } catch (error) {
      return {};
    }
  });

  useEffect(() => {
    const refreshSettings = (event) => {
      if (event.detail) {
        setSettings(event.detail);
        return;
      }
      try {
        setSettings(JSON.parse(localStorage.getItem('adminSettings') || 'null') || {});
      } catch (error) {
        setSettings({});
      }
    };

    window.addEventListener('adminSettingsUpdated', refreshSettings);
    window.addEventListener('storage', refreshSettings);
    return () => {
      window.removeEventListener('adminSettingsUpdated', refreshSettings);
      window.removeEventListener('storage', refreshSettings);
    };
  }, []);

  useEffect(() => {
    let active = true;

    settingsAPI.get()
      .then(({ data }) => {
        if (!active) return;
        setSettings(data);
        localStorage.setItem('adminSettings', JSON.stringify(data));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const loadNotifications = useCallback((force = false) => {
    if (notificationsLoaded && !force) return;

    notificationAPI.getAdmin()
      .then(({ data }) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setNotificationsLoaded(true);
      })
      .catch(() => {
        setNotifications([]);
        setNotificationsLoaded(true);
      });
  }, [notificationsLoaded]);

  useEffect(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  const handleNotificationClick = (item) => {
    if (!item.is_read) {
      notificationAPI.markRead(item.id)
        .then(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== item.id));
          setUnreadCount((prev) => Math.max(0, prev - 1));
        })
        .catch((err) => console.error('Failed to mark notification read:', err));
    }
    closeMenus();
    navigate(item.path);
  };

  const markAllRead = () => {
    notificationAPI.markAdminRead()
      .then(() => {
        setNotifications([]);
        setUnreadCount(0);
      })
      .catch((err) => console.error('Failed to mark all notifications read:', err));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (menuName) => {
    setActiveMenu((current) => (current === menuName ? '' : menuName));
    if (menuName === 'notifications') {
      loadNotifications(true);
    }
  };

  const closeMenus = () => setActiveMenu('');

  return (
    <div className="portal-layout portal-admin" onClick={closeMenus}>
      {open && <button className="portal-scrim" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <aside className={`portal-sidebar ${open ? 'is-open' : ''}`}>
        <div className="portal-brand">
          <span className="portal-brand-mark"><Building2 size={21} /></span>
          <span><strong>SocietyHub</strong><small>{settings.societyName || 'Management System'}</small></span>
          <button className="portal-mobile-close" onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
        <div className="portal-nav-label">Workspace</div>
        <nav className="portal-nav">
          {adminLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `portal-nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="portal-sidebar-foot">
          <button className="portal-nav-link" onClick={handleLogout}><LogOut size={17} /><span>Logout</span></button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <button className="portal-menu-button" onClick={() => setOpen(true)}><Menu size={21} /></button>
          <div className="portal-breadcrumb">
            <span>{settings.societyName || 'Society Management'}</span><small>Admin workspace</small>
          </div>
          <div className="portal-top-actions">
            <div className="portal-action-menu" onClick={(event) => event.stopPropagation()}>
              <button
                className="portal-notification"
                aria-label="Notifications"
                aria-expanded={activeMenu === 'notifications'}
                onClick={() => toggleMenu('notifications')}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="portal-notification-badge">{unreadCount}</span>}
              </button>
              {activeMenu === 'notifications' && (
                <div className="portal-dropdown portal-notification-panel">
                  <div className="portal-dropdown-head">
                    <strong>Notifications</strong>
                    {unreadCount > 0 ? (
                      <button
                        onClick={markAllRead}
                        style={{
                          border: 0,
                          padding: 0,
                          color: 'var(--portal-blue)',
                          background: 'transparent',
                          fontSize: '9px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          width: 'auto',
                          display: 'inline'
                        }}
                      >
                        Mark all as read
                      </button>
                    ) : (
                      <span>Read</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="portal-dropdown-empty">No notifications right now.</div>
                  ) : notifications.map((item) => {
                    const Icon = item.type === 'complaints' ? MessageSquareWarning : item.type === 'notices' ? Megaphone : CreditCard;
                    return (
                      <button key={item.id} onClick={() => handleNotificationClick(item)}>
                        <Icon size={16} />
                        <span><strong>{item.title}</strong><small>{item.message}</small></span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="portal-action-menu" onClick={(event) => event.stopPropagation()}>
              <button
                className="portal-profile-button"
                aria-label="Account menu"
                aria-expanded={activeMenu === 'account'}
                onClick={() => toggleMenu('account')}
              >
                <span>{(settings.adminName || user?.name || 'A').charAt(0).toUpperCase()}</span>
                <div><strong>{settings.adminName || user?.name || 'Admin'}</strong><small>Administrator</small></div>
                <ChevronDown size={15} />
              </button>
              {activeMenu === 'account' && (
                <div className="portal-dropdown portal-account-panel">
                  <div className="portal-account-card">
                    <span>{(settings.adminName || user?.name || 'A').charAt(0).toUpperCase()}</span>
                    <div><strong>{settings.adminName || user?.name || 'Admin'}</strong><small>{settings.email || user?.email || 'Admin account'}</small></div>
                  </div>
                  <button onClick={() => { navigate('/admin/settings'); closeMenus(); }}>
                    <Settings size={16} />
                    <span><strong>Account settings</strong><small>Edit profile and preferences</small></span>
                  </button>
                  <button onClick={() => { navigate('/admin'); closeMenus(); }}>
                    <UserCircle size={16} />
                    <span><strong>Admin dashboard</strong><small>Back to overview</small></span>
                  </button>
                  <button className="danger" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span><strong>Logout</strong><small>End this session</small></span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="portal-content"><Outlet /></main>
      </div>
    </div>
  );
};

export default AdminLayout;
