import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { loadSettings } from '../lib/storage';

export default function Layout() {
  const [instantNotifToast, setInstantNotifToast] = useState(null);

  useEffect(() => {
    const handleInstantNotif = (e) => {
      const notif = e.detail;
      setInstantNotifToast(notif);
      setTimeout(() => setInstantNotifToast(null), 5000);
    };
    window.addEventListener('polycollab_instant_notification', handleInstantNotif);
    return () => window.removeEventListener('polycollab_instant_notification', handleInstantNotif);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const settings = loadSettings();
      const theme = settings.preferences?.theme || 'light';
      const lang = settings.account?.language || 'English (US)';
      const root = document.documentElement;

      const isTelugu = lang === 'Telugu' || lang === 'Telugu (తెలుగు)';
      root.setAttribute('data-lang', isTelugu ? 'Telugu' : 'English');
      root.setAttribute('lang', isTelugu ? 'te' : 'en');

      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else if (theme === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
      } else {
        // System preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.remove('dark');
          root.classList.add('light');
        }
      }
    };

    applyTheme();

    const handleStateChange = () => applyTheme();
    window.addEventListener('polycollab_state_change', handleStateChange);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const settings = loadSettings();
      if (settings.preferences?.theme === 'system') {
        applyTheme();
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('polycollab_state_change', handleStateChange);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  return (
    <div className="bg-background text-on-surface font-body-md antialiased h-screen overflow-hidden flex relative">
      {/* Instant Push Notification Toast Alert */}
      {instantNotifToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#4648d4] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 font-body-md text-sm border border-white/20 animate-fade-in">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">{instantNotifToast.icon || 'notifications'}</span>
          </div>
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-white/90">{instantNotifToast.title}</div>
            <div className="text-xs text-white/80 mt-0.5">{instantNotifToast.desc}</div>
          </div>
          <button
            onClick={() => setInstantNotifToast(null)}
            className="ml-2 text-white/60 hover:text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
      <Sidebar />
      <Header />
      <main className="ml-[260px] mt-16 p-lg w-[calc(100%-260px)] h-[calc(100vh-4rem)] overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
