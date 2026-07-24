import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell, Building2, CalendarDays, ChevronDown, ClipboardList, CreditCard, FileBarChart, FileCheck2, Home, LogOut,
  Menu, MessageSquareWarning, Moon, ReceiptIndianRupee, Sun, User, Users, X
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
          <span className="portal-brand-mark"><Building2 size={21} /></span>
          <span><strong>{t('common.appName')}</strong><small>{t('common.residentPortal')}</small></span>
          <button className="portal-mobile-close" onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
        <div className="portal-nav-label">{t('nav.mySociety')}</div>
        <nav className="portal-nav">
          {residentLinks.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `portal-nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} /><span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="portal-sidebar-foot">
          <button className="portal-nav-link" onClick={handleLogout}><LogOut size={17} /><span>{t('nav.logout')}</span></button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <button className="portal-menu-button" onClick={() => setOpen(true)}><Menu size={21} /></button>
          <div className="portal-breadcrumb"><span>{t('common.residentPortal')}</span><small>{t('common.welcomeHome')}</small></div>
          <div className="portal-top-actions">
            <LanguageSelector compact />
            <button
              type="button"
              className="portal-theme-toggle"
              onClick={cycleTheme}
              aria-label={t('theme.toggle')}
              aria-pressed={resolvedTheme === 'dark'}
              title={t('theme.toggle')}
            >
              {resolvedTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{resolvedTheme === 'dark' ? t('theme.dark') : t('theme.light')}</span>
            </button>
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
                    <strong>{t('notifications.title')}</strong>
                    <span>{unreadCount > 0 ? t('notifications.new', { count: unreadCount }) : t('notifications.read')}</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="portal-dropdown-empty">{t('notifications.noneAvailable')}</div>
                  ) : notifications.map((item) => {
                    const Icon = item.type === 'payment' ? ReceiptIndianRupee : Bell;
                    return (
                      <button
                        key={item.id}
                        className={item.is_read ? 'read' : 'unread'}
                        onClick={() => handleNotificationClick(item)}
                      >
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
                <span className={profilePhoto ? 'has-photo' : ''}>
                  {profilePhoto ? <img src={profilePhoto} alt="Resident profile" loading="lazy" decoding="async" /> : (user?.name || 'R').charAt(0).toUpperCase()}
                </span>
                <div><strong>{user?.name || 'Resident'}</strong><small>Resident</small></div>
                <ChevronDown size={15} />
              </button>
              {activeMenu === 'account' && (
                <div className="portal-dropdown portal-account-panel">
                  <div className="portal-account-card">
                    <span className={profilePhoto ? 'has-photo' : ''}>
                      {profilePhoto ? <img src={profilePhoto} alt="Resident profile" loading="lazy" decoding="async" /> : (user?.name || 'R').charAt(0).toUpperCase()}
                    </span>
                    <div><strong>{user?.name || 'Resident'}</strong><small>{user?.email || 'Resident account'}</small></div>
                  </div>
                  <button onClick={() => goToPath('/resident/profile')}>
                    <User size={16} />
                    <span><strong>My profile</strong><small>View resident details</small></span>
                  </button>
                  <button onClick={() => goToPath('/resident/maintenance')}>
                    <CreditCard size={16} />
                    <span><strong>Payments</strong><small>Open maintenance bills</small></span>
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
        <main className="portal-content">
          <SocietyRulesAcceptance>
            <Outlet />
          </SocietyRulesAcceptance>
        </main>
      </div>
    </div>
  );
};

export default ResidentLayout;
