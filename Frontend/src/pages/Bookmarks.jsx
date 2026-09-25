import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getBookmarkedProjects,
  getBookmarkedBuilders,
  toggleProjectBookmarkInStorage,
  toggleBuilderBookmarkInStorage,
  getBuilderAvatar,
  getStoredData
} from '../lib/storage';
import { getTranslation } from '../lib/i18n';

export default function Bookmarks() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState(() => {
    const acc = getStoredData('account', {});
    return acc.language || 'English (US)';
  });
  const [savedProjects, setSavedProjects] = useState(getBookmarkedProjects());
  const [savedBuilders, setSavedBuilders] = useState(getBookmarkedBuilders());
  const [activeTab, setActiveTab] = useState(() => (savedProjects.length > 0 ? 'Projects' : 'Builders'));
  const [toastMessage, setToastMessage] = useState('');

  // Sync automatically when bookmarks change anywhere in the app
  useEffect(() => {
    const handleStorageChange = () => {
      const acc = getStoredData('account', {});
      setLanguage(acc.language || 'English (US)');
      setSavedProjects(getBookmarkedProjects());
      setSavedBuilders(getBookmarkedBuilders());
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const removeProjectBookmark = (project) => {
    toggleProjectBookmarkInStorage(project);
    const updated = getBookmarkedProjects();
    setSavedProjects(updated);
    showToast(`Removed "${project.title}" from saved projects.`);
  };

  const removeBuilderBookmark = (builder) => {
    toggleBuilderBookmarkInStorage(builder);
    const updated = getBookmarkedBuilders();
    setSavedBuilders(updated);
    showToast(`Removed "${builder.name}" from saved builders.`);
  };

  return (
    <div className="p-lg max-w-container-max mx-auto w-full flex-1 flex flex-col gap-xl relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#4648d4] text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce font-mono text-sm">
          <span className="material-symbols-outlined text-lg">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-sm">
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
          {activeTab === 'Projects' ? getTranslation(language, 'savedProjects') : getTranslation(language, 'savedBuilders')}
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          {activeTab === 'Projects'
            ? 'Projects you are tracking for future collaboration.'
            : 'Builders you are tracking for future collaboration.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant w-full mb-md">
        <button
          type="button"
          onClick={() => setActiveTab('Projects')}
          className={`px-lg py-sm font-title-md text-title-md transition-colors cursor-pointer border-b-2 ${
            activeTab === 'Projects'
              ? 'border-primary text-primary font-bold bg-primary/5'
              : 'border-transparent text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          {getTranslation(language, 'bookmarksProjectsTab')} ({savedProjects.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('Builders')}
          className={`px-lg py-sm font-title-md text-title-md transition-colors cursor-pointer border-b-2 ${
            activeTab === 'Builders'
              ? 'border-primary text-primary font-bold bg-primary/5'
              : 'border-transparent text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          {getTranslation(language, 'bookmarksBuildersTab')} ({savedBuilders.length})
        </button>
      </div>

      {/* Projects Section */}
      {activeTab === 'Projects' && (
        <section>
          {savedProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
              {savedProjects.map((project) => {
                const techList = Array.isArray(project.tech)
                  ? project.tech
                  : typeof project.tech === 'string'
                  ? project.tech.split(',').map((t) => t.trim())
                  : [];

                return (
                  <article
                    key={project.id}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col gap-md hover:border-primary transition-colors group relative overflow-hidden shadow-sm"
                  >
                    {/* Header & Bookmark */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-md">
                        <div className="w-12 h-12 rounded-lg bg-primary-container/10 flex items-center justify-center">
                          <span className="font-bold text-primary text-headline-md">
                            {project.initials || project.title?.slice(0, 2).toUpperCase() || 'PR'}
                          </span>
                        </div>
                        <div>
                          <h3
                            onClick={() => navigate('/view-project', { state: { project, from: 'bookmarks' } })}
                            className="font-title-md text-title-md font-bold text-on-surface hover:text-primary transition-colors cursor-pointer"
                          >
                            {project.title}
                          </h3>
                          <p className="text-body-md text-on-surface-variant">{project.category || 'Open Source'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProjectBookmark(project)}
                        className="text-primary cursor-pointer active:scale-95 transition-transform p-1 hover:bg-surface-container rounded-md"
                        title="Remove from saved"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          bookmark
                        </span>
                      </button>
                    </div>

                    {/* Description */}
                    <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 mt-sm">
                      {project.desc}
                    </p>

                    {/* Tech Tags */}
                    {techList.length > 0 && (
                      <div className="flex flex-wrap gap-xs mt-sm">
                        {techList.map((t) => (
                          <span key={t} className="px-2 py-1 rounded bg-surface-container-high text-on-surface-variant font-label-md text-label-md">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-col gap-sm mt-sm">
                      {(project.builders || project.teamSize) && (
                        <div className="flex items-center gap-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-body-lg">groups</span>
                          <span className="text-body-md">{project.builders || project.teamSize}</span>
                        </div>
                      )}
                      {project.level && (
                        <div className="flex items-center gap-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-body-lg">signal_cellular_alt</span>
                          <span className="text-body-md">{project.level}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-md border-t border-outline-variant/30 flex items-center justify-between">
                      <div className="flex items-center gap-xs text-primary">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span className="text-label-md font-bold">Saved Project</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/view-project', { state: { project, from: 'bookmarks' } })}
                        className="px-md py-sm rounded-lg border border-outline-variant text-on-surface font-title-md text-title-md hover:border-primary hover:text-primary transition-colors cursor-pointer"
                      >
                        View Project
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 border border-dashed border-outline-variant rounded-xl bg-surface-container-lowest/50 text-center p-lg">
              <span className="material-symbols-outlined text-4xl text-outline mb-sm">bookmark_border</span>
              <h3 className="font-title-md text-title-md text-on-surface mb-2 font-semibold">No saved projects</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md max-w-sm">
                You haven't saved any projects yet.
              </p>
              <button
                type="button"
                onClick={() => navigate('/explore-projects')}
                className="bg-primary text-on-primary font-body-md px-md py-2 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer font-semibold shadow-sm"
              >
                Explore Projects
              </button>
            </div>
          )}
        </section>
      )}

      {/* Builders Section */}
      {activeTab === 'Builders' && (
        <section>
          {savedBuilders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
              {savedBuilders.map((builder) => {
                const skillsList = Array.isArray(builder.skills)
                  ? builder.skills
                  : typeof builder.skills === 'string'
                  ? builder.skills.split(',').map((s) => s.trim())
                  : [];

                return (
                  <article
                    key={builder.id}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col gap-md hover:border-primary transition-colors group relative overflow-hidden shadow-sm"
                  >
                    {/* Header & Bookmark */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-md">
                        {builder.avatar ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant shrink-0 bg-surface-container">
                            <img alt={`${builder.name} Profile`} className="w-full h-full object-cover" src={getBuilderAvatar(builder)} />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant shrink-0 bg-surface-container flex items-center justify-center text-tertiary font-bold text-xl">
                            {builder.initials || builder.name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3
                            onClick={() => navigate('/builder-profile', { state: { builder } })}
                            className="font-title-md text-title-md font-bold text-on-surface hover:text-primary transition-colors cursor-pointer"
                          >
                            {builder.name}
                          </h3>
                          <p className="text-body-md text-on-surface-variant">{builder.role}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-xs">
                        <button
                          type="button"
                          onClick={() => removeBuilderBookmark(builder)}
                          className="text-primary cursor-pointer active:scale-95 transition-transform p-1 hover:bg-surface-container rounded-md"
                          title="Remove from saved"
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            bookmark
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 mt-sm">
                      {builder.bio}
                    </p>

                    {/* Skills Tags */}
                    {skillsList.length > 0 && (
                      <div className="flex flex-wrap gap-xs mt-sm">
                        {skillsList.map((skill) => (
                          <span key={skill} className="px-2 py-1 rounded bg-surface-container-high text-on-surface-variant font-label-md text-label-md">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata with Icons */}
                    <div className="flex flex-col gap-sm mt-sm">
                      {builder.experience && (
                        <div className="flex items-center gap-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-body-lg">work</span>
                          <span className="text-body-md">{builder.experience}</span>
                        </div>
                      )}
                      {builder.location && (
                        <div className="flex items-center gap-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-body-lg">location_on</span>
                          <span className="text-body-md">{builder.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-md border-t border-outline-variant/30 flex items-center justify-between">
                      <div className="flex items-center gap-xs text-primary">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span className="text-label-md font-bold">Saved Builder</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/builder-profile', { state: { builder } })}
                        className="px-md py-sm rounded-lg border border-outline-variant text-on-surface font-title-md text-title-md hover:border-primary hover:text-primary transition-colors cursor-pointer"
                      >
                        View Profile
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 border border-dashed border-outline-variant rounded-xl bg-surface-container-lowest/50 text-center p-lg">
              <span className="material-symbols-outlined text-4xl text-outline mb-sm">bookmark_border</span>
              <h3 className="font-title-md text-title-md text-on-surface mb-2 font-semibold">No saved builders</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md max-w-sm">
                You haven't saved any builder profiles yet.
              </p>
              <button
                type="button"
                onClick={() => navigate('/find-builders')}
                className="bg-primary text-on-primary font-body-md px-md py-2 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer font-semibold shadow-sm"
              >
                Find Builders
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
