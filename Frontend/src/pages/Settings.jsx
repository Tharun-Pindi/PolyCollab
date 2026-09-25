import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSettings, saveSettingsSection, deleteUserAccount } from '../lib/storage';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import { getTranslation } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { saveUserProfile } from '../lib/storage';

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Profile');

  // Load persistent settings from storage
  const [settings, setSettings] = useState(loadSettings());
  const [savedToast, setSavedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Settings saved successfully!');
  const fileInputRef = useRef(null);

  const language = settings.account?.language || 'English (US)';

  // Security password warning state (Unique custom UI warning instead of simple popup alert)
  const [passwordWarning, setPasswordWarning] = useState(null);

  // Danger zone account deletion confirmation state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isAccountDeleted, setIsAccountDeleted] = useState(false);

  // Sync state if external changes happen
  useEffect(() => {
    const handleStateChange = () => {
      setSettings(loadSettings());
    };
    window.addEventListener('polycollab_state_change', handleStateChange);
    return () => window.removeEventListener('polycollab_state_change', handleStateChange);
  }, []);

  // Theme Live Effects
  useEffect(() => {
    const theme = settings.preferences?.theme || 'light';
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      // System default
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.preferences?.theme]);

  const { profile, account, security, notifications, privacy, preferences } = settings;

  const triggerToast = (msg = 'Settings saved successfully!') => {
    setToastMessage(msg);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  // Generic updater for sections
  const updateSection = async (sectionName, newSectionData, customMsg) => {
    if (sectionName === 'profile') {
      await saveUserProfile(newSectionData);
    } else {
      saveSettingsSection(sectionName, newSectionData);
    }
    const updated = { ...settings, [sectionName]: newSectionData };
    setSettings(updated);
    triggerToast(customMsg || `${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} settings updated!`);
  };

  // Handle Avatar Image File Upload securely to Cloudinary
  const handleAvatarFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      // Instant UI update with a local preview object URL
      const localPreviewUrl = URL.createObjectURL(file);
      setSettings((prev) => ({ ...prev, profile: { ...prev.profile, avatar: localPreviewUrl } }));

      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawData = reader.result;
        try {
          const cloudinaryUrl = await uploadImageToCloudinary(rawData, 'polycollab_avatars');
          updateSection('profile', { ...profile, avatar: cloudinaryUrl }, 'Avatar updated successfully!');
        } catch (error) {
          console.error("Avatar upload failed:", error);
          triggerToast("Failed to upload avatar.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Session Revoke
  const handleRevokeSession = (sessionId) => {
    const updatedSessions = security.sessions.filter((s) => s.id !== sessionId);
    updateSection('security', { ...security, sessions: updatedSessions }, 'Session logged out successfully.');
  };

  const handleLogoutAllOtherSessions = () => {
    const updatedSessions = security.sessions.filter((s) => s.isCurrent);
    updateSection('security', { ...security, sessions: updatedSessions }, 'Logged out all other active sessions.');
  };

  // Password submission handler with unique warning UI
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordWarning(null);

    if (!security.currentPassword) {
      setPasswordWarning('Current password field cannot be empty. Please provide your current password.');
      return;
    }
    if (!security.newPassword || security.newPassword.length < 12) {
      setPasswordWarning('New password must be at least 12 characters long for strong security.');
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      setPasswordWarning('Passwords do not match! Please check your new password and confirmation entries.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPasswordWarning('Session expired. Please log in again to change your password.');
        return;
      }

      // Re-authenticate to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: security.currentPassword,
      });

      if (signInError) {
        setPasswordWarning('Incorrect current password.');
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: security.newPassword
      });

      if (updateError) {
        setPasswordWarning(`Failed to update password: ${updateError.message}`);
        return;
      }

      // Success
      updateSection(
        'security',
        { ...security, currentPassword: '', newPassword: '', confirmPassword: '' },
        'Password updated successfully!'
      );
    } catch (err) {
      setPasswordWarning('An unexpected error occurred while updating the password.');
      console.error(err);
    }
  };

  // Dynamic Account Deletion handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;

    // Dynamically delete user account data from Supabase & local storage
    await deleteUserAccount();

    setIsAccountDeleted(true);
    triggerToast('Account permanently deleted. Redirecting to login...');

    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1500);
  };

  const tabKeysMap = {
    Profile: 'tabProfile',
    Account: 'tabAccount',
    Security: 'tabSecurity',
    Notifications: 'tabNotifications',
    Privacy: 'tabPrivacy',
    Preferences: 'tabPreferences'
  };

  return (
    <div className="max-w-[1150px] mx-auto w-full pb-20 pt-2 px-4">
      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Toast Alert */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#4648d4] text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 font-mono text-sm animate-fade-in">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Account Deletion Overlay Modal if deleted */}
      {isAccountDeleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest border border-error/40 rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-error/10 text-error mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>
            <h2 className="font-title-md text-xl font-bold text-on-surface">Account Deleted</h2>
            <p className="text-on-surface-variant font-body-md text-sm leading-relaxed">
              Your account and profile data have been permanently removed. Redirecting to login screen...
            </p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full py-2.5 bg-primary text-on-primary font-mono text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Go to Login Screen
            </button>
          </div>
        </div>
      )}

      {/* Main Page Title */}
      <div className="mb-6">
        <h1 className="font-headline-lg text-[28px] md:text-headline-lg font-bold text-on-surface">
          {getTranslation(language, 'settingsTitle')}
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Settings Inner Sidebar */}
        <aside className="w-full md:w-52 shrink-0">
          <nav className="flex flex-col space-y-1">
            {['Profile', 'Account', 'Security', 'Notifications', 'Privacy', 'Preferences'].map((tab) => {
              const isActive = activeTab === tab;
              const translatedLabel = getTranslation(language, tabKeysMap[tab] || tab);
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center px-4 py-2.5 text-left font-body-md text-sm transition-colors cursor-pointer rounded-md ${
                    isActive
                      ? 'bg-surface-container text-primary font-bold border-l-2 border-primary'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                  }`}
                >
                  {translatedLabel}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 w-full space-y-6">
          {/* ======================================================== */}
          {/* 1. PROFILE TAB */}
          {/* ======================================================== */}
          {activeTab === 'Profile' && (
            <div className="space-y-6">
              {/* Profile Details Card */}
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex items-center gap-5">
                  <img
                    src={profile.avatar}
                    alt="Profile Avatar"
                    className="w-20 h-20 rounded-full object-cover border border-outline-variant shadow-sm"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className="bg-primary text-on-primary font-mono text-xs font-semibold px-4 py-2 rounded-lg hover:bg-surface-tint transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      Upload Avatar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSection(
                          'profile',
                          {
                            ...profile,
                            avatar: ''
                          },
                          'Avatar removed.'
                        )
                      }
                      className="border border-outline-variant text-on-surface font-mono text-xs font-medium px-4 py-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fName = (profile.firstName || '').trim();
                      const lName = (profile.lastName || '').trim();
                      const updatedFullName = `${fName} ${lName}`.trim() || profile.fullName || '';
                      updateSection(
                        'profile',
                        { ...profile, firstName: fName, lastName: lName, fullName: updatedFullName },
                        'Profile details saved successfully!'
                      );
                    }}
                    className="space-y-6"
                  >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-mono text-[12px] font-medium text-on-surface-variant mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your first name..."
                        value={profile.firstName ?? ''}
                        onChange={(e) => {
                          const fName = e.target.value;
                          const lName = profile.lastName || '';
                          const full = `${fName} ${lName}`.trim();
                          setSettings({ ...settings, profile: { ...profile, firstName: fName, fullName: full } });
                        }}
                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] font-medium text-on-surface-variant mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your last name..."
                        value={profile.lastName ?? ''}
                        onChange={(e) => {
                          const lName = e.target.value;
                          const fName = profile.firstName || '';
                          const full = `${fName} ${lName}`.trim();
                          setSettings({ ...settings, profile: { ...profile, lastName: lName, fullName: full } });
                        }}
                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-mono text-[12px] font-medium text-on-surface-variant mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. San Francisco, CA"
                        value={profile.location}
                        onChange={(e) => setSettings({ ...settings, profile: { ...profile, location: e.target.value } })}
                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[12px] font-medium text-on-surface-variant mb-2">
                        Website
                      </label>
                      <input
                        type="text"
                        placeholder="https://yourwebsite.com"
                        value={profile.website}
                        onChange={(e) => setSettings({ ...settings, profile: { ...profile, website: e.target.value } })}
                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[12px] font-medium text-on-surface-variant mb-2">
                      Bio
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tell the community about yourself..."
                      value={profile.bio}
                      onChange={(e) => setSettings({ ...settings, profile: { ...profile, bio: e.target.value } })}
                      className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-primary text-on-primary font-mono text-xs font-semibold px-6 py-2.5 rounded-lg hover:bg-surface-tint transition-colors cursor-pointer active:scale-95 shadow-sm"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. ACCOUNT TAB */}
          {/* ======================================================== */}
          {activeTab === 'Account' && (
            <div className="space-y-6">
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
                <div>
                  <h3 className="font-title-md text-lg font-bold text-on-surface mb-1">
                    Account Preferences
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant">
                    Manage your basic account details and regional settings.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateSection('account', account, 'Account preferences saved!');
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block font-mono text-[12px] font-medium text-on-surface-variant" htmlFor="language">
                        Language
                      </label>
                      <select
                        id="language"
                        value={account.language}
                        onChange={(e) => {
                          const updated = { ...account, language: e.target.value };
                          updateSection('account', updated, `Language changed to ${e.target.value}`);
                        }}
                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none cursor-pointer"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="Telugu">Telugu (తెలుగు)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[12px] font-medium text-on-surface-variant" htmlFor="timezone">
                        Time Format
                      </label>
                      <select
                        id="timezone"
                        value={account.timezone}
                        onChange={(e) => {
                          const updated = { ...account, timezone: e.target.value };
                          updateSection('account', updated, `Time format set to ${e.target.value}`);
                        }}
                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none cursor-pointer"
                      >
                        <option value="12-hour (Normal time)">12-hour (Normal time - 12:00 AM/PM)</option>
                        <option value="24-hour (Railway time)">24-hour (Railway time - 24:00)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="bg-primary text-on-primary font-mono text-xs font-semibold px-6 py-2.5 rounded-lg hover:bg-surface-tint transition-colors cursor-pointer active:scale-95 shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </section>

              {/* Dynamic Danger Zone with text input confirmation */}
              <section className="bg-surface-container-lowest border border-error/30 rounded-xl p-6 md:p-8 relative overflow-hidden shadow-sm space-y-6">
                <div className="absolute inset-0 bg-error-container/5 pointer-events-none" />
                <div>
                  <h3 className="font-title-md text-lg font-bold text-error mb-1 relative z-10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">warning</span>
                    Danger Zone
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant relative z-10">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>

                <div className="border-t border-error/10 pt-6 space-y-4 relative z-10">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-on-surface">
                      To confirm deletion, type <span className="font-mono text-error font-bold">DELETE</span> below:
                    </label>
                    <input
                      type="text"
                      placeholder="Type DELETE..."
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full max-w-md px-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface font-mono text-sm focus:border-error focus:ring-2 focus:ring-error/20 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-on-surface-variant">
                      Status: {deleteConfirmText.trim().toUpperCase() === 'DELETE' ? (
                        <span className="text-error font-semibold">Confirmation matched! Ready to delete.</span>
                      ) : (
                        <span>Type DELETE to unlock button.</span>
                      )}
                    </p>
                    <button
                      type="button"
                      disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                      onClick={handleDeleteAccount}
                      className={`font-mono text-xs font-bold px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-sm ${
                        deleteConfirmText.trim().toUpperCase() === 'DELETE'
                          ? 'bg-error text-white hover:bg-error/90 cursor-pointer active:scale-95'
                          : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed opacity-60 border border-outline-variant/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                      Delete Account Permanently
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. SECURITY TAB */}
          {/* ======================================================== */}
          {activeTab === 'Security' && (
            <div className="space-y-6">
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary text-xl">lock</span>
                  <h3 className="font-title-md text-lg font-bold text-on-surface">Change Password</h3>
                </div>

                {/* Unique Warning Card (Renders when input is invalid instead of browser alert) */}
                {passwordWarning && (
                  <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/30 text-error flex items-start gap-3 animate-shake">
                    <span className="material-symbols-outlined text-xl shrink-0 mt-0.5">warning</span>
                    <div className="flex-1">
                      <h4 className="font-title-md text-sm font-bold">Invalid Password Input</h4>
                      <p className="text-xs font-body-md mt-0.5 leading-relaxed">{passwordWarning}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPasswordWarning(null)}
                      className="text-error/80 hover:text-error cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                  <div>
                    <label className="block font-mono text-[12px] font-medium text-on-surface-variant mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={security.currentPassword || ''}
                      onChange={(e) => setSettings({ ...settings, security: { ...security, currentPassword: e.target.value } })}
                      className="w-full px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-body-md text-on-surface"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[12px] font-medium text-on-surface-variant mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password..."
                      value={security.newPassword || ''}
                      onChange={(e) => setSettings({ ...settings, security: { ...security, newPassword: e.target.value } })}
                      className="w-full px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-body-md text-on-surface"
                    />
                    <p className="font-mono text-[11px] text-on-surface-variant mt-1">
                      Must be at least 12 characters long.
                    </p>
                  </div>

                  <div>
                    <label className="block font-mono text-[12px] font-medium text-on-surface-variant mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm new password..."
                      value={security.confirmPassword || ''}
                      onChange={(e) => setSettings({ ...settings, security: { ...security, confirmPassword: e.target.value } })}
                      className="w-full px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-body-md text-on-surface"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="bg-primary text-on-primary font-mono text-xs font-semibold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors active:scale-95 cursor-pointer shadow-sm"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </section>

              {/* Active Sessions Logout working dynamically */}
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 md:p-8 border-b border-outline-variant">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">devices</span>
                      <h3 className="font-title-md text-lg font-bold text-on-surface">Active Sessions</h3>
                    </div>
                    {security.sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={handleLogoutAllOtherSessions}
                        className="text-error font-body-md text-sm hover:underline cursor-pointer text-left font-medium"
                      >
                        Log out all other sessions
                      </button>
                    )}
                  </div>
                  <p className="font-body-md text-sm text-on-surface-variant mt-1">
                    These are the devices currently logged into your account. Click logout on any session to terminate it immediately.
                  </p>
                </div>

                <div className="divide-y divide-outline-variant">
                  {security.sessions.map((sess) => (
                    <div key={sess.id} className="p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">{sess.icon}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-title-md text-sm font-semibold text-on-surface">{sess.device}</p>
                            {sess.isCurrent && (
                              <span className="px-2 py-0.5 border border-primary/30 text-primary text-[10px] uppercase font-mono font-bold rounded-full bg-primary/5">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="font-body-md text-xs text-on-surface-variant">
                            {sess.location} • {sess.time}
                          </p>
                        </div>
                      </div>

                      {!sess.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(sess.id)}
                          className="px-3 py-1.5 bg-surface-container text-error hover:bg-error/10 border border-error/20 rounded-md font-mono text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">logout</span>
                          Log Out
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. NOTIFICATIONS TAB */}
          {/* ======================================================== */}
          {activeTab === 'Notifications' && (
            <div className="space-y-6">
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm">
                <div className="mb-6 border-b border-outline-variant pb-4">
                  <h3 className="font-title-md text-lg font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">settings_input_antenna</span>
                    Notification Channels
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant mt-1">
                    Choose where you want to receive notifications.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h4 className="font-body-lg text-base font-bold text-on-surface">Email Notifications</h4>
                      <p className="font-body-md text-sm text-on-surface-variant">
                        Receive updates via your registered email address.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.emailNotifications}
                        onChange={(e) =>
                          updateSection('notifications', { ...notifications, emailNotifications: e.target.checked }, `Email notifications ${e.target.checked ? 'Enabled' : 'Disabled'}`)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h4 className="font-body-lg text-base font-bold text-on-surface">Push Notifications</h4>
                      <p className="font-body-md text-sm text-on-surface-variant">
                        Receive real-time alerts on your browser or mobile device.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.pushNotifications}
                        onChange={(e) =>
                          updateSection('notifications', { ...notifications, pushNotifications: e.target.checked }, `Push notifications ${e.target.checked ? 'Enabled' : 'Disabled'}`)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>
                </div>
              </section>

              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm">
                <div className="mb-6 border-b border-outline-variant pb-4">
                  <h3 className="font-title-md text-lg font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">tune</span>
                    Notification Preferences
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant mt-1">
                    Select the activities you want to be notified about.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h4 className="font-body-lg text-base font-bold text-on-surface">Project updates</h4>
                      <p className="font-body-md text-sm text-on-surface-variant">
                        Get notified about changes to projects you follow.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.projectUpdates}
                        onChange={(e) =>
                          updateSection('notifications', { ...notifications, projectUpdates: e.target.checked }, `Project updates ${e.target.checked ? 'Enabled' : 'Disabled'}`)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. PRIVACY TAB */}
          {/* ======================================================== */}
          {activeTab === 'Privacy' && (
            <div className="space-y-6">
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-outline-variant bg-surface-bright/50">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">visibility</span>
                    <div>
                      <h3 className="font-title-md text-lg font-bold text-on-surface">Profile Visibility</h3>
                      <p className="font-body-md text-sm text-on-surface-variant mt-1">
                        Control who can view your builder profile, skills, and past contributions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  <label
                    className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                      privacy.profileVisibility === 'public'
                        ? 'border-primary bg-surface-container-low ring-1 ring-primary'
                        : 'border-outline-variant hover:border-primary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="profile_visibility"
                      value="public"
                      checked={privacy.profileVisibility === 'public'}
                      onChange={() => updateSection('privacy', { ...privacy, profileVisibility: 'public' }, 'Profile visibility set to Public.')}
                      className="mt-1 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-title-md text-base font-semibold text-on-surface">Public</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant font-mono text-[10px] uppercase font-bold tracking-wider">
                          Recommended
                        </span>
                      </div>
                      <p className="font-body-md text-sm text-on-surface-variant mt-1">
                        Anyone on PolyCollab can view your profile and invite you to projects.
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant">public</span>
                  </label>

                  <label
                    className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                      privacy.profileVisibility === 'private'
                        ? 'border-primary bg-surface-container-low ring-1 ring-primary'
                        : 'border-outline-variant hover:border-primary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="profile_visibility"
                      value="private"
                      checked={privacy.profileVisibility === 'private'}
                      onChange={() => updateSection('privacy', { ...privacy, profileVisibility: 'private' }, 'Profile visibility set to Private.')}
                      className="mt-1 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="font-title-md text-base font-semibold text-on-surface block">Private</span>
                      <p className="font-body-md text-sm text-on-surface-variant mt-1">
                        Your profile is hidden. You can still apply to projects, but builders cannot discover you.
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant">lock</span>
                  </label>
                </div>
              </section>



              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-outline-variant bg-surface-bright/50">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">visibility_lock</span>
                    <div>
                      <h3 className="font-title-md text-lg font-bold text-on-surface">Visibility Preferences</h3>
                      <p className="font-body-md text-sm text-on-surface-variant mt-1">
                        Choose what information is displayed on your public profile.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <span className="font-title-md text-base font-semibold text-on-surface block mb-1">
                        Email Visibility
                      </span>
                      <p className="font-body-md text-sm text-on-surface-variant">
                        Show my primary email address on my public profile.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacy.emailVisibility}
                        onChange={(e) => updateSection('privacy', { ...privacy, emailVisibility: e.target.checked }, `Email visibility ${e.target.checked ? 'Enabled' : 'Disabled'}`)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>

                  <hr className="border-outline-variant/30" />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <span className="font-title-md text-base font-semibold text-on-surface block mb-1">
                        Location Visibility
                      </span>
                      <p className="font-body-md text-sm text-on-surface-variant">
                        Show my location on my public profile.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacy.locationVisibility}
                        onChange={(e) => updateSection('privacy', { ...privacy, locationVisibility: e.target.checked }, `Location visibility ${e.target.checked ? 'Enabled' : 'Disabled'}`)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. PREFERENCES TAB */}
          {/* ======================================================== */}
          {activeTab === 'Preferences' && (
            <div className="space-y-6">
              {/* Appearance Theme */}
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm">
                <div className="mb-6">
                  <h3 className="font-title-md text-lg font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">palette</span>
                    Appearance Theme
                  </h3>
                  <p className="text-body-md text-sm text-on-surface-variant mt-1">
                    Select how you'd like PolyCollab to look.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Light Theme */}
                  <label className="cursor-pointer group relative">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={preferences.theme === 'light'}
                      onChange={() => updateSection('preferences', { ...preferences, theme: 'light' }, 'Theme set to Light.')}
                      className="peer sr-only"
                    />
                    <div className="border border-outline-variant rounded-lg p-4 transition-all peer-checked:border-primary peer-checked:bg-surface-container-low peer-hover:border-primary/50 h-full flex flex-col">
                      <div className="w-full h-24 bg-surface border border-outline-variant rounded mb-3 overflow-hidden flex flex-col relative">
                        <div className="h-4 bg-surface-variant border-b border-outline-variant w-full" />
                        <div className="flex flex-1">
                          <div className="w-8 border-r border-outline-variant bg-surface-container h-full" />
                          <div className="flex-1 bg-surface-container-lowest p-2 space-y-1">
                            <div className="h-2 bg-surface-variant rounded w-3/4" />
                            <div className="h-2 bg-surface-variant rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-body-md text-sm font-medium text-on-surface">Light</span>
                        <div className="w-4 h-4 rounded-full border border-outline-variant flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary transition-colors">
                          <div className={`w-2 h-2 rounded-full bg-white ${preferences.theme === 'light' ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Dark Theme */}
                  <label className="cursor-pointer group relative">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={preferences.theme === 'dark'}
                      onChange={() => updateSection('preferences', { ...preferences, theme: 'dark' }, 'Theme set to Dark Mode.')}
                      className="peer sr-only"
                    />
                    <div className="border border-outline-variant rounded-lg p-4 transition-all peer-checked:border-primary peer-checked:bg-surface-container-low peer-hover:border-primary/50 h-full flex flex-col">
                      <div className="w-full h-24 bg-inverse-surface border border-outline-variant rounded mb-3 overflow-hidden flex flex-col relative">
                        <div className="h-4 bg-[#1e2532] border-b border-[#3d4756] w-full" />
                        <div className="flex flex-1">
                          <div className="w-8 border-r border-[#3d4756] bg-[#151c27] h-full" />
                          <div className="flex-1 bg-inverse-surface p-2 space-y-1">
                            <div className="h-2 bg-[#3d4756] rounded w-3/4" />
                            <div className="h-2 bg-[#3d4756] rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-body-md text-sm font-medium text-on-surface">Dark</span>
                        <div className="w-4 h-4 rounded-full border border-outline-variant flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary transition-colors">
                          <div className={`w-2 h-2 rounded-full bg-white ${preferences.theme === 'dark' ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* System Theme */}
                  <label className="cursor-pointer group relative">
                    <input
                      type="radio"
                      name="theme"
                      value="system"
                      checked={preferences.theme === 'system'}
                      onChange={() => updateSection('preferences', { ...preferences, theme: 'system' }, 'Theme set to System Default.')}
                      className="peer sr-only"
                    />
                    <div className="border border-outline-variant rounded-lg p-4 transition-all peer-checked:border-primary peer-checked:bg-surface-container-low peer-hover:border-primary/50 h-full flex flex-col">
                      <div className="w-full h-24 bg-surface border border-outline-variant rounded mb-3 overflow-hidden flex relative">
                        <div className="w-1/2 h-full flex flex-col bg-surface border-r border-outline-variant border-dashed">
                          <div className="h-4 bg-surface-variant border-b border-outline-variant w-full" />
                          <div className="flex-1 p-2"><div className="h-2 bg-surface-variant rounded w-full" /></div>
                        </div>
                        <div className="w-1/2 h-full flex flex-col bg-inverse-surface">
                          <div className="h-4 bg-[#1e2532] border-b border-[#3d4756] w-full" />
                          <div className="flex-1 p-2"><div className="h-2 bg-[#3d4756] rounded w-full" /></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-body-md text-sm font-medium text-on-surface">System</span>
                        <div className="w-4 h-4 rounded-full border border-outline-variant flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary transition-colors">
                          <div className={`w-2 h-2 rounded-full bg-white ${preferences.theme === 'system' ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
