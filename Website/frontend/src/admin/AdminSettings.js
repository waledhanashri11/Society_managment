import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, Building2, CheckCircle2, Clock, CreditCard, Database,
  IndianRupee, LockKeyhole, Mail, Phone, QrCode, Save, ShieldCheck, Upload, UserCog, X,
  SlidersHorizontal, Users
} from 'lucide-react';
import { getUser } from '../utils/auth';
import { authAPI, settingsAPI, maintenanceAPI } from '../services/api';
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
  const user = getUser();
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

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
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
          <h1>Settings</h1>
          <p>Manage society profile, billing rules, alerts and admin security.</p>
        </div>
        <div className="portal-date-chip"><ShieldCheck size={15} /> Admin Controls</div>
      </div>

      {toast && <div className="mm-toast"><CheckCircle2 size={18} />{toast}</div>}

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

      <div className="mm-tabs" role="tablist" style={{ marginBottom: '22px' }}>
        <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>
          <UserCog size={17} /> Society & Account
        </button>
        <button className={tab === 'resident-categories' ? 'active' : ''} onClick={() => setTab('resident-categories')}>
          <SlidersHorizontal size={17} /> Resident Categories
        </button>
      </div>

      {loading ? (
        <div className="mm-skeleton-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[1, 2, 3].map((i) => <div key={i} className="mm-skeleton" />)}
        </div>
      ) : tab === 'general' ? (
        <form onSubmit={handleSubmit} className="settings-grid">
          <section className="portal-panel settings-profile-card">
            <div className="settings-admin-avatar">{adminInitials}</div>
            <h2>{user?.name || 'Admin'}</h2>
            <p>Administrator</p>
            <div className="settings-profile-meta">
              <span><Mail size={14} /> {user?.email}</span>
              {user?.phone && <span><Phone size={14} /> {user.phone}</span>}
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
                Society Name
                <input name="societyName" value={settings.societyName} onChange={handleChange} required />
              </label>
              <label>
                Address
                <input name="address" value={settings.address} onChange={handleChange} required />
              </label>
              <label>
                Phone
                <input name="phone" value={settings.phone} onChange={handleChange} required />
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
                <input name="maintenanceAmount" type="number" value={settings.maintenanceAmount} onChange={handleChange} required />
              </label>
              <label>
                Due Day
                <input name="dueDay" type="number" min="1" max="31" value={settings.dueDay} onChange={handleChange} required />
              </label>
              <label>
                Late Fee
                <input name="lateFee" type="number" value={settings.lateFee} onChange={handleChange} required />
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
              <label><input type="checkbox" name="autoReminder" checked={settings.autoReminder} onChange={handleChange} /><span><Clock size={30} /> Payment due reminders</span></label>
              <label><input type="checkbox" name="paymentAlerts" checked={settings.paymentAlerts} onChange={handleChange} /><span><CreditCard size={20} /> Payment alerts</span></label>
              <label><input type="checkbox" name="complaintAlerts" checked={settings.complaintAlerts} onChange={handleChange} /><span><UserCog size={20} /> Complaint updates</span></label>
              <label><input type="checkbox" name="visitorAlerts" checked={settings.visitorAlerts} onChange={handleChange} /><span><Bell size={20} /> Visitor alerts</span></label>
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
            </div>
          </section>

          <div className="settings-actions settings-wide">
            <button type="submit" className="settings-save-btn" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      ) : (
        <section className="mm-panel mm-table-panel" style={{ marginTop: '10px' }}>
          <div className="mm-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
            <div>
              <h2>Resident Maintenance Categories</h2>
              <p>Customize maintenance categories billed to individual flats.</p>
            </div>
          </div>
          
          <div style={{ padding: '0 20px 15px' }}>
            {categories.length === 0 ? (
              <div className="mm-empty" style={{ padding: '45px 15px', textAlign: 'center' }}>
                <SlidersHorizontal size={36} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                <strong style={{ display: 'block', fontSize: '15px', color: '#1e293b', marginBottom: '8px' }}>
                  No maintenance categories found. Please create categories first.
                </strong>
                <button
                  type="button"
                  className="mm-button mm-button-primary"
                  style={{ display: 'inline-flex', marginTop: '12px' }}
                  onClick={() => window.location.href = '/admin/maintenance?tab=categories'}
                >
                  Go to Maintenance Categories
                </button>
              </div>
            ) : (
              <>
                {selectedRows.length > 0 && (
                  <div className="mm-bulk-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '15px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>{selectedRows.length} flat(s) selected</span>
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
                      Bulk Assign Categories
                    </button>
                    <button
                      type="button"
                      className="mm-button mm-button-light"
                      onClick={() => setSelectedRows([])}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      Cancel Selection
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
                          <th>Flat Number</th>
                          <th>Resident Name</th>
                          <th>Assigned Categories</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
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
                              <td><strong>Flat {flat.flat_no}</strong></td>
                              <td>{flat.resident_name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No active resident</span>}</td>
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
                                  <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No custom categories (Base only)</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="mm-mini-action blue"
                                  onClick={() => handleEditResident(flat)}
                                >
                                  Edit
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
                    <strong>No occupied flats found</strong>
                    <span>Only occupied flats with assigned residents are displayed here.</span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {selectedFlat && (
        <SettingsModal
          title={`Assign Maintenance Categories`}
          subtitle={`Flat: ${selectedFlat.flat_no} | Resident: ${selectedFlat.resident_name || 'N/A'}`}
          onClose={() => setSelectedFlat(null)}
        >
          <form onSubmit={handleSaveResidentCategories} className="mm-form">
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Search categories..."
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
                Select All
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
                Clear All
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
                  No active categories match your query.
                </div>
              )}
            </div>
            
            <div className="mm-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
              <button type="button" className="mm-button mm-button-light" onClick={() => setSelectedFlat(null)}>Cancel</button>
              <button type="submit" className="mm-button mm-button-primary" disabled={saving}>Save</button>
            </div>
          </form>
        </SettingsModal>
      )}

      {bulkModalOpen && (
        <SettingsModal
          title={`Bulk Assign Categories`}
          subtitle={`${selectedRows.length} flat(s) selected`}
          onClose={() => setBulkModalOpen(false)}
        >
          <form onSubmit={handleBulkAssign} className="mm-form">
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Search categories..."
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
                Select All
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
                Clear All
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
                  No active categories match your query.
                </div>
              )}
            </div>
            
            <div className="mm-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
              <button type="button" className="mm-button mm-button-light" onClick={() => setBulkModalOpen(false)}>Cancel</button>
              <button type="submit" className="mm-button mm-button-primary" disabled={saving}>Save Bulk Assignments</button>
            </div>
          </form>
        </SettingsModal>
      )}
    </div>
  );
};

export default AdminSettings;
