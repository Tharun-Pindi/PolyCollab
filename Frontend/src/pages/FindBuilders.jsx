import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getBookmarkedBuilders,
  isBuilderBookmarkedInStorage,
  toggleBuilderBookmarkInStorage,
  getAllRegisteredBuilders,
  fetchRegisteredBuildersFromSupabase,
  subscribeToSupabaseRealtime,
  getBuilderAvatar,
  getBuilderSkills,
  getStoredData
} from '../lib/storage';
import { getTranslation } from '../lib/i18n';

const ROLES = [
  'Frontend Engineer',
  'Backend Engineer',
  'Fullstack Engineer',
  'Smart Contract Developer',
  'DevOps & Infra',
  'UI/UX Designer',
  'Data Engineer',
  'AI/ML Specialist'
];

export default function FindBuilders() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => {
    const acc = getStoredData('account', {});
    return acc.language || 'English (US)';
  });
  const [buildersList, setBuildersList] = useState(() => getAllRegisteredBuilders());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [bookmarkVersion, setBookmarkVersion] = useState(0);

  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchRegisteredBuildersFromSupabase().then((data) => {
      if (data) setBuildersList(data);
    });

    // Realtime subscription is now handled globally in App.jsx

    const handleStorageChange = () => {
      const acc = getStoredData('account', {});
      setLanguage(acc.language || 'English (US)');
      setBuildersList(getAllRegisteredBuilders());
      setBookmarkVersion((v) => v + 1);
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => {
      window.removeEventListener('polycollab_state_change', handleStorageChange);
    };
  }, []);


  const handleToggleBookmark = (builder) => {
    const isNowBookmarked = toggleBuilderBookmarkInStorage(builder);
    setBookmarkVersion((v) => v + 1);
    if (isNowBookmarked) {
      setToastMessage({
        text: `Saved "${builder.name}" to Bookmarks!`,
        actionText: 'View Saved',
        onAction: () => navigate('/bookmarks')
      });
    } else {
      setToastMessage({
        text: `Removed "${builder.name}" from Bookmarks.`,
        actionText: null
      });
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredBuilders = buildersList.filter((b) => {
    if (!b) return false;
    const name = (b.name || b.fullName || b.creatorName || '').toLowerCase();
    const role = (b.role || b.title || '').toLowerCase();
    const bio = (b.bio || b.desc || '').toLowerCase();
    const searchLower = (search || '').toLowerCase();

    const matchesSearch = !searchLower || name.includes(searchLower) || role.includes(searchLower) || bio.includes(searchLower);
    
    // Make role matching very permissive since titles vary
    const matchesRole = !roleFilter || 
      role.includes(roleFilter.toLowerCase()) || 
      roleFilter.toLowerCase().includes(role.replace('engineer', '').replace('developer', '').trim());

    const skillsList = getBuilderSkills(b).map((s) => s.toLowerCase());
    const matchesTech = !techFilter || skillsList.some((s) => s.includes(techFilter.toLowerCase()));

    return matchesSearch && matchesRole && matchesTech;
  });

  const baseTechs = ['React', 'Python', 'Rust', 'Go', 'Solidity', 'TypeScript', 'Node.js', 'Flutter', 'Kubernetes', 'gRPC', 'AWS', 'Docker', 'Next.js', 'Vue.js', 'GraphQL'];
  const dynamicTechnologies = Array.from(new Set([...baseTechs, ...buildersList.flatMap((b) => getBuilderSkills(b))])).filter(Boolean).sort();

  return (
    <div className="max-w-[1280px] mx-auto relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#4648d4] text-white px-5 py-3 rounded-lg shadow-xl flex items-center justify-between gap-4 font-mono text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">bookmark</span>
            <span>{toastMessage.text}</span>
          </div>
          {toastMessage.actionText && (
            <button
              type="button"
              onClick={toastMessage.onAction}
              className="bg-white text-primary font-bold px-3 py-1 rounded text-xs hover:bg-opacity-90 transition-colors cursor-pointer"
            >
              {toastMessage.actionText}
            </button>
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display-lg text-display-lg text-on-surface mb-2 font-bold">{getTranslation(language, 'buildersTitle')}</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">{getTranslation(language, 'buildersSub')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface outline-none transition-all shadow-sm"
            placeholder={getTranslation(language, 'searchBuildersPlaceholder')}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="relative">
            <select
              className="bg-surface-container-lowest border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none shadow-sm cursor-pointer"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">{getTranslation(language, 'Role')}</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{getTranslation(language, r)}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">expand_more</span>
          </div>

          <div className="relative">
            <select
              className="bg-surface-container-lowest border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none shadow-sm cursor-pointer"
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
            >
              <option value="">{getTranslation(language, 'technology')}</option>
              {dynamicTechnologies.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">expand_more</span>
          </div>

          {(search || roleFilter || techFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setTechFilter('');
              }}
              className="flex items-center gap-1 px-4 py-2 text-sm text-error hover:bg-error/10 border border-error/20 rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">clear_all</span>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Builder Grid */}
      {filteredBuilders.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">group_off</span>
          <h3 className="text-lg font-bold text-on-surface mb-1">No Registered Builders Found</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            Only real registered users will appear here once they complete their profile registration.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBuilders.map((b) => {
            const isBookmarked = isBuilderBookmarkedInStorage(b);
            return (
              <div
                key={b.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col hover:border-primary/50 transition-colors shadow-sm relative"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-surface-variant border border-outline-variant">
                      <img className="w-full h-full object-cover" src={getBuilderAvatar(b)} alt={b.name} />
                    </div>
                    <div>
                      <h3 className="font-title-md text-title-md font-bold text-on-surface">{b.name}</h3>
                      <p className="text-on-surface-variant font-body-md text-sm">{getTranslation(language, b.role)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(b)}
                    className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-1"
                    title={isBookmarked ? 'Remove Bookmark' : 'Save Builder'}
                  >
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {isBookmarked ? 'bookmark' : 'bookmark_border'}
                    </span>
                  </button>
                </div>

                <p className="text-on-surface-variant text-sm mb-4 flex-1 line-clamp-3">
                  {b.bio}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getBuilderSkills(b).map((skill) => (
                    <span key={skill} className="px-2 py-1 bg-surface-container-low text-on-surface text-xs font-label-md rounded border border-outline-variant/30 font-mono">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">work</span>
                    <span>{getTranslation(language, b.experience)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span>{b.availability}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <span>{b.location}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/50">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <span className="material-symbols-outlined text-[14px]">
                      {b.match === 'Current User' ? 'person' : 'check_circle'}
                    </span>
                    {getTranslation(language, b.match)}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/builder-profile', { state: { builder: b } })}
                    className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface font-medium text-sm rounded-lg hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    {getTranslation(language, 'viewProfileBtn')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
