import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBookmarkedProjects, isProjectBookmarkedInStorage, toggleProjectBookmarkInStorage, getAllPublishedProjects, fetchProjectsFromSupabase, getStoredData } from '../lib/storage';
import { getTranslation } from '../lib/i18n';

const CATEGORIES = [
  'Web App',
  'Mobile App',
  'Data Tool',
  'AI / ML',
  'DeFi / Web3',
  'DevOps & Infra',
  'Cybersecurity',
  'Game Development'
];

const TECHNOLOGIES = [
  'React',
  'Python',
  'Rust',
  'Go',
  'TypeScript',
  'Node.js',
  'Solidity',
  'Vue.js',
  'Flutter',
  'Docker'
];

export default function ExploreProjects() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('search') || '';

  const [language, setLanguage] = useState(() => {
    const acc = getStoredData('account', {});
    return acc.language || 'English (US)';
  });
  const [projectsList, setProjectsList] = useState(() => getAllPublishedProjects());
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTech, setSelectedTech] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [bookmarkVersion, setBookmarkVersion] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('search');
    if (q !== null) {
      setSearchTerm(q);
    }
  }, [location.search]);

  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchProjectsFromSupabase().then((data) => {
      if (data) setProjectsList(data);
    });

    const handleStorageChange = () => {
      const acc = getStoredData('account', {});
      setLanguage(acc.language || 'English (US)');
      setProjectsList(getAllPublishedProjects());
      setBookmarkVersion((v) => v + 1);
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, []);

  const handleToggleBookmark = (p) => {
    const isNowBookmarked = toggleProjectBookmarkInStorage(p);
    setBookmarkVersion((v) => v + 1);
    if (isNowBookmarked) {
      setToastMessage({
        text: `Saved "${p.title}" to Bookmarks!`,
        actionText: 'View Saved',
        onAction: () => navigate('/bookmarks')
      });
    } else {
      setToastMessage({
        text: `Removed "${p.title}" from Bookmarks.`,
        actionText: null
      });
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredProjects = projectsList.filter((p) => {
    if (!p) return false;
    const title = String(p.title || '').toLowerCase();
    const desc = String(p.desc || p.shortDesc || p.overview || '').toLowerCase();
    const category = String(p.category || '').toLowerCase();
    const status = String(p.status || '').toLowerCase();
    
    const techStr = Array.isArray(p.tech) ? p.tech.join(', ').toLowerCase() : String(p.tech || '').toLowerCase();
    const tagsArray = Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? p.tags.split(',') : []);

    const sLower = (searchTerm || '').toLowerCase();
    const cLower = (selectedCategory || '').toLowerCase();
    const tLower = (selectedTech || '').toLowerCase();
    const stLower = (selectedStatus || '').toLowerCase();

    const matchesSearch = !sLower || title.includes(sLower) || desc.includes(sLower);
    
    const matchesCategory =
      !cLower ||
      category.includes(cLower) ||
      tagsArray.some((t) => String(t).toLowerCase().includes(cLower));

    const matchesTech = !tLower || techStr.includes(tLower);

    const matchesStatus = !stLower || status.includes(stLower);

    return matchesSearch && matchesCategory && matchesTech && matchesStatus;
  });

  return (
    <div className="max-w-container-max mx-auto space-y-lg relative">
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

      {/* Header */}
      <div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">{getTranslation(language, 'exploreTitle')}</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {getTranslation(language, 'exploreSub')}
        </p>
      </div>

      {/* Search & Filter Bar (Classic Old UI Style) */}
      <div className="bg-surface rounded-xl border border-outline-variant p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center shadow-lg">
        <div className="relative w-full md:flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-md text-body-md text-on-surface placeholder-on-surface-variant outline-none"
            placeholder={getTranslation(language, 'searchProjectsPlaceholder')}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="relative">
            <select
              className="pl-3 pr-8 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer min-w-[130px]"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">{getTranslation(language, 'category')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
          </div>

          <div className="relative">
            <select
              className="pl-3 pr-8 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer min-w-[130px]"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
            >
              <option value="">{getTranslation(language, 'technology')}</option>
              {TECHNOLOGIES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
          </div>

          <div className="relative">
            <select
              className="pl-3 pr-8 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer min-w-[120px]"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">{getTranslation(language, 'status')}</option>
              <option value="open">Open</option>
              <option value="progress">In Progress</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
              setSelectedTech('');
              setSelectedStatus('');
            }}
            className="px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface font-label-md text-label-md hover:bg-secondary-container/20 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            {getTranslation(language, 'clearFilters')}
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const isBookmarked = isProjectBookmarkedInStorage(p);
            const totalOpenings = p?.roles?.reduce((acc, r) => acc + (parseInt(r.openings, 10) || 1), 0) || 0;
            const displayCapacity = totalOpenings > 0 
              ? `${totalOpenings} ${totalOpenings === 1 ? 'Builder' : 'Builders'}`
              : (p.teamSize || p.builders || '5 Builders');
            return (
              <article
                key={p.id}
                className="bg-surface rounded-xl border border-outline-variant p-5 hover:border-primary/50 transition-colors group flex flex-col h-full relative hover:shadow-md"
              >
                {/* Top Row */}
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`px-2.5 py-1 rounded-full border font-label-md text-label-md flex items-center gap-1.5 ${
                      p.status === 'Open'
                        ? 'border-[#22c55e]/50 text-[#16a34a] bg-[#f0fdf4]/50'
                        : 'border-primary/30 text-primary bg-primary/5'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        p.status === 'Open' ? 'bg-[#22c55e]' : 'bg-primary'
                      }`}
                    ></span>
                    {p.status}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(p)}
                    className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-1"
                    title={isBookmarked ? 'Remove Bookmark' : 'Save Project'}
                  >
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {isBookmarked ? 'bookmark' : 'bookmark_border'}
                    </span>
                  </button>
                </div>

                {/* Title & Desc */}
                <h2
                  onClick={() => navigate('/view-project', { state: { project: p, from: 'explore' } })}
                  className="font-title-md text-title-md font-bold text-on-surface mb-2 group-hover:text-primary transition-colors cursor-pointer"
                >
                  {p.title}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-4 flex-1">
                  {p.desc}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? p.tags.split(',') : [])).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-md text-label-md">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="w-full h-px bg-outline-variant/50 my-4"></div>

                {/* Meta Info */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <div className="flex items-center gap-1" title="Tech Stack">
                      <span className="material-symbols-outlined text-[18px]">terminal</span>
                      <span className="font-label-md text-label-md">{Array.isArray(p.tech) ? p.tech.join(', ') : (p.tech || '')}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Team Size">
                      <span className="material-symbols-outlined text-[18px]">group</span>
                      <span className="font-label-md text-label-md">{displayCapacity}</span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <button
                  type="button"
                  onClick={() => navigate('/view-project', { state: { project: p, from: 'explore' } })}
                  className="w-full py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-label-md text-label-md hover:border-primary hover:text-primary transition-colors mt-auto bg-primary/5 cursor-pointer font-semibold"
                >
                  View Project
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center space-y-4 my-8 shadow-sm">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">folder_off</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface">No Projects Published Yet</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
            {searchTerm || selectedCategory || selectedTech || selectedStatus
              ? "No projects match your filter parameters. Try clearing your filters or creating a new project."
              : "No projects have been created yet. Be the first to create a real project to test multi-user collaboration!"}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {(searchTerm || selectedCategory || selectedTech || selectedStatus) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedTech('');
                  setSelectedStatus('');
                }}
                className="px-4 py-2 border border-outline-variant text-on-surface font-semibold text-xs rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/create-project')}
              className="px-6 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary/90 transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Real Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
