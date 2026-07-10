import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

import { setToken, setUser } from '../utils/auth';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'resident',
    flat_id: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      if (!response.data.token || response.data.user?.status === 'pending') {
        setSuccess(response.data.message || 'Registration submitted. Please wait for admin approval.');
        setFormData({ name: '', email: '', phone: '', password: '', role: 'resident', flat_id: '' });
        return;
      }

      setToken(response.data.token);
      setUser(response.data.user);
      setSuccess('Registration successful. Opening your dashboard...');
      
      if (response.data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/resident/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              className="form-control"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Optional contact number"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Role</label>
            <select
              className="form-control"
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
            className="btn btn-primary w-100 font-bold"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>


          <p className="text-center mt-3">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
