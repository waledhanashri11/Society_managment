import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, Building2, CheckCircle2, Clock, CreditCard, Database,
  IndianRupee, LockKeyhole, Mail, Phone, QrCode, Save, ShieldCheck, Upload, UserCog, X
} from 'lucide-react';
import { getUser, setUser } from '../utils/auth';
import { authAPI, settingsAPI } from '../services/api';

const SETTINGS_KEY = 'adminSettings';

const getDefaultSettings = (user) => ({
  adminName: user?.name || 'Admin',
  societyName: 'Society Management System',
  address: 'Tower A, Green Avenue Society',
  email: user?.email || 'admin@societyhub.com',
  phone: '+91 98765 43210',
  maintenanceAmount: '2500',
  dueDay: '31',
  lateFee: '150',
  autoReminder: true,
  paymentAlerts: true,
  complaintAlerts: true,
  visitorAlerts: false,
  paymentQrImage: '',
  paymentUpiId: '',
  paymentNote: 'Scan this QR to pay maintenance, then submit your transaction ID for admin approval.'
});

const loadSettings = (user) => {
  const defaults = getDefaultSettings(user);
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    return savedSettings ? { ...defaults, ...savedSettings } : defaults;
  } catch (error) {
    return defaults;
  }
};

const AdminSettings = () => {
  const user = getUser();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [error, setError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [settings, setSettings] = useState(() => loadSettings(user));
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    let active = true;
    settingsAPI.get()
      .then(({ data }) => {
        if (!active) return;
        setSettings((current) => ({ ...current, ...data }));
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
      })
      .catch(() => {
        if (active) setError('Could not load backend settings. Showing saved local settings.');
      });

    return () => {
      active = false;
    };
  }, []);

  const adminInitials = useMemo(() => {
    const name = settings.adminName || 'Admin';
    return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }, [settings.adminName]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSettings((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setSaved(false);
  };

  const handleQrUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a QR/scanner image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Please upload a smaller QR image under 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSettings((current) => ({ ...current, paymentQrImage: reader.result }));
      setSaved(false);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const removeQrImage = () => {
    setSettings((current) => ({ ...current, paymentQrImage: '' }));
    setSaved(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    settingsAPI.update(settings)
      .then(({ data }) => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
        if (user) {
          setUser({ ...user, name: data.adminName, email: data.email });
        }
        setSettings((current) => ({ ...current, ...data }));
        window.dispatchEvent(new CustomEvent('adminSettingsUpdated', { detail: data }));
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2600);
      })
      .catch((apiError) => {
        setError(apiError.response?.data?.message || 'Settings could not be saved to backend.');
      })
      .finally(() => setSaving(false));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordError('');
    setPasswordMessage('');
  };

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please fill all password fields.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setChangingPassword(true);
    setPasswordError('');
    setPasswordMessage('');

    authAPI.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
      .then(() => {
        setPasswordMessage('Password changed successfully.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        window.setTimeout(() => {
          setShowPasswordForm(false);
          setPasswordMessage('');
        }, 1800);
      })
      .catch((apiError) => {
        setPasswordError(apiError.response?.data?.message || 'Password could not be changed.');
      })
      .finally(() => setChangingPassword(false));
  };

  return (
    <div className="portal-settings">
      <div className="portal-page-title">
        <div>
          <h1>Settings</h1>
          <p>Manage society profile, billing rules, alerts and admin security.</p>
        </div>
        <div className="portal-date-chip"><ShieldCheck size={15} /> Admin Controls</div>
      </div>

      {saved && (
        <div className="settings-success">
          <CheckCircle2 size={18} />
          <span>Settings saved to backend successfully.</span>
        </div>
      )}

      {error && (
        <div className="settings-error">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="settings-grid">
        <section className="portal-panel settings-profile-card">
          <div className="settings-admin-avatar">{adminInitials}</div>
          <h2>{settings.adminName || 'Admin'}</h2>
          <p>Administrator</p>
          <div className="settings-profile-meta">
            <span><Mail size={14} /> {settings.email}</span>
            <span><Phone size={14} /> {settings.phone}</span>
          </div>
          <button type="button" className="settings-secondary-btn" onClick={() => setShowPasswordForm((current) => !current)}>
            <LockKeyhole size={15} /> Change Password
          </button>
          {showPasswordForm && (
            <div className="settings-password-box">
              {passwordMessage && <div className="settings-mini-success">{passwordMessage}</div>}
              {passwordError && <div className="settings-mini-error">{passwordError}</div>}
              <input
                name="currentPassword"
                type="password"
                placeholder="Current password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
              />
              <input
                name="newPassword"
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
              />
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
              />
              <button type="button" className="settings-password-save" disabled={changingPassword} onClick={handleChangePassword}>
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}
        </section>

        <section className="portal-panel settings-card settings-wide">
          <div className="portal-panel-head">
            <div>
              <h2>Society Information</h2>
              <p>Shown across admin and resident screens.</p>
            </div>
            <Building2 size={20} />
          </div>
          <div className="settings-form">
            <label>
              Admin Name
              <input name="adminName" value={settings.adminName} onChange={handleChange} />
            </label>
            <label>
              Society Name
              <input name="societyName" value={settings.societyName} onChange={handleChange} />
            </label>
            <label>
              Address
              <input name="address" value={settings.address} onChange={handleChange} />
            </label>
            <label>
              Email
              <input name="email" type="email" value={settings.email} onChange={handleChange} />
            </label>
            <label>
              Phone
              <input name="phone" value={settings.phone} onChange={handleChange} />
            </label>
          </div>
        </section>

        <section className="portal-panel settings-card">
          <div className="portal-panel-head">
            <div>
              <h2>Maintenance Rules</h2>
              <p>Default monthly billing setup.</p>
            </div>
            <IndianRupee size={20} />
          </div>
          <div className="settings-form">
            <label>
              Monthly Amount
              <input name="maintenanceAmount" type="number" value={settings.maintenanceAmount} onChange={handleChange} />
            </label>
            <label>
              Due Day
              <input name="dueDay" type="number" min="1" max="31" value={settings.dueDay} onChange={handleChange} />
            </label>
            <label>
              Late Fee
              <input name="lateFee" type="number" value={settings.lateFee} onChange={handleChange} />
            </label>
          </div>
        </section>

        <section className="portal-panel settings-card settings-wide">
          <div className="portal-panel-head">
            <div>
              <h2>Payment Scanner</h2>
              <p>Resident Pay Now screen will show this QR for manual payment.</p>
            </div>
            <QrCode size={20} />
          </div>
          <div className="settings-payment-scanner">
            <div className="settings-qr-preview">
              {settings.paymentQrImage ? (
                <>
                  <img src={settings.paymentQrImage} alt="Maintenance payment scanner" loading="lazy" decoding="async" />
                  <button type="button" onClick={removeQrImage}><X size={14} /> Remove</button>
                </>
              ) : (
                <div>
                  <QrCode size={36} />
                  <strong>No QR uploaded</strong>
                  <span>Upload your UPI scanner image here.</span>
                </div>
              )}
            </div>
            <div className="settings-form settings-form-plain">
              <label>
                Upload QR / Scanner
                <span className="settings-upload-button">
                  <Upload size={15} /> Choose image
                  <input type="file" accept="image/*" onChange={handleQrUpload} />
                </span>
              </label>
              <label>
                UPI ID / Payment Name
                <input name="paymentUpiId" value={settings.paymentUpiId || ''} onChange={handleChange} placeholder="example@upi" />
              </label>
              <label className="settings-field-full">
                Payment Instructions
                <textarea name="paymentNote" rows="3" value={settings.paymentNote || ''} onChange={handleChange} />
              </label>
            </div>
          </div>
        </section>

        <section className="portal-panel settings-card">
          <div className="portal-panel-head">
            <div>
              <h2>Notifications</h2>
              <p>Choose which admin alerts should stay active.</p>
            </div>
            <Bell size={20} />
          </div>
          <div className="settings-toggle-list">
            <label><input type="checkbox" name="autoReminder" checked={settings.autoReminder} onChange={handleChange} /><span><Clock size={15} /> Payment due reminders</span></label>
            <label><input type="checkbox" name="paymentAlerts" checked={settings.paymentAlerts} onChange={handleChange} /><span><CreditCard size={15} /> Payment alerts</span></label>
            <label><input type="checkbox" name="complaintAlerts" checked={settings.complaintAlerts} onChange={handleChange} /><span><UserCog size={15} /> Complaint updates</span></label>
            <label><input type="checkbox" name="visitorAlerts" checked={settings.visitorAlerts} onChange={handleChange} /><span><Bell size={15} /> Visitor approvals</span></label>
          </div>
        </section>

        <section className="portal-panel settings-card settings-wide">
          <div className="portal-panel-head">
            <div>
              <h2>System Status</h2>
              <p>Quick health view for the admin workspace.</p>
            </div>
            <Database size={20} />
          </div>
          <div className="settings-status-grid">
            <div><span>Database</span><strong>Connected</strong></div>
            <div><span>Payments</span><strong>Ready</strong></div>
            <div><span>Complaints</span><strong>Active</strong></div>
            <div><span>Visitors</span><strong>Active</strong></div>
          </div>
        </section>

        <div className="settings-actions settings-wide">
          <button type="submit" className="settings-save-btn" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;
