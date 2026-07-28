import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell, Building2, CalendarDays, ChevronDown, ClipboardList, CreditCard, FileBarChart, FileCheck2, FileText, Home, Languages, LogOut, Menu, Moon, Sun,
  Megaphone, MessageSquareWarning, Settings, UserCircle, Users, X
} from 'lucide-react';
import { getUser, logout } from '../utils/auth';
import { useTheme } from '../utils/theme';
import { notificationAPI, settingsAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import '../portal.css';

const adminLinks = [
  { to: '/admin/dashboard', labelKey: 'nav.dashboard', icon: Home },
  { to: '/admin/residents', labelKey: 'nav.residents', icon: Users },
  { to: '/admin/flats', labelKey: 'nav.flats', icon: Building2 },
  { to: '/admin/meetings', labelKey: 'nav.meetings', icon: CalendarDays },
  { to: '/admin/maintenance', labelKey: 'nav.maintenance', icon: ClipboardList },
  { to: '/admin/agm-report', labelKey: 'nav.agmReport', icon: FileText },
  { to: '/admin/complaints', labelKey: 'nav.complaints', icon: MessageSquareWarning },
  { to: '/admin/notices', labelKey: 'nav.notices', icon: Megaphone },
  { to: '/admin/society-rules', labelKey: 'nav.societyRules', icon: FileText },
  { to: '/admin/reports', labelKey: 'nav.reports', icon: FileBarChart },
  { to: '/admin/noc-management', labelKey: 'nav.nocManagement', icon: FileCheck2 },
  { to: '/admin/settings', labelKey: 'nav.settings', icon: Settings }
];

const AdminLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const { resolvedTheme, cycleTheme } = useTheme();
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
          <span className="portal-brand-mark">{Building2 ? <Building2 size={21} /> : null}</span>
          <span><strong>{t('common.appName')}</strong><small>{settings.societyName || t('common.managementSystem')}</small></span>
          <button className="portal-mobile-close" onClick={() => setOpen(false)}>{X ? <X size={19} /> : null}</button>
        </div>
        <div className="portal-nav-label">{t('nav.workspace')}</div>
        <nav className="portal-nav">
          {adminLinks.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `portal-nav-link ${isActive ? 'active' : ''}`}>
              {Icon ? <Icon size={17} /> : null}<span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="portal-sidebar-foot">
          <button className="portal-nav-link" onClick={handleLogout}>{LogOut ? <LogOut size={17} /> : null}<span>{t('nav.logout')}</span></button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <button className="portal-menu-button" onClick={() => setOpen(true)}>{Menu ? <Menu size={21} /> : null}</button>
          <div className="portal-breadcrumb">
            <span>{settings.societyName || t('common.societyManagement')}</span><small>{t('common.adminWorkspace')}</small>
          </div>
          <div className="portal-top-actions">
            <div className="portal-action-menu" onClick={(event) => event.stopPropagation()}>
              <button
                className="portal-notification"
                aria-label="Notifications"
                aria-expanded={activeMenu === 'notifications'}
                onClick={() => toggleMenu('notifications')}
              >
                {Bell ? <Bell size={18} /> : null}
                {unreadCount > 0 && <span className="portal-notification-badge">{unreadCount}</span>}
              </button>
              {activeMenu === 'notifications' && (
                <div className="portal-dropdown portal-notification-panel">
                  <div className="portal-dropdown-head">
                    <strong>{t('notifications.title', 'Notifications')}</strong>
                    {notifications.length > 0 || unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={markAllRead}
                        style={{
                          border: 0,
                          padding: '4px 10px',
                          color: '#1769e0',
                          background: '#eaf2ff',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          width: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        ✓ {t('notifications.markAllRead', 'Mark all read')}
                      </button>
                    ) : (
                      <span>{t('notifications.read', 'All caught up')}</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="portal-dropdown-empty">{t('notifications.none')}</div>
                  ) : notifications.map((item) => {
                    const NotifIcon = item.type === 'complaints' ? MessageSquareWarning : item.type === 'notices' ? Megaphone : CreditCard;
                    return (
                      <button key={item.id} onClick={() => handleNotificationClick(item)}>
                        {NotifIcon ? <NotifIcon size={16} /> : null}
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
                <span className={settings.profilePicture ? 'has-photo' : ''}>
                  {settings.profilePicture ? (
                    <img src={settings.profilePicture} alt="Admin profile" />
                  ) : (
                    (settings.adminName || user?.name || 'A').charAt(0).toUpperCase()
                  )}
                </span>
                <div><strong>{settings.adminName || user?.name || 'Admin'}</strong><small>{user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}</small></div>
                {ChevronDown ? <ChevronDown size={15} /> : null}
              </button>
              {activeMenu === 'account' && (
                <div className="portal-dropdown portal-account-panel">
                  <div className="portal-account-card">
                    <span className={settings.profilePicture ? 'has-photo' : ''}>
                      {settings.profilePicture ? (
                        <img src={settings.profilePicture} alt="Admin profile" />
                      ) : (
                        (settings.adminName || user?.name || 'A').charAt(0).toUpperCase()
                      )}
                    </span>
                    <div><strong>{settings.adminName || user?.name || 'Admin'}</strong><small>{settings.email || user?.email || 'Admin account'}</small></div>
                  </div>
                  {/* 1. My Profile */}
                  <button onClick={() => { navigate('/admin/settings'); closeMenus(); }}>
                    {UserCircle ? <UserCircle size={16} /> : null}
                    <span><strong>{t('nav.myProfile', 'My Profile')}</strong><small>View admin profile details</small></span>
                  </button>
                  {/* 2. Settings */}
                  <button onClick={() => { navigate('/admin/settings'); closeMenus(); }}>
                    {Settings ? <Settings size={16} /> : null}
                    <span><strong>{t('nav.settings', 'Settings')}</strong><small>Edit profile & preferences</small></span>
                  </button>
                  {/* 3. Language */}
                  <div className="portal-dropdown-language-item">
                    <div className="portal-dropdown-item-left">
                      {Languages ? <Languages size={16} /> : null}
                      <div>
                        <strong>{t('language.label', 'Language')}</strong>
                        <small>{t('language.select', 'Select language')}</small>
                      </div>
                    </div>
                    {LanguageSelector ? <LanguageSelector compact showIcon={false} /> : null}
                  </div>
                  {/* 4. Dark Mode */}
                  <button type="button" onClick={() => { cycleTheme(); }}>
                    {resolvedTheme === 'dark' ? (Sun ? <Sun size={16} /> : null) : (Moon ? <Moon size={16} /> : null)}
                    <span><strong>{t('theme.appearance', 'Dark Mode')}</strong><small>{resolvedTheme === 'dark' ? t('theme.darkModeOn', 'Dark Mode: ON') : t('theme.darkModeOff', 'Dark Mode: OFF')}</small></span>
                  </button>
                  {/* 5. Logout */}
                  <button className="danger" onClick={handleLogout}>
                    {LogOut ? <LogOut size={16} /> : null}
                    <span><strong>{t('nav.logout', 'Logout')}</strong><small>End this session</small></span>
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
