import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, flatAPI } from '../services/api';
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
  const [availableFlats, setAvailableFlats] = useState([]);
  const [flatsLoading, setFlatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadAvailableFlats = async () => {
      try {
        const response = await flatAPI.getAvailable();
        setAvailableFlats(response.data);
      } catch (err) {
        setError('Could not load available flats. Please try again later.');
      } finally {
        setFlatsLoading(false);
      }
    };

    loadAvailableFlats();
  }, []);

  const needsFlat = useMemo(() => formData.role === 'resident', [formData.role]);

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

    if (needsFlat && !formData.flat_id) {
      setError('Please select an available flat.');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      if (!response.data.token || response.data.user?.status === 'pending') {
        setSuccess(response.data.message || 'Registration submitted. Please wait for admin approval.');
        setFormData({ name: '', email: '', phone: '', password: '', role: 'resident', flat_id: '' });
        const flats = await flatAPI.getAvailable();
        setAvailableFlats(flats.data);
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

          {needsFlat && (
            <div className="mb-3">
              <label className="form-label">Assigned Flat</label>
              <select
                className="form-control"
                name="flat_id"
                value={formData.flat_id}
                onChange={handleChange}
                required
                disabled={flatsLoading || loading}
              >
                <option value="">{flatsLoading ? 'Loading available flats...' : 'Select available flat'}</option>
                {availableFlats.map((flat) => (
                  <option key={flat.id} value={flat.id}>
                    Wing {flat.wing || 'A'} - Flat {flat.flat_no} - Floor {flat.floor_no}
                  </option>
                ))}
              </select>
              {!flatsLoading && !availableFlats.length && (
                <small className="text-danger">No flats are available for registration right now.</small>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading || (needsFlat && (flatsLoading || !availableFlats.length))}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>

          <p className="text-center mt-3">
            Already have an account? <a href="/login">Login</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
