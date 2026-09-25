import React, { useState, useEffect } from 'react';
import { getStoredData } from '../lib/storage';
import { getTranslation } from '../lib/i18n';

const threads = [
  {
    id: 1,
    name: 'Nexus Protocol V2',
    lastMsg: "Sarah: I've pushed the new Rust optimizations.",
    time: '10:42 AM',
    tag: 'Project',
    active: true,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADTiJbZ0LxN7Vg_XfHFPsoOera4k75f0U8R884BDpGwJ80G5g3zhEpE8dvhkBOWphdA5OBrMvhUBGMq1PE9Z3wC1rwwp9h7FTlxb_ZGZxm2X37zfIZ_gov0QASRYSXeQxzctm7H0Sv2c_LfX3EhgFLPtg-d-gOTBlmvc4AGo_x8YbYGlu7XBFIEh4e2V-de6lMEnSaSzdYpVFW2950e7a4Y8Pdhzrg-y_2wzqf_67Z6-2sxPlvH0k'
  },
  {
    id: 2,
    name: 'EthRPC Optimizer',
    lastMsg: 'David: Can you review PR #42?',
    time: 'Yesterday',
    unread: true,
    img: null
  },
  {
    id: 3,
    name: 'Sarah Chen',
    lastMsg: 'Thanks for the feedback on the architecture.',
    time: 'Mon',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCprKlwJi4-2J6pqDIwmAh8QABK3PU1GuA-LH3ps8H07tIZp-7ht3GtYPJ7N1DbwN9tIaK6ZfN1ypuLVXsqFMYZlSI7sKFRq83ztDJ8as7e4-XhFv9JVUs1hV5-drSHkPwx0_iye3LhDeWwUQSBd-qvBHoIm87UjjG_80ybV6cCwdNNe69esSP2tBeQiEUZyv6Z6yHhMGiO0849ANnqkqQu5wRZA6glL-O6dCPv5mqxkAwf4fU-Cu0'
  }
];

export default function Messages() {
  const [language, setLanguage] = useState(() => {
    const acc = getStoredData('account', {});
    return acc.language || 'English (US)';
  });
  const [selectedThread, setSelectedThread] = useState(threads[0]);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'David Kim', time: '10:15 AM', text: "Hey team, I've been looking at the state management for the new protocol dashboard. I think we should refactor the core context provider before moving forward with the UI components." },
    { id: 2, sender: 'You', time: '10:22 AM', text: 'Agreed. The current implementation is causing unnecessary re-renders on the main data grid. Have you started on a draft for the new structure?' },
    { id: 3, sender: 'Sarah Chen', time: '10:35 AM', text: "Yes, I just pushed a POC. I'm using Rust for the heavy lifting on the backend to optimize the RPC calls." }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  useEffect(() => {
    const handleStorageChange = () => {
      const acc = getStoredData('account', {});
      setLanguage(acc.language || 'English (US)');
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages([...messages, { id: Date.now(), sender: 'You', time: 'Just now', text: inputMsg }]);
    setInputMsg('');
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden bg-background -m-lg">
      {/* Column 1: Thread List */}
      <div className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 flex flex-col bg-surface-container-lowest border-r border-outline-variant">
        <div className="p-md border-b border-outline-variant flex flex-col gap-3 shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="font-title-md text-title-md text-on-surface">{getTranslation(language, 'messagesTitle')}</h2>
            <button className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
            </button>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              className="w-full pl-9 pr-3 py-1.5 bg-surface rounded-lg border border-outline-variant font-body-md text-body-md text-on-surface outline-none"
              placeholder={getTranslation(language, 'searchChatsPlaceholder')}
              type="text"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedThread(t)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer ${
                selectedThread.id === t.id
                  ? 'bg-surface-container-low border border-primary/20'
                  : 'hover:bg-surface-container-high'
              }`}
            >
              <div className="relative shrink-0">
                {t.img ? (
                  <img className="w-10 h-10 rounded-lg object-cover bg-surface-variant border border-outline-variant" src={t.img} alt={t.name} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center font-bold text-lg">
                    {t.name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-body-md font-semibold text-on-surface truncate">{t.name}</h3>
                  <span className="text-[11px] text-on-surface-variant shrink-0 ml-2">{t.time}</span>
                </div>
                <p className="font-body-md text-on-surface-variant text-sm truncate">{t.lastMsg}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Column 2: Active Chat Area */}
      <div className="flex-1 flex flex-col bg-surface-container-lowest min-w-0">
        <div className="h-16 flex items-center justify-between px-md md:px-lg border-b border-outline-variant shrink-0 bg-surface/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <h3 className="font-title-md text-on-surface font-bold">{selectedThread.name}</h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-container-high text-on-surface-variant">4 members</span>
          </div>
        </div>

        {/* Red Warning Banner */}
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{getTranslation(language, 'chatNoticeMsg')}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-md md:p-lg space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 max-w-[85%] ${m.sender === 'You' ? 'ml-auto justify-end' : ''}`}>
              <div className={`flex flex-col gap-1 ${m.sender === 'You' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm text-on-surface">{m.sender}</span>
                  <span className="text-xs text-on-surface-variant">{m.time}</span>
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                  m.sender === 'You' ? 'bg-primary text-on-primary rounded-tr-sm' : 'bg-surface-container border border-outline-variant/30 text-on-surface rounded-tl-sm'
                }`}>
                  <p>{m.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-md border-t border-outline-variant bg-surface-container-lowest flex gap-md">
          <input
            className="flex-1 bg-surface border border-outline-variant rounded-xl p-3 text-sm outline-none focus:border-primary"
            placeholder={getTranslation(language, 'replyPlaceholder')}
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
          />
          <button type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-xl font-medium cursor-pointer" style={{ backgroundColor: 'rgb(99, 102, 241)' }}>
            {getTranslation(language, 'sendBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}
