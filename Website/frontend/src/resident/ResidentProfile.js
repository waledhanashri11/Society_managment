import React, { useState } from 'react';
import { Camera, Mail, Trash2, User } from 'lucide-react';
import { getUser } from '../utils/auth';

const getProfilePhotoKey = (user) => `residentProfilePhoto:${user?.id || user?.email || 'current'}`;

const ResidentProfile = () => {
  const user = getUser();
  const profilePhotoKey = getProfilePhotoKey(user);
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem(profilePhotoKey) || '');
  const [toast, setToast] = useState('');

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
            {profilePhoto ? <img src={profilePhoto} alt="Resident profile" /> : (user?.name || 'R').charAt(0)}
          </span>
          <div>
            <h2>{user?.name || 'Resident'}</h2>
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
          <div><User size={16} /><span>Name</span><strong>{user?.name || 'Resident'}</strong></div>
          <div><Mail size={16} /><span>Email</span><strong>{user?.email || 'No email'}</strong></div>
          <div><User size={16} /><span>Role</span><strong>Resident</strong></div>
        </div>
      </section>
    </div>
  );
};

export default ResidentProfile;
