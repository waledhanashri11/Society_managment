import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, Building2, CheckCircle2, Clock, CreditCard,
  LockKeyhole, Mail, Moon, Phone, QrCode, Save, ShieldCheck, Sun, Upload, UserCog, X,
  SlidersHorizontal, Users, FilePlus, Search, UserCheck, Receipt
} from 'lucide-react';
import { getUser } from '../utils/auth';
import { useTheme } from '../utils/theme';
import { authAPI, settingsAPI, maintenanceAPI, residentsAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import './maintenance.css';

const SETTINGS_KEY = 'adminSettings';

const getDefaultSettings = () => ({
  societyName: '',
  address: '',
  phone: '',
  maintenanceAmount: '',
  dueDay: '',
  lateFee: '',
  autoReminder: true,
  paymentAlerts: true,
  complaintAlerts: true,
  visitorAlerts: false,
  paymentQrImage: '',
  paymentUpiId: '',
  paymentNote: ''
});

const loadSettings = () => {
  const defaults = getDefaultSettings();
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    return savedSettings ? { ...defaults, ...savedSettings } : defaults;
  } catch (error) {
    return defaults;
  }
};

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function SettingsModal({ title, subtitle, onClose, children }) {
  return (
    <div className="mm-modal-backdrop" role="presentation" onMouseDown={onClose} style={{ zIndex: 1000 }}>
      <div className="mm-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mm-modal-head">
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button className="mm-icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}

const AdminSettings = () => {
  const { t } = useTranslation();
  const user = getUser();
  const { mode: themeMode, resolvedTheme, setThemeMode } = useTheme();
  const [tab, setTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [settings, setSettings] = useState(() => loadSettings());
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Resident categories state
  const [residentCategories, setResidentCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingResCats, setLoadingResCats] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Manual bill modal state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualStep, setManualStep] = useState(1);
  const [residentsList, setResidentsList] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);
  const [manualForm, setManualForm] = useState({
    title: '',
    category: 'Repair Charges',
    customCategory: '',
    amount: '',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: ''
  });
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState('');

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const handleOpenManualBillModal = async () => {
    setManualModalOpen(true);
    setManualStep(1);
    setSelectedResident(null);
    setResidentSearch('');
    setManualError('');
    setManualForm({
      title: '',
      category: 'Repair Charges',
      customCategory: '',
      amount: '',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      description: ''
    });

    if (residentsList.length === 0) {
      setLoadingResidents(true);
      try {
        const response = await residentsAPI.getAll();
        const data = response.data?.data || response.data || response || [];
        setResidentsList(Array.isArray(data) ? data : []);
      } catch (err) {
        setManualError('Failed to load residents list.');
      } finally {
        setLoadingResidents(false);
      }
    }
  };

  const filteredResidents = useMemo(() => {
    if (!residentSearch.trim()) return residentsList;
    const q = residentSearch.toLowerCase().trim();
    return residentsList.filter(r => 
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.flat_no && String(r.flat_no).toLowerCase().includes(q)) ||
      (r.phone && String(r.phone).includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q))
    );
  }, [residentsList, residentSearch]);

  const handleSelectResident = (res) => {
    setSelectedResident(res);
    setManualStep(2);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResident) {
      setManualError('Please select a resident.');
      return;
    }
    if (!manualForm.title.trim()) {
      setManualError('Bill title is required.');
      return;
    }
    if (!manualForm.amount || Number(manualForm.amount) <= 0) {
      setManualError('Please enter a valid positive bill amount.');
      return;
    }

    setSubmittingManual(true);
    setManualError('');

    try {
      const payload = {
        residentId: selectedResident.id,
        flatId: selectedResident.flat_id,
        title: manualForm.title.trim(),
        category: manualForm.category === 'Other' && manualForm.customCategory.trim() ? manualForm.customCategory.trim() : manualForm.category,
        customCategory: manualForm.customCategory.trim(),
        amount: Number(manualForm.amount),
        dueDate: manualForm.dueDate,
        description: manualForm.description.trim(),
        notes: manualForm.description.trim()
      };

      await maintenanceAPI.createManualBill(payload);
      notify('Manual bill generated successfully!');
      setManualModalOpen(false);
    } catch (err) {
      setManualError(err.response?.data?.message || err.message || 'Could not generate manual bill.');
    } finally {
      setSubmittingManual(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    settingsAPI.get()
      .then(({ data }) => {
        if (!active) return;
        setSettings((current) => ({ ...current, ...data }));
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
      })
      .catch(() => {
        if (active) setError('Could not load backend settings. Showing saved local settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const loadResidentCategoriesData = async () => {
    setLoadingResCats(true);
    try {
      const [resCatsResult, categoriesResult] = await Promise.all([
        maintenanceAPI.getResidentCategories(),
        maintenanceAPI.getCategories()
      ]);
      setResidentCategories(resCatsResult.data?.data || resCatsResult.data || []);
      setCategories(categoriesResult.data?.data || categoriesResult.data || []);
    } catch (err) {
      setError('Could not load resident maintenance categories.');
    } finally {
      setLoadingResCats(false);
    }
  };

  useEffect(() => {
    if (tab === 'resident-categories') {
      loadResidentCategoriesData();
    }
  }, [tab]);

  const activeCategories = useMemo(() => {
    return categories.filter(c => c.active);
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return activeCategories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeCategories, searchQuery]);

  const adminInitials = useMemo(() => {
    const name = user?.name || 'Admin';
    return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }, [user?.name]);

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

  const handleProfilePicUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Please upload a smaller image under 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSettings((current) => ({ ...current, profilePicture: reader.result }));
      setSaved(false);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePicture = () => {
    setSettings((current) => ({ ...current, profilePicture: '' }));
    setSaved(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    settingsAPI.update(settings)
      .then(({ data }) => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
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

  const handleEditResident = async (flat) => {
    setSelectedFlat(flat);
    setSearchQuery('');
    setSelectedCategories([]);
    try {
      const response = await maintenanceAPI.getFlatCategories(flat.flat_id);
      setSelectedCategories(response.data?.data || response.data || []);
    } catch (err) {
      notify('Failed to load category assignments. Using cached assignments.');
      setSelectedCategories(flat.assigned_category_ids || []);
    }
  };

  const handleSaveResidentCategories = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceAPI.saveFlatCategories(selectedFlat.flat_id, selectedCategories);
      notify('Categories updated successfully');
      
      // Update local state immediately without refresh
      setResidentCategories(prev => prev.map(f => {
        if (f.flat_id === selectedFlat.flat_id) {
          return {
            ...f,
            assigned_category_ids: selectedCategories
          };
        }
        return f;
      }));
            setSelectedFlat(null);
    } catch (err) {
      setError('Could not save category assignments.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const targets = residentCategories
        .filter(f => selectedRows.includes(f.flat_id))
        .map(f => ({ flatId: f.flat_id, residentId: f.resident_id }));

      await maintenanceAPI.bulkAssignResidentCategories({
        targets,
        categoryIds: selectedCategories
      });
      notify('Bulk categories assigned successfully');
      
      // Update local state immediately
      setResidentCategories(prev => prev.map(f => {
        if (selectedRows.includes(f.flat_id)) {
          return {
            ...f,
            assigned_category_ids: selectedCategories
          };
        }
        return f;
      }));

      setBulkModalOpen(false);
      setSelectedRows([]);
    } catch (err) {
      setError('Could not perform bulk assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-settings">
      <div className="portal-page-title">
        <div>
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </div>
        <div className="portal-date-chip"><ShieldCheck size={15} /> {t('settings.adminControls')}</div>
      </div>

      {toast && <div className="mm-toast"><CheckCircle2 size={18} />{toast}</div>}

      {saved && (
        <div className="settings-success">
          <CheckCircle2 size={18} />
          <span>{t('settings.savedSuccess')}</span>
        </div>
      )}

      {error && (
        <div className="settings-error">
          <span>{error}</span>
        </div>
      )}

      <div className="mm-tabs" role="tablist" style={{ marginBottom: '22px' }}>
        <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>
          <UserCog size={17} /> {t('settings.societyAndAccount')}
        </button>
      </div>

      {loading ? (
        <div className="mm-skeleton-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[1, 2, 3].map((i) => <div key={i} className="mm-skeleton" />)}
        </div>
      ) : tab === 'general' ? (
        <form onSubmit={handleSubmit} className="settings-grid">
          <section className="portal-panel settings-profile-card">
            <div className="settings-avatar-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div className="settings-admin-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
                {settings.profilePicture ? (
                  <img src={settings.profilePicture} alt="Admin" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  adminInitials
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  className="settings-photo-btn"
                  onClick={() => document.getElementById('admin-profile-pic-input').click()}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Upload size={12} /> {t('settings.upload')}
                </button>
                {settings.profilePicture && (
                  <button
                    type="button"
                    className="settings-photo-btn"
                    onClick={removeProfilePicture}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #fee2e2',
                      background: '#fef2f2',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <X size={12} /> {t('settings.remove')}
                  </button>
                )}
              </div>
              <input
                id="admin-profile-pic-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleProfilePicUpload}
              />
            </div>
            <h2>{user?.name || 'Admin'}</h2>
            <p>{t('common.administrator')}</p>
            <div className="settings-profile-meta">
              <span><Mail size={14} /> {user?.email}</span>
              {user?.phone && <span><Phone size={14} /> {user.phone}</span>}
            </div>
            <button type="button" className="settings-secondary-btn" onClick={() => setShowPasswordForm((current) => !current)}>
              <LockKeyhole size={15} /> {t('profile.changePassword')}
            </button>
            {showPasswordForm && (
              <div className="settings-password-box">
                {passwordMessage && <div className="settings-mini-success">{passwordMessage}</div>}
                {passwordError && <div className="settings-mini-error">{passwordError}</div>}
                <input
                  name="currentPassword"
                  type="password"
                  placeholder={t('profile.currentPassword')}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                />
                <input
                  name="newPassword"
                  type="password"
                  placeholder={t('profile.newPassword')}
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                />
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder={t('profile.confirmPassword')}
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                />
                <button type="button" className="settings-password-save" disabled={changingPassword} onClick={handleChangePassword}>
                  {changingPassword ? t('common.updating') : t('profile.updatePassword')}
                </button>
              </div>
            )}
            <div className="appearance-card">
              <div className="appearance-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <strong>{t('theme.appearance')}</strong>
                  <small style={{ display: 'block', marginTop: '2px' }}>
                    {resolvedTheme === 'dark' ? t('theme.darkModeOn') : t('theme.darkModeOff')}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => setThemeMode(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid',
                    borderColor: resolvedTheme === 'dark' ? '#22c55e' : '#94a3b8',
                    background: resolvedTheme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#f1f5f9',
                    color: resolvedTheme === 'dark' ? '#22c55e' : '#475569'
                  }}
                  title={resolvedTheme === 'dark' ? t('theme.disableDarkMode') : t('theme.enableDarkMode')}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: resolvedTheme === 'dark' ? '#22c55e' : '#94a3b8' }} />
                  {resolvedTheme === 'dark' ? t('theme.disableDarkMode') : t('theme.enableDarkMode')}
                </button>
              </div>
              <div className="appearance-options" role="group" aria-label={t('theme.appearance')}>
                {[
                  ['light', t('theme.lightMode'), Sun],
                  ['dark', t('theme.darkMode'), Moon]
                ].map(([mode, label, Icon]) => (
                  <button
                    type="button"
                    key={mode}
                    className={themeMode === mode ? 'active' : ''}
                    onClick={() => setThemeMode(mode)}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '800', opacity: 0.85 }}>
                      {themeMode === mode ? `[${t('theme.enabled')}]` : `[${t('theme.disabled')}]`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="appearance-card">
              <div className="appearance-head">
                <strong>{t('profile.languagePreferences')}</strong>
                <small>{t('profile.languagePreferencesNote')}</small>
              </div>
              <LanguageSelector />
            </div>
          <section className="portal-panel settings-card settings-wide" style={{ borderLeft: '4px solid #2563eb' }}>
            <div className="portal-panel-head">
              <div>
                <h2>Generate Manual Bill</h2>
                <p>Generate a custom bill for a specific resident.</p>
              </div>
              <FilePlus size={22} style={{ color: '#2563eb' }} />
            </div>
            <div style={{ padding: '16px 0 6px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Create one-time bills for repairs, events, security deposits, clubhouse charges, or custom resident fees.
              </p>
              <button
                type="button"
                className="mm-button mm-button-primary"
                onClick={handleOpenManualBillModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  padding: '10px 20px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                  cursor: 'pointer'
                }}
              >
                <FilePlus size={18} /> Generate Manual Bill
              </button>
            </div>
          </section>

          <section className="portal-panel settings-card settings-wide">
            <div className="portal-panel-head">
              <div>
                <h2>{t('profile.societyInformation')}</h2>
                <p>{t('profile.shownAcrossScreens')}</p>
              </div>
              <Building2 size={20} />
            </div>
            <div className="settings-form">
              <label>
                {t('profile.societyName')}
                <input name="societyName" value={settings.societyName} onChange={handleChange} required />
              </label>
              <label>
                {t('profile.address')}
                <input name="address" value={settings.address} onChange={handleChange} required />
              </label>
              <label>
                {t('common.phone')}
                <input name="phone" value={settings.phone} onChange={handleChange} required />
              </label>
            </div>
          </section>

          <section className="portal-panel settings-card settings-wide">
            <div className="portal-panel-head">
              <div>
                <h2>{t('profile.paymentScanner')}</h2>
                <p>{t('profile.paymentScannerNote')}</p>
              </div>
              <QrCode size={20} />
            </div>
            <div className="settings-payment-scanner">
              <div className="settings-qr-preview">
                {settings.paymentQrImage ? (
                  <>
                    <img src={settings.paymentQrImage} alt="Maintenance payment scanner" loading="lazy" decoding="async" />
                    <button type="button" onClick={removeQrImage}><X size={14} /> {t('settings.remove')}</button>
                  </>
                ) : (
                  <div>
                    <QrCode size={36} />
                    <strong>{t('settings.noQrUploaded')}</strong>
                    <span>{t('settings.uploadScannerHelp')}</span>
                  </div>
                )}
              </div>
              <div className="settings-form settings-form-plain">
                <label>
                  {t('settings.uploadQrScanner')}
                  <span className="settings-upload-button">
                    <Upload size={15} /> {t('settings.chooseImage')}
                    <input type="file" accept="image/*" onChange={handleQrUpload} />
                  </span>
                </label>
                <label>
                  {t('settings.upiId')}
                  <input name="paymentUpiId" value={settings.paymentUpiId || ''} onChange={handleChange} placeholder="example@upi" />
                </label>
                <label className="settings-field-full">
                  {t('settings.paymentInstructions')}
                  <textarea name="paymentNote" rows="3" value={settings.paymentNote || ''} onChange={handleChange} />
                </label>
              </div>
            </div>
          </section>

          <section className="portal-panel settings-card">
            <div className="portal-panel-head">
              <div>
                <h2>{t('settings.notifications')}</h2>
                <p>{t('settings.notificationsNote')}</p>
              </div>
              <Bell size={20} />
            </div>
            <div className="settings-toggle-list">
              <label><input type="checkbox" name="autoReminder" checked={settings.autoReminder} onChange={handleChange} /><span><Clock size={30} /> {t('settings.paymentDueReminders')}</span></label>
              <label><input type="checkbox" name="paymentAlerts" checked={settings.paymentAlerts} onChange={handleChange} /><span><CreditCard size={20} /> {t('settings.paymentAlerts')}</span></label>
              <label><input type="checkbox" name="complaintAlerts" checked={settings.complaintAlerts} onChange={handleChange} /><span><UserCog size={20} /> {t('settings.complaintUpdates')}</span></label>
              <label><input type="checkbox" name="visitorAlerts" checked={settings.visitorAlerts} onChange={handleChange} /><span><Bell size={20} /> {t('settings.visitorAlerts')}</span></label>
            </div>
          </section>

          <div className="settings-actions settings-wide">
            <button type="submit" className="settings-save-btn" disabled={saving}>
              <Save size={16} /> {saving ? t('common.saving') : t('settings.saveSettings')}
            </button>
          </div>
        </form>
      ) : (
        <section className="mm-panel mm-table-panel" style={{ marginTop: '10px' }}>
          <div className="mm-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
            <div>
              <h2>{t('settings.resMaintenanceCategories')}</h2>
              <p>{t('settings.resMaintenanceCategoriesNote')}</p>
            </div>
          </div>
          
          <div style={{ padding: '0 20px 15px' }}>
            {categories.length === 0 ? (
              <div className="mm-empty" style={{ padding: '45px 15px', textAlign: 'center' }}>
                <SlidersHorizontal size={36} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                <strong style={{ display: 'block', fontSize: '15px', color: '#1e293b', marginBottom: '8px' }}>
                  {t('settings.noCategoriesFound')}
                </strong>
                <button
                  type="button"
                  className="mm-button mm-button-primary"
                  style={{ display: 'inline-flex', marginTop: '12px' }}
                  onClick={() => window.location.href = '/admin/maintenance?tab=categories'}
                >
                  {t('settings.goToCategories')}
                </button>
              </div>
            ) : (
              <>
                {selectedRows.length > 0 && (
                  <div className="mm-bulk-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '15px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>{t('settings.flatsSelected', { count: selectedRows.length })}</span>
                    <button
                      type="button"
                      className="mm-button mm-button-primary"
                      onClick={() => {
                        setSelectedCategories([]);
                        setSearchQuery('');
                        setBulkModalOpen(true);
                      }}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      {t('settings.bulkAssignCategories')}
                    </button>
                    <button
                      type="button"
                      className="mm-button mm-button-light"
                      onClick={() => setSelectedRows([])}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      {t('settings.cancelSelection')}
                    </button>
                  </div>
                )}

                {loadingResCats ? (
                  <div className="mm-skeleton-grid" style={{ gridTemplateColumns: '1fr' }}>
                    {[1, 2].map((i) => <div key={i} className="mm-skeleton" style={{ height: '50px' }} />)}
                  </div>
                ) : residentCategories.length > 0 ? (
                  <div className="mm-table-wrap">
                    <table className="mm-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={residentCategories.length > 0 && selectedRows.length === residentCategories.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRows(residentCategories.map(f => f.flat_id));
                                } else {
                                  setSelectedRows([]);
                                }
                              }}
                            />
                          </th>
                          <th>{t('settings.flatNumber')}</th>
                          <th>{t('settings.residentName')}</th>
                          <th>{t('settings.assignedCategories')}</th>
                          <th style={{ textAlign: 'right' }}>{t('settings.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residentCategories.map((flat) => {
                          const assignedCats = (flat.assigned_category_ids || [])
                            .map(catId => categories.find(c => c.id === catId))
                            .filter(Boolean);

                          return (
                            <tr key={flat.flat_id}>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedRows.includes(flat.flat_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRows(prev => [...prev, flat.flat_id]);
                                    } else {
                                      setSelectedRows(prev => prev.filter(id => id !== flat.flat_id));
                                    }
                                  }}
                                />
                              </td>
                              <td><strong>{t('settings.flatLabel')} {flat.flat_no}</strong></td>
                              <td>{flat.resident_name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{t('settings.noActiveResident')}</span>}</td>
                              <td>
                                {assignedCats.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {assignedCats.map(cat => (
                                      <span key={cat.id} className="mm-status mm-status-paid" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', textTransform: 'none', background: '#e0f2fe', color: '#0369a1' }}>
                                        {cat.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>{t('settings.noCustomCategories')}</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="mm-mini-action blue"
                                  onClick={() => handleEditResident(flat)}
                                >
                                  {t('settings.edit')}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mm-empty" style={{ padding: '40px 0' }}>
                    <Users size={32} style={{ color: '#94a3b8', marginBottom: '10px' }} />
                    <strong>{t('settings.noOccupiedFlats')}</strong>
                    <span>{t('settings.noOccupiedFlatsNote')}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {selectedFlat && (
        <SettingsModal
          title={t('settings.assignCategoriesTitle')}
          subtitle={`${t('settings.flatLabel')}: ${selectedFlat.flat_no} | ${t('settings.residentLabel')}: ${selectedFlat.resident_name || 'N/A'}`}
          onClose={() => setSelectedFlat(null)}
        >
          <form onSubmit={handleSaveResidentCategories} className="mm-form">
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder={t('settings.searchCategories')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                className="mm-button mm-button-light"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => {
                  const visibleIds = filteredCategories.map(c => c.id);
                  setSelectedCategories(prev => Array.from(new Set([...prev, ...visibleIds])));
                }}
              >
                {t('settings.selectAll')}
              </button>
              <button
                type="button"
                className="mm-button mm-button-light"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => {
                  const visibleIds = filteredCategories.map(c => c.id);
                  setSelectedCategories(prev => prev.filter(id => !visibleIds.includes(id)));
                }}
              >
                {t('settings.clearAll')}
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', maxHeight: '250px', overflowY: 'auto', padding: '8px', border: '1px solid #edf2f7', borderRadius: '8px', marginBottom: '20px' }}>
              {filteredCategories.map(cat => (
                <label key={cat.id} className="mm-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px', borderBottom: '1px solid #f7fafc', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories(prev => [...prev, cat.id]);
                      } else {
                        setSelectedCategories(prev => prev.filter(id => id !== cat.id));
                      }
                    }}
                  />
                  <span style={{ fontSize: '13px' }}>
                    {cat.name}{' '}
                    <small style={{ color: '#718096' }}>
                      ({cat.calculation_type === 'PER_SQ_FT' ? `${money(cat.amount)}/sq.ft.` : money(cat.amount)})
                    </small>
                  </span>
                </label>
              ))}
              {filteredCategories.length === 0 && (
                <div style={{ padding: '20px', gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  {t('settings.noActiveCategories')}
                </div>
              )}
            </div>
            
            <div className="mm-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
              <button type="button" className="mm-button mm-button-light" onClick={() => setSelectedFlat(null)}>{t('settings.cancel')}</button>
              <button type="submit" className="mm-button mm-button-primary" disabled={saving}>{t('settings.save')}</button>
            </div>
          </form>
        </SettingsModal>
      )}

      {bulkModalOpen && (
        <SettingsModal
          title={t('settings.bulkAssignTitle')}
          subtitle={t('settings.flatsSelected', { count: selectedRows.length })}
          onClose={() => setBulkModalOpen(false)}
        >
          <form onSubmit={handleBulkAssign} className="mm-form">
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder={t('settings.searchCategories')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                className="mm-button mm-button-light"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => {
                  const visibleIds = filteredCategories.map(c => c.id);
                  setSelectedCategories(prev => Array.from(new Set([...prev, ...visibleIds])));
                }}
              >
                {t('settings.selectAll')}
              </button>
              <button
                type="button"
                className="mm-button mm-button-light"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => {
                  const visibleIds = filteredCategories.map(c => c.id);
                  setSelectedCategories(prev => prev.filter(id => !visibleIds.includes(id)));
                }}
              >
                {t('settings.clearAll')}
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', maxHeight: '250px', overflowY: 'auto', padding: '8px', border: '1px solid #edf2f7', borderRadius: '8px', marginBottom: '20px' }}>
              {filteredCategories.map(cat => (
                <label key={cat.id} className="mm-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px', borderBottom: '1px solid #f7fafc', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories(prev => [...prev, cat.id]);
                      } else {
                        setSelectedCategories(prev => prev.filter(id => id !== cat.id));
                      }
                    }}
                  />
                  <span style={{ fontSize: '13px' }}>
                    {cat.name}{' '}
                    <small style={{ color: '#718096' }}>
                      ({cat.calculation_type === 'PER_SQ_FT' ? `${money(cat.amount)}/sq.ft.` : money(cat.amount)})
                    </small>
                  </span>
                </label>
              ))}
              {filteredCategories.length === 0 && (
                <div style={{ padding: '20px', gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  {t('settings.noActiveCategories')}
                </div>
              )}
            </div>
            
            <div className="mm-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
              <button type="button" className="mm-button mm-button-light" onClick={() => setBulkModalOpen(false)}>{t('settings.cancel')}</button>
              <button type="submit" className="mm-button mm-button-primary" disabled={saving}>{t('settings.saveBulkAssignments')}</button>
            </div>
          </form>
        </SettingsModal>
      )}

      {manualModalOpen && (
        <SettingsModal
          title="Generate Manual Bill"
          subtitle="Generate a custom, one-time bill for a specific resident."
          onClose={() => setManualModalOpen(false)}
        >
          {manualStep === 1 ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  Step 1: Search and Select Resident
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search by Name, Flat Number, or Mobile Number..."
                    value={residentSearch}
                    onChange={(e) => setResidentSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {manualError && (
                <div className="settings-mini-error" style={{ marginBottom: '12px' }}>
                  {manualError}
                </div>
              )}

              {loadingResidents ? (
                <div className="mm-skeleton-grid" style={{ gridTemplateColumns: '1fr', gap: '8px' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="mm-skeleton" style={{ height: '56px', borderRadius: '8px' }} />
                  ))}
                </div>
              ) : filteredResidents.length > 0 ? (
                <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {filteredResidents.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => handleSelectResident(res)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="mm-resident-select-item"
                    >
                      <div>
                        <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block' }}>{res.name}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Flat {res.flat_no || 'N/A'} {res.wing ? `(Wing ${res.wing})` : ''} • {res.flat_type_name || 'Resident'}
                        </span>
                      </div>
                      <div style={{ textAlignment: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {res.phone && <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>📱 {res.phone}</span>}
                        <button type="button" className="mm-mini-action blue">Select</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '30px 15px', textAlign: 'center', color: '#64748b' }}>
                  <Users size={28} style={{ opacity: 0.5, marginBottom: '6px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No residents found matching your search.</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="mm-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Resident</span>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#1e3a8a', marginTop: '2px' }}>{selectedResident?.name}</strong>
                  <span style={{ fontSize: '12px', color: '#3b82f6' }}>
                    Flat {selectedResident?.flat_no || 'N/A'} {selectedResident?.wing ? `• Wing ${selectedResident.wing}` : ''} • Type: {selectedResident?.flat_type_name || 'Standard'}
                  </span>
                </div>
                <button
                  type="button"
                  className="mm-button mm-button-light"
                  onClick={() => setManualStep(1)}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Change
                </button>
              </div>

              {manualError && <div className="settings-mini-error">{manualError}</div>}

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                Bill Title *
                <input
                  type="text"
                  required
                  placeholder="e.g. Lift Repair Charges, Water Tank Cleaning"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                  Bill Category *
                  <select
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="Repair Charges">Repair Charges</option>
                    <option value="Parking Charges">Parking Charges</option>
                    <option value="Water Charges">Water Charges</option>
                    <option value="Electricity Charges">Electricity Charges</option>
                    <option value="Event Charges">Event Charges</option>
                    <option value="Clubhouse Charges">Clubhouse Charges</option>
                    <option value="Security Deposit">Security Deposit</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                {manualForm.category === 'Other' && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                    Custom Category Name *
                    <input
                      type="text"
                      required
                      placeholder="Enter category name"
                      value={manualForm.customCategory}
                      onChange={(e) => setManualForm({ ...manualForm, customCategory: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                    />
                  </label>
                )}

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                  Amount (₹) *
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="e.g. 500"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                Due Date
                <input
                  type="date"
                  value={manualForm.dueDate}
                  onChange={(e) => setManualForm({ ...manualForm, dueDate: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                Description / Notes
                <textarea
                  rows="3"
                  placeholder="Add any specific details or reason for this custom bill..."
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="mm-button mm-button-light" onClick={() => setManualModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="mm-button mm-button-primary" disabled={submittingManual}>
                  {submittingManual ? 'Generating...' : 'Generate Manual Bill'}
                </button>
              </div>
            </form>
          )}
        </SettingsModal>
      )}
    </div>
  );
};

export default AdminSettings;
