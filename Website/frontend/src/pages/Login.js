import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import { setToken, setUser } from '../utils/auth';
import LanguageSelector from '../components/LanguageSelector';
import { useTheme } from '../utils/theme';

const Login = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
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
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      localStorage.removeItem('adminSettings');
      setToken(response.data.token);
      setUser(response.data.user);
      
      if (response.data.user.role === 'admin' || response.data.user.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/resident/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.message
        || (err.request ? 'Cannot connect to the server. Please check the backend deployment and API URL.' : 'Login failed. Please try again.')
      );
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
        <h2>{t('common.societyManagement', 'Society Management')}</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}
          
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
            />
            <div className="auth-small-link">
              <Link to="/forgot-password">{t('auth.forgotPasswordLink', 'Forgot password?')}</Link>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? t('auth.loggingIn', 'Logging in...') : t('auth.login', 'Login')}
          </button>

          <p className="text-center mt-3">
            {t('auth.dontHaveAccount', "Don't have an account?")}{' '}
            <Link to="/register">{t('auth.register', 'Register')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
