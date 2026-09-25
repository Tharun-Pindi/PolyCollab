import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserProfile, getUserAvatar, getStoredData } from '../lib/storage';
import { getTranslation } from '../lib/i18n';
import { supabase } from '../lib/supabase';

export default function Header() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => getUserProfile());
  const [searchTerm, setSearchTerm] = useState('');
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setProfile(getUserProfile());
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, []);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      navigate(`/explore-projects?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleLogout = () => {
    setShowLogoutAlert(false);
    
    // Trigger signOut asynchronously without blocking the UI
    supabase.auth.signOut().catch((err) => console.warn(err));
    
    // Wipe all local storage on logout to reset everything (original flow)
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith('polycollab_') && 
        key !== 'polycollab_github_auth_source' &&
        key !== 'polycollab_all_published_projects' &&
        key !== 'polycollab_all_registered_builders'
      ) {
        localStorage.removeItem(key);
      }
      // Manually clear Supabase auth token so immediate reload doesn't log us back in
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });
    
    window.location.href = '/login';
  };

  return (
    <>
      <header className="fixed top-0 right-0 w-[calc(100%-260px)] h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-lg gap-md z-40">
      <div className="flex-1 flex items-center"></div>
      <div className="flex items-center gap-md">
        <Link
          to="/help"
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95 rounded-full hover:bg-surface-container"
          title="Help Center"
        >
          <span className="material-symbols-outlined">help</span>
        </Link>
        <button
          onClick={() => setShowLogoutAlert(true)}
          className="w-10 h-10 flex items-center justify-center text-error hover:text-error/80 transition-colors cursor-pointer active:scale-95 rounded-full hover:bg-error/10"
          title="Log Out"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
        <div
          onClick={() => navigate('/builder-profile')}
          className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant cursor-pointer hover:border-primary transition-colors shrink-0 bg-surface-container-high"
          title={profile.fullName || 'User Profile'}
        >
          <img
            src={getUserAvatar(profile)}
            alt={profile.fullName || 'User Avatar'}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>

    {showLogoutAlert && (
      <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl text-center">
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-error">logout</span>
          </div>
          <h3 className="font-title-lg text-title-lg text-on-surface font-bold mb-2">Are you sure you want to log out?</h3>
          <p className="text-body-md text-on-surface-variant mb-6">You will need to sign in again to access your projects and profile.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowLogoutAlert(false)}
              className="flex-1 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2 bg-error text-white rounded-lg hover:bg-red-600 transition-colors font-semibold cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}


