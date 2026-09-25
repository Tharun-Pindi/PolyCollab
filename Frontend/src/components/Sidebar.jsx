import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getStoredData } from '../lib/storage';
import { getTranslation } from '../lib/i18n';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => {
    const acc = getStoredData('account', {});
    return acc.language || 'English (US)';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const acc = getStoredData('account', {});
      setLanguage(acc.language || 'English (US)');
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, []);

  const isTelugu = language === 'Telugu' || language === 'Telugu (తెలుగు)';

  const navItems = [
    { name: getTranslation(language, 'dashboard'), path: '/dashboard', icon: 'dashboard' },
    { name: getTranslation(language, 'exploreProjects'), path: '/explore-projects', icon: 'explore' },
    { name: getTranslation(language, 'findBuilders'), path: '/find-builders', icon: 'groups' },
    { name: getTranslation(language, 'myProjects'), path: '/my-projects', icon: 'inventory_2' },
    { name: getTranslation(language, 'notifications'), path: '/notifications', icon: 'notifications' },
    { name: getTranslation(language, 'bookmarks'), path: '/bookmarks', icon: 'bookmark' },
  ];

  const bottomNavItems = [
    { name: getTranslation(language, 'settings'), path: '/settings', icon: 'settings' },
    { name: getTranslation(language, 'profile'), path: '/builder-profile', icon: 'account_circle' },
    { name: getTranslation(language, 'helpCenter'), path: '/help', icon: 'help' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-[260px] bg-surface border-r border-outline-variant flex flex-col py-lg z-50">
      <div className="px-lg mb-xl">
        <Link to="/dashboard" className="flex items-center gap-md">
          <img 
            src="/logo.png" 
            alt="PolyCollab Logo" 
            className="h-9 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-primary leading-none font-bold">PolyCollab</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-sm flex flex-col gap-xs">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-md px-md py-sm cursor-pointer active:opacity-80 transition-colors ${
                isActive
                  ? 'bg-primary-container/10 text-primary font-bold border-l-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-secondary-container/50'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-body-md text-body-md">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="px-sm mt-auto flex flex-col gap-xs pt-md border-t border-outline-variant/50">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-md px-md py-sm cursor-pointer active:opacity-80 transition-colors ${
                isActive
                  ? 'bg-primary-container/10 text-primary font-bold border-l-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-secondary-container/50'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-body-md text-body-md">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


