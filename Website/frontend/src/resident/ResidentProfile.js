import React, { useEffect, useState } from 'react';
import { Building2, Camera, Mail, Moon, Phone, Save, Sun, Trash2, User, ShieldCheck } from 'lucide-react';
import { residentAPI } from '../services/api';
import { getUser, setUser } from '../utils/auth';
import { useTheme } from '../utils/theme';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';

const getProfilePhotoKey = (user) => `residentProfilePhoto:${user?.id || user?.email || 'current'}`;

const ResidentProfile = () => {
  const { t } = useTranslation();
  const user = getUser();
  const { mode: themeMode, resolvedTheme, setThemeMode } = useTheme();
  const profilePhotoKey = getProfilePhotoKey(user);
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem(profilePhotoKey) || '');
  const [profile, setProfile] = useState(user || {});
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    residentAPI.getDashboard()
      .then(({ data }) => {
        setProfile(data.user || user || {});
        setPhone(data.user?.phone || user?.phone || '');
      })
      .catch(() => notify('Could not load latest profile details'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const updateProfilePhoto = (photo) => {
    if (photo) {
      localStorage.setItem(profilePhotoKey, photo);
    } else {
      localStorage.removeItem(profilePhotoKey);
    }
    setProfilePhoto(photo);
    window.dispatchEvent(new CustomEvent('residentProfilePhotoUpdated', {
      detail: { key: profilePhotoKey, photo }
    }));
  };

  const handleProfilePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please choose an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notify('Please choose an image under 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateProfilePhoto(reader.result);
      notify('Profile picture updated');
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePhoto = () => {
    updateProfilePhoto('');
    notify('Profile picture removed');
  };

  const savePhone = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await residentAPI.updateProfile({ phone });
      const nextUser = { ...(user || {}), ...(data.user || {}), phone };
      setUser(nextUser);
      setProfile((current) => ({ ...current, ...nextUser }));
      notify('Phone number updated');
    } catch (error) {
      notify(error.response?.data?.message || 'Could not update phone number');
    } finally {
      setSaving(false);
    }
  };

  const infoFields = [
    { label: t('common.name', 'FULL NAME'), value: profile?.name || user?.name || 'Resident', icon: User },
    { label: t('common.email', 'EMAIL ADDRESS'), value: profile?.email || user?.email || 'Not provided', icon: Mail },
    { label: t('common.role', 'ACCOUNT ROLE'), value: 'Resident Account', icon: ShieldCheck },
    { label: t('common.flat', 'FLAT NUMBER'), value: profile?.flat_no ? `Wing ${profile.wing || 'A'} - Flat ${profile.flat_no}` : 'Not assigned', icon: Building2 },
    { label: t('common.floor', 'FLOOR LEVEL'), value: profile?.floor_no !== undefined && profile?.floor_no !== null ? `Floor ${profile.floor_no}` : 'Level 1', icon: Building2 },
    { label: t('common.phone', 'PHONE NUMBER'), value: profile?.phone || phone || 'Not added', icon: Phone }
  ];

  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div>
          <h1>{t('profile.title', 'My Profile')}</h1>
          <p>{t('profile.subtitle', 'Manage your resident profile picture, phone number, and preferences.')}</p>
        </div>
        <div className="portal-date-chip">
          <User size={15} /> Resident Profile
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {/* Profile Card Hero */}
        <section className="portal-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #087d40, #0ab35c)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'white',
                  fontSize: '28px',
                  fontWeight: 'bold',
                  boxShadow: '0 8px 20px rgba(8,125,64,0.25)',
                  border: '3px solid white'
                }}
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Resident avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (user?.name || 'R').charAt(0).toUpperCase()
                )}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{profile?.name || user?.name || 'Resident'}</h2>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Resident Account · {profile?.flat_no ? `Flat ${profile.flat_no}` : 'Society Member'}</span>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: 'linear-gradient(90deg, #087d40, #0ab35c)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(8,125,64,0.2)'
                  }}
                >
                  <Camera size={14} /> {t('profile.uploadPicture', 'Upload Picture')}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhotoUpload} />
                </label>
                {profilePhoto && (
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    onClick={removeProfilePhoto}
                  >
                    <Trash2 size={14} /> {t('profile.removePicture', 'Remove Picture')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 6 Info Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '12px' }}>
          {infoFields.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'white',
                border: '1px solid var(--portal-line, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', display: 'grid', placeItems: 'center', color: '#087d40' }}>
                <Icon size={18} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '9px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.05em' }}>{label}</span>
                <strong style={{ fontSize: '13px', color: '#1e293b' }}>{value}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Phone Update Form Panel */}
        <section className="portal-panel">
          <div className="portal-panel-head">
            <div>
              <h2>{t('profile.updatePhone', 'Update Phone Number')}</h2>
              <p>Keep your contact phone updated for society emergency notifications.</p>
            </div>
          </div>
          <form onSubmit={savePhone} style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('profile.enterPhone', 'Enter phone number')}
              style={{
                flex: 1,
                maxWidth: '360px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, #087d40, #0ab35c)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(8,125,64,0.2)'
              }}
            >
              <Save size={14} /> {saving ? t('common.saving', 'Saving...') : t('profile.savePhone', 'Save Phone')}
            </button>
          </form>
        </section>

        {/* Theme & Language Preferences Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Dark Mode Theme Selection */}
          <section className="portal-panel">
            <div className="portal-panel-head">
              <div>
                <h2>{t('theme.appearance', 'Appearance & Theme')}</h2>
                <p>{resolvedTheme === 'dark' ? t('theme.darkModeOn', 'Dark Mode Active') : t('theme.darkModeOff', 'Light Mode Active')}</p>
              </div>
            </div>
            <div style={{ padding: '16px', display: 'grid', gap: '10px' }}>
              {[
                ['light', t('theme.lightMode', 'Light Mode'), Sun],
                ['dark', t('theme.darkMode', 'Dark Mode'), Moon]
              ].map(([mode, label, Icon]) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: themeMode === mode ? '2px solid #087d40' : '1px solid #e2e8f0',
                    background: themeMode === mode ? '#f0fdf4' : 'white',
                    color: themeMode === mode ? '#087d40' : '#334155',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: themeMode === mode ? '#087d40' : '#94a3b8' }}>
                    {themeMode === mode ? '[Active]' : '[Select]'}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Language Selector */}
          <section className="portal-panel">
            <div className="portal-panel-head">
              <div>
                <h2>{t('profile.languagePreferences', 'Language Preferences')}</h2>
                <p>{t('profile.languagePreferencesNote', 'Choose your preferred language for the portal.')}</p>
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              <LanguageSelector />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ResidentProfile;
