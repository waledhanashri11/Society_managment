import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data } = await authAPI.forgotPassword({ email });
      setMessage(data.message || 'If this email exists, a reset link has been sent.');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Could not send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('auth.forgotPasswordTitle', 'Forgot Password')}</h2>
        <p className="auth-helper">{t('auth.forgotPasswordHelper', 'Enter your email and we will send a password reset link.')}</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          <div className="mb-3">
            <label className="form-label">{t('auth.email', 'Email')}</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? t('auth.submitting', 'Submitting...') : t('auth.sendResetLink', 'Send Reset Link')}
          </button>

          <p className="text-center mt-3">
            {t('auth.rememberPassword', 'Remember password?')}{' '}
            <Link to="/login">{t('auth.login', 'Login')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
