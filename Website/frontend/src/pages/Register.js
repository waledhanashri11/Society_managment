import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setToken, setUser } from '../utils/auth';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'resident'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      setToken(response.data.token);
      setUser(response.data.user);

      if (response.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/resident');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h2 className="text-2xl font-semibold text-slate-900">Register</h2>
        <p className="mt-2 text-sm text-slate-500">Set up your account and join the community.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="resident">Resident</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-cyan-300"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
