import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell, Building2, CalendarDays, ChevronDown, ClipboardList, CreditCard, FileBarChart, FileCheck2, Home, Languages, LogOut,
  Menu, MessageSquareWarning, Moon, ReceiptIndianRupee, Settings, Sun, User, Users, X
} from 'lucide-react';
import { getUser, logout } from '../utils/auth';
import { useTheme } from '../utils/theme';
import { notificationAPI } from '../services/api';
import SocietyRulesAcceptance from './SocietyRulesAcceptance';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import '../portal.css';

const residentLinks = [
  { to: '/resident/dashboard', labelKey: 'nav.dashboard', icon: Home },
  { to: '/resident/maintenance', labelKey: 'nav.maintenance', icon: CreditCard },
  { to: '/resident/meetings', labelKey: 'nav.meetings', icon: CalendarDays },
  { to: '/resident/complaints', labelKey: 'nav.complaints', icon: MessageSquareWarning },
  { to: '/resident/notices', labelKey: 'nav.notices', icon: Bell },
  { to: '/resident/society-rules', labelKey: 'nav.societyRules', icon: ClipboardList },
  { to: '/resident/members', labelKey: 'nav.members', icon: Users },
  { to: '/resident/my-nocs', labelKey: 'nav.myNocs', icon: FileCheck2 },
  { to: '/resident/profile', labelKey: 'nav.myProfile', icon: User },
  { to: '/resident/payments', labelKey: 'nav.payments', icon: ClipboardList },
  { to: '/resident/reports', labelKey: 'nav.reports', icon: FileBarChart }
];

const getProfilePhotoKey = (user) => `residentProfilePhoto:${user?.id || user?.email || 'current'}`;

const ResidentLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getUser();
  const profilePhotoKey = getProfilePhotoKey(user);
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const { resolvedTheme, cycleTheme } = useTheme();
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem(profilePhotoKey) || '');

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeMenus = () => setActiveMenu('');

  useEffect(() => {
    const refreshPhoto = (event) => {
      if (event.detail?.key && event.detail.key !== profilePhotoKey) return;
      setProfilePhoto(localStorage.getItem(profilePhotoKey) || '');
    };

    window.addEventListener('residentProfilePhotoUpdated', refreshPhoto);
    window.addEventListener('storage', refreshPhoto);
    return () => {
      window.removeEventListener('residentProfilePhotoUpdated', refreshPhoto);
      window.removeEventListener('storage', refreshPhoto);
    };
  }, [profilePhotoKey]);

  const loadNotifications = useCallback((force = false) => {
    if (notificationsLoaded && !force) return;
    notificationAPI.getResident()
      .then(({ data }) => {
        const items = data.notifications || data || [];
        setNotifications(items);
        setUnreadCount(data.unreadCount ?? items.filter((item) => !item.is_read).length);
        setNotificationsLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load notifications:', err);
      });
  }, [notificationsLoaded]);

  useEffect(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  const toggleMenu = (menuName) => {
    setActiveMenu((current) => (current === menuName ? '' : menuName));
    if (menuName === 'notifications') {
      loadNotifications(true);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      if (notificationAPI.markAllRead) {
        await notificationAPI.markAllRead().catch(() => {});
      } else if (notificationAPI.markRead) {
        await notificationAPI.markRead('all').catch(() => {});
      }
    } catch (e) {}
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleNotificationClick = (item) => {
    if (!item.is_read) {
      notificationAPI.markRead(item.id)
        .then(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== item.id));
          setUnreadCount((prev) => Math.max(0, prev - 1));
        })
        .catch((err) => console.error('Failed to mark notification read:', err));
    }
    const path = item.path || (item.type === 'notice' ? '/resident/notices' : '/resident/dashboard');
    goToPath(path);
  };

  const goToPath = (path) => {
    closeMenus();
    navigate(path);
  };

  return (
    <div className="portal-layout portal-resident" onClick={closeMenus}>
      {open && <button className="portal-scrim" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <aside className={`portal-sidebar ${open ? 'is-open' : ''}`}>
        <div className="portal-brand">
          <span className="portal-brand-mark">{Building2 ? <Building2 size={21} /> : null}</span>
          <span><strong>{t('common.appName')}</strong><small>{t('common.residentPortal')}</small></span>
          <button className="portal-mobile-close" onClick={() => setOpen(false)}>{X ? <X size={19} /> : null}</button>
        </div>
        <div className="portal-nav-label">{t('nav.mySociety')}</div>
        <nav className="portal-nav">
          {residentLinks.map(({ to, labelKey, icon: Icon, end }) => (
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
          <div className="portal-breadcrumb"><span>{t('common.residentPortal')}</span><small>{t('common.welcomeHome')}</small></div>
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
                        onClick={handleMarkAllRead}
                        style={{
                          border: 0,
                          padding: '4px 10px',
                          color: '#087d40',
                          background: '#e8f8ef',
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
                    <div className="portal-dropdown-empty">{t('notifications.noneAvailable')}</div>
                  ) : notifications.map((item) => {
                    const NotifIcon = item.type === 'payment' ? ReceiptIndianRupee : Bell;
                    return (
                      <button
                        key={item.id}
                        className={item.is_read ? 'read' : 'unread'}
                        onClick={() => handleNotificationClick(item)}
                      >
                        {NotifIcon ? <NotifIcon size={16} /> : null}
                        <span><strong>{item.title}</strong><small>{item.message}</small></span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {LanguageSelector ? <LanguageSelector compact showIcon={true} style={{ marginRight: '8px' }} /> : null}

            <div className="portal-action-menu" onClick={(event) => event.stopPropagation()}>
              <button
                className="portal-profile-button"
                aria-label="Account menu"
                aria-expanded={activeMenu === 'account'}
                onClick={() => toggleMenu('account')}
              >
                <span className={profilePhoto ? 'has-photo' : ''}>
                  {profilePhoto ? <img src={profilePhoto} alt="Resident profile" loading="lazy" decoding="async" /> : (user?.name || 'R').charAt(0).toUpperCase()}
                </span>
                <div><strong>{user?.name || 'Resident'}</strong><small>Resident</small></div>
                {ChevronDown ? <ChevronDown size={15} /> : null}
              </button>
              {activeMenu === 'account' && (
                <div className="portal-dropdown portal-account-panel">
                  <div className="portal-account-card">
                    <span className={profilePhoto ? 'has-photo' : ''}>
                      {profilePhoto ? <img src={profilePhoto} alt="Resident profile" loading="lazy" decoding="async" /> : (user?.name || 'R').charAt(0).toUpperCase()}
                    </span>
                    <div><strong>{user?.name || 'Resident'}</strong><small>{user?.email || 'Resident account'}</small></div>
                  </div>
                  {/* 1. My Profile */}
                  <button onClick={() => goToPath('/resident/profile')}>
                    {User ? <User size={16} /> : null}
                    <span><strong>{t('nav.myProfile', 'My Profile')}</strong><small>View resident details</small></span>
                  </button>
                  {/* 2. Settings */}
                  <button onClick={() => goToPath('/resident/profile')}>
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
        <main className="portal-content">
          {SocietyRulesAcceptance ? (
            <SocietyRulesAcceptance>
              <Outlet />
            </SocietyRulesAcceptance>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

export default ResidentLayout;
