import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';

const ResidentLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white">
        <div className="p-6">
          <h4 className="text-xl font-semibold">Resident Portal</h4>
          <nav className="mt-6 space-y-2">
            <Link
              to="/resident"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              🏠 Dashboard
            </Link>

            <button
              onClick={handleLogout}
              className="w-full text-left rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              🔓 Logout
            </button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default ResidentLayout;
