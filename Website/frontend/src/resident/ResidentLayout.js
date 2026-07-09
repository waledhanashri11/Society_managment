import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell, Building2, Car, ChevronDown, ClipboardList, CreditCard, Home, LogOut,
  Menu, MessageSquareWarning, ReceiptIndianRupee, User, X
} from 'lucide-react';
import { getUser, logout } from '../utils/auth';
import { maintenanceAPI, noticeAPI } from '../services/api';
import '../portal.css';

const residentLinks = [
  { to: '/resident', label: 'Dashboard', icon: Home, end: true },
  { to: '/resident/maintenance', label: 'Maintenance', icon: CreditCard },
  { to: '/resident/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/resident/notices', label: 'Notices', icon: Bell },
  { href: '#vehicles', label: 'My Vehicles', icon: Car },
  { to: '/resident/profile', label: 'My Profile', icon: User },
  { to: '/resident/payment-history', label: 'Payment History', icon: ClipboardList }
];

const getProfilePhotoKey = (user) => `residentProfilePhoto:${user?.id || user?.email || 'current'}`;

const ResidentLayout = () => {
  const navigate = useNavigate();
  const user = getUser();
  const profilePhotoKey = getProfilePhotoKey(user);
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      noticeAPI.getAll(),
      maintenanceAPI.getUserMaintenance()
    ]).then((results) => {
      if (!active) return;
      const notices = results[0].status === 'fulfilled' ? results[0].value.data || [] : [];
      const bills = results[1].status === 'fulfilled' ? results[1].value.data || [] : [];
      const pendingBills = bills.filter((bill) => bill.payment_status !== 'Paid');
      const items = [
        ...pendingBills.slice(0, 2).map((bill) => ({
          id: `bill-${bill.id}`,
          title: 'Maintenance payment due',
          message: `${bill.bill_number || `Bill #${bill.id}`} is waiting for payment`,
          type: 'payment',
          path: '/resident/maintenance'
        })),
        ...notices.slice(0, 3).map((notice) => ({
          id: `notice-${notice.id}`,
          title: notice.title,
          message: notice.description || 'New society notice',
          type: 'notice',
          path: '/resident/notices'
        }))
      ];
      setNotifications(items);
      setUnreadCount(items.length);
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const toggleMenu = (menuName) => {
    setActiveMenu((current) => (current === menuName ? '' : menuName));
    if (menuName === 'notifications') setUnreadCount(0);
  };

  const goToHash = (hash) => {
    closeMenus();
    navigate('/resident');
    window.setTimeout(() => {
      window.location.hash = hash;
    }, 0);
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
          <span><strong>SocietyHub</strong><small>Resident Portal</small></span>
          <button className="portal-mobile-close" onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
        <div className="portal-nav-label">My society</div>
        <nav className="portal-nav">
          {residentLinks.map(({ to, href, label, icon: Icon, end }) => to ? (
            <NavLink key={label} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `portal-nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} /><span>{label}</span>
            </NavLink>
          ) : (
            <a key={label} href={href} className="portal-nav-link" onClick={() => setOpen(false)}>
              <Icon size={17} /><span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="portal-sidebar-foot">
          <button className="portal-nav-link" onClick={handleLogout}><LogOut size={17} /><span>Logout</span></button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <button className="portal-menu-button" onClick={() => setOpen(true)}><Menu size={21} /></button>
          <div className="portal-breadcrumb"><span>Resident Portal</span><small>Welcome home</small></div>
          <div className="portal-top-actions">
            <div className="portal-action-menu" onClick={(event) => event.stopPropagation()}>
              <button
                className="portal-notification"
                aria-label="Notifications"
                aria-expanded={activeMenu === 'notifications'}
                onClick={() => toggleMenu('notifications')}
              >
                <Bell size={18} />
                {unreadCount > 0 && <i />}
              </button>
              {activeMenu === 'notifications' && (
                <div className="portal-dropdown portal-notification-panel">
                  <div className="portal-dropdown-head">
                    <strong>Notifications</strong>
                    <span>{unreadCount > 0 ? `${unreadCount} new` : 'Read'}</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="portal-dropdown-empty">No notifications right now.</div>
                  ) : notifications.map((item) => {
                    const Icon = item.type === 'payment' ? ReceiptIndianRupee : Bell;
                    return (
                      <button key={item.id} onClick={() => item.path ? goToPath(item.path) : goToHash(item.hash)}>
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
                  {profilePhoto ? <img src={profilePhoto} alt="Resident profile" /> : (user?.name || 'R').charAt(0).toUpperCase()}
                </span>
                <div><strong>{user?.name || 'Resident'}</strong><small>Resident</small></div>
                <ChevronDown size={15} />
              </button>
              {activeMenu === 'account' && (
                <div className="portal-dropdown portal-account-panel">
                  <div className="portal-account-card">
                    <span className={profilePhoto ? 'has-photo' : ''}>
                      {profilePhoto ? <img src={profilePhoto} alt="Resident profile" /> : (user?.name || 'R').charAt(0).toUpperCase()}
                    </span>
                    <div><strong>{user?.name || 'Resident'}</strong><small>{user?.email || 'Resident account'}</small></div>
                  </div>
                  <button onClick={() => goToPath('/resident/profile')}>
                    <User size={16} />
                    <span><strong>My profile</strong><small>View resident details</small></span>
                  </button>
                  <button onClick={() => goToHash('#maintenance')}>
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
        <main className="portal-content"><Outlet /></main>
      </div>
    </div>
  );
};

export default ResidentLayout;
