import React, { useState, useEffect } from 'react';
import { getNotificationsList, setStoredData, clearAllNotifications, getStoredData } from '../lib/storage';
import { getTranslation } from '../lib/i18n';

export default function Notifications() {
  const [language, setLanguage] = useState(() => {
    const acc = getStoredData('account', {});
    return acc.language || 'English (US)';
  });
  const [list, setList] = useState(() => getNotificationsList());

  useEffect(() => {
    const handleStorageChange = () => {
      const acc = getStoredData('account', {});
      setLanguage(acc.language || 'English (US)');
      setList(getNotificationsList());
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, []);

  const markAllRead = () => {
    const updated = list.map((item) => ({ ...item, read: true }));
    setList(updated);
    setStoredData('notifications_list', updated);
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setList([]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">{getTranslation(language, 'notifications')}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">{getTranslation(language, 'notificationsSub')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {list.some((n) => !n.read) && (
            <button
              onClick={markAllRead}
              className="text-sm font-label-md text-primary hover:underline cursor-pointer"
            >
              {getTranslation(language, 'markAllRead')}
            </button>
          )}
          {list.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm font-label-md text-red-600 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              {getTranslation(language, 'clearAllNotifs')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant shadow-sm">
        {list.length === 0 ? (
          <div className="p-xl text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 text-outline">notifications_off</span>
            <p className="font-body-lg text-body-lg">{getTranslation(language, 'noNotifsYet')}</p>
          </div>
        ) : (
          list.map((item) => (
            <div key={item.id} className={`p-md flex items-start gap-md ${item.read ? 'bg-surface-container-lowest' : 'bg-primary/5'}`}>
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 mt-1">
                <span className={`material-symbols-outlined ${item.iconColor || 'text-primary'}`}>{item.icon || 'notifications'}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-baseline">
                  <h3 className={`font-title-md text-title-md ${item.read ? 'text-on-surface font-semibold' : 'text-primary font-bold'}`}>
                    {item.title}
                  </h3>
                  <span className="text-xs text-on-surface-variant font-mono">{item.time}</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mt-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

