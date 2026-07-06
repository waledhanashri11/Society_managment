import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';

const links = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/residents', label: 'Residents' },
  { to: '/admin/flats', label: 'Flats' },
  { to: '/admin/maintenance', label: 'Maintenance' },
  { to: '/admin/complaints', label: 'Complaints' },
  { to: '/admin/notices', label: 'Notices' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/reports', label: 'Reports' }
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-slate-950 text-slate-100">
        <div className="p-6">
          <h4 className="text-xl font-semibold">Admin Panel</h4>
          <p className="mt-1 text-sm text-slate-400">Society management console</p>
          <nav className="mt-8 space-y-2">
            {links.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              className="mt-4 w-full rounded-xl border border-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              onClick={handleLogout}
            >
              Logout
            </button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
