import React, { useEffect, useState } from 'react';
import { Building2, Camera, Mail, Phone, Save, Trash2, User } from 'lucide-react';
import { residentAPI } from '../services/api';
import { getUser, setUser } from '../utils/auth';

const getProfilePhotoKey = (user) => `residentProfilePhoto:${user?.id || user?.email || 'current'}`;

const ResidentProfile = () => {
  const user = getUser();
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
          <h1>My Profile</h1>
          <p>Manage your resident profile picture and account details.</p>
        </div>
      </div>

      <section className="portal-panel resident-profile-page">
        <div className="resident-profile-hero">
          <span className={`resident-profile-photo resident-profile-photo-large ${profilePhoto ? 'has-photo' : ''}`}>
            {profilePhoto ? <img src={profilePhoto} alt="Resident profile" loading="lazy" decoding="async" /> : (user?.name || 'R').charAt(0)}
          </span>
          <div>
            <h2>{profile?.name || user?.name || 'Resident'}</h2>
            <p>Resident account</p>
            <div className="resident-profile-actions">
              <label className="resident-photo-upload">
                <Camera size={14} /> Upload Picture
                <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} />
              </label>
              {profilePhoto && (
                <button type="button" className="resident-photo-remove" onClick={removeProfilePhoto}>
                  <Trash2 size={14} /> Remove Picture
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="resident-profile-details">
          <div><User size={16} /><span>Name</span><strong>{profile?.name || user?.name || 'Resident'}</strong></div>
          <div><Mail size={16} /><span>Email</span><strong>{profile?.email || user?.email || 'No email'}</strong></div>
          <div><User size={16} /><span>Role</span><strong>Resident</strong></div>
          <div><Building2 size={16} /><span>Flat</span><strong>{profile?.flat_no ? `Wing ${profile.wing || 'A'} - Flat ${profile.flat_no}` : 'Not assigned'}</strong></div>
          <div><Building2 size={16} /><span>Floor</span><strong>{profile?.floor_no ?? '-'}</strong></div>
          <div><Phone size={16} /><span>Phone</span><strong>{profile?.phone || phone || 'Not added'}</strong></div>
        </div>

        <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={savePhone}>
          <label className="grid gap-2 text-xs font-bold uppercase text-slate-500">
            Update Phone Number
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-green-600"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Enter phone number"
            />
          </label>
          <button className="portal-primary-btn w-fit" disabled={saving}><Save size={14} /> {saving ? 'Saving...' : 'Save Phone'}</button>
        </form>
      </section>
    </div>
  );
};

export default ResidentProfile;
