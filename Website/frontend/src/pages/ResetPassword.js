import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authAPI.resetPassword({ token, newPassword: formData.newPassword });
      setMessage(data.message || 'Password reset successfully.');
      window.setTimeout(() => navigate('/login'), 1800);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <p className="auth-helper">Create a new password for your account.</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          <div className="mb-3">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-control"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <p className="text-center mt-3">
            Back to <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
