import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import { setToken, setUser } from '../utils/auth';
import LanguageSelector from '../components/LanguageSelector';
import { useTheme } from '../utils/theme';

const Register = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    societyCode: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { resolvedTheme, cycleTheme } = useTheme();
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
        setFormData({ name: '', email: '', phone: '', password: '', societyCode: '' });
        return;
      }

      localStorage.removeItem('adminSettings');
      setToken(response.data.token);
      setUser(response.data.user);
      setSuccess('Registration successful. Opening your dashboard...');
      
      if (response.data.user.role === 'super_admin') {
        navigate('/super-admin');
      } else if (response.data.user.role === 'admin') {
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
      <div className="auth-topbar">
        <LanguageSelector variant="dark" />
        <button
          type="button"
          onClick={cycleTheme}
          aria-label="Toggle theme"
          className="landing-theme-toggle"
          title={resolvedTheme === 'dark' ? t('theme.lightMode', 'Light Mode') : t('theme.darkMode', 'Dark Mode')}
        >
          {resolvedTheme === 'dark' ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Sun size={15} /> {t('auth.lightMode', 'Light')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <Moon size={15} /> {t('auth.darkMode', 'Dark')}
            </span>
          )}
        </button>
      </div>
      <div className="auth-card">
        <h2>{t('auth.register', 'Register')}</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <div className="mb-3">
            <label className="form-label">{t('auth.fullName', 'Full Name')}</label>
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
            <label className="form-label">{t('auth.email', 'Email')}</label>
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
            <label className="form-label">{t('auth.password', 'Password')}</label>
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
            <label className="form-label">{t('auth.phone', 'Phone')}</label>
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
            <label className="form-label">Society code</label>
            <input
              type="text"
              className="form-control"
              name="societyCode"
              value={formData.societyCode}
              onChange={handleChange}
              placeholder="Society code"
              autoCapitalize="characters"
              maxLength="24"
              required
            />
            <div className="form-text">Ask your society administrator for the code. Your registration is sent only to that society.</div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 font-bold"
            disabled={loading}
          >
            {loading ? t('auth.submitting', 'Submitting...') : t('auth.register', 'Register')}
          </button>

          <p className="text-center mt-3 mb-1">
            {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
            <Link to="/login">{t('auth.login', 'Login')}</Link>
          </p>

          <p className="text-center mt-1">
            <Link to="/forgot-password">{t('auth.forgotPasswordLink', 'Forgot password?')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
