import React, { useEffect, useState } from 'react';
import { Building2, Camera, Mail, Moon, Phone, Save, Sun, Trash2, User } from 'lucide-react';
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

  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div>
          <h1>{t('profile.title')}</h1>
          <p>{t('profile.subtitle')}</p>
        </div>
      </div>

      <section className="portal-panel resident-profile-page">
        <div className="resident-profile-hero">
          <span className={`resident-profile-photo resident-profile-photo-large ${profilePhoto ? 'has-photo' : ''}`}>
            {profilePhoto ? <img src={profilePhoto} alt="Resident profile" loading="lazy" decoding="async" /> : (user?.name || 'R').charAt(0)}
          </span>
          <div>
            <h2>{profile?.name || user?.name || 'Resident'}</h2>
            <p>{t('dashboard.residentAccount')}</p>
            <div className="resident-profile-actions">
              <label className="resident-photo-upload">
                <Camera size={14} /> {t('profile.uploadPicture')}
                <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} />
              </label>
              {profilePhoto && (
                <button type="button" className="resident-photo-remove" onClick={removeProfilePhoto}>
                  <Trash2 size={14} /> {t('profile.removePicture')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="resident-profile-details">
          <div><User size={16} /><span>{t('common.name')}</span><strong>{profile?.name || user?.name || t('common.resident')}</strong></div>
          <div><Mail size={16} /><span>{t('common.email')}</span><strong>{profile?.email || user?.email || t('common.noEmail')}</strong></div>
          <div><User size={16} /><span>{t('common.role')}</span><strong>{t('common.resident')}</strong></div>
          <div><Building2 size={16} /><span>{t('common.flat')}</span><strong>{profile?.flat_no ? `Wing ${profile.wing || 'A'} - Flat ${profile.flat_no}` : t('common.notAssigned')}</strong></div>
          <div><Building2 size={16} /><span>{t('common.floor')}</span><strong>{profile?.floor_no ?? '-'}</strong></div>
          <div><Phone size={16} /><span>{t('common.phone')}</span><strong>{profile?.phone || phone || t('common.notAdded')}</strong></div>
        </div>

        <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={savePhone}>
          <label className="grid gap-2 text-xs font-bold uppercase text-slate-500">
            {t('profile.updatePhone')}
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-green-600"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t('profile.enterPhone')}
            />
          </label>
          <button className="portal-primary-btn w-fit" disabled={saving}><Save size={14} /> {saving ? t('common.saving') : t('profile.savePhone')}</button>
        </form>

        <section className="appearance-card resident-appearance-card">
          <div className="appearance-head">
            <strong>{t('theme.appearance')}</strong>
            <small>{t('theme.choosePortal')} {t('theme.currentTheme', { theme: themeMode === 'system' ? resolvedTheme : themeMode })}</small>
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
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="appearance-card resident-appearance-card">
          <div className="appearance-head">
            <strong>{t('profile.languagePreferences')}</strong>
            <small>{t('profile.languagePreferencesNote')}</small>
          </div>
          <LanguageSelector />
        </section>
      </section>
    </div>
  );
};

export default ResidentProfile;
