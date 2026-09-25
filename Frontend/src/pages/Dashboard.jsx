import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getUserProfile,
  getUserCreatedProjects,
  getBookmarkedProjects,
  getBookmarkedBuilders,
  getNotificationsList,
  getAllPublishedProjects,
  fetchProjectsFromSupabase,
  getStoredData
} from '../lib/storage';
import { getTranslation } from '../lib/i18n';

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => getUserProfile());
  const [activeProjects, setActiveProjects] = useState(() => getUserCreatedProjects());
  const [savedProjects, setSavedProjects] = useState(() => getBookmarkedProjects());
  const [savedBuilders, setSavedBuilders] = useState(() => getBookmarkedBuilders());
  const [notifications, setNotifications] = useState(() => getNotificationsList());
  const [allProjects, setAllProjects] = useState(() => getAllPublishedProjects());
  const [language, setLanguage] = useState(() => {
    const acc = getStoredData('account', {});
    return acc.language || 'English (US)';
  });

  useEffect(() => {
    fetchProjectsFromSupabase().then((data) => {
      if (data) setAllProjects(data);
    });

    const handleStorageChange = () => {
      setProfile(getUserProfile());
      setActiveProjects(getUserCreatedProjects());
      setSavedProjects(getBookmarkedProjects());
      setSavedBuilders(getBookmarkedBuilders());
      setNotifications(getNotificationsList());
      setAllProjects(getAllPublishedProjects());
      const acc = getStoredData('account', {});
      setLanguage(acc.language || 'English (US)');
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, []);

  const isTelugu = language === 'Telugu' || language === 'Telugu (తెలుగు)';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (isTelugu) {
      if (hour < 12) return 'శుభోదయం';
      if (hour < 17) return 'శుభ మధ్యాహ్నం';
      return 'శుభ సాయంత్రం';
    }
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = profile.fullName ? profile.fullName.split(' ')[0] : (isTelugu ? 'డెవలపర్' : 'Builder');
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-container-max mx-auto space-y-xl">
      {/* Greeting & Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider">
              {profile.title || 'Developer Workspace'}
            </span>
            {profile.location && (
              <span className="text-on-surface-variant text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                {profile.location}
              </span>
            )}
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
            {getGreeting()}, {userName} 👋
          </h2>
          <p className="font-body-lg text-body-md text-on-surface-variant mt-1">
            {getTranslation(language, 'welcomeSub')}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/explore-projects')}
            className="px-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-label-md text-sm hover:border-primary hover:text-primary transition-colors cursor-pointer font-medium"
          >
            {getTranslation(language, 'exploreProjects')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/create-project')}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-sm hover:bg-primary/90 transition-all cursor-pointer font-bold shadow-sm inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {getTranslation(language, 'createProject')}
          </button>
        </div>
      </div>

      {/* Metrics Overview Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <div
          onClick={() => navigate('/my-projects')}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center justify-between hover:border-primary transition-colors cursor-pointer group shadow-xs"
        >
          <div>
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              {getTranslation(language, 'activeProjects')}
            </span>
            <div className="font-headline-md text-2xl font-bold text-on-surface mt-1">{activeProjects.length}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-xl">folder</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/bookmarks')}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center justify-between hover:border-primary transition-colors cursor-pointer group shadow-xs"
        >
          <div>
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              {getTranslation(language, 'savedProjects')}
            </span>
            <div className="font-headline-md text-2xl font-bold text-on-surface mt-1">{savedProjects.length}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-xl">bookmark</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/bookmarks')}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center justify-between hover:border-primary transition-colors cursor-pointer group shadow-xs"
        >
          <div>
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              {getTranslation(language, 'savedBuilders')}
            </span>
            <div className="font-headline-md text-2xl font-bold text-on-surface mt-1">{savedBuilders.length}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-xl">group</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/notifications')}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center justify-between hover:border-primary transition-colors cursor-pointer group shadow-xs"
        >
          <div>
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              {getTranslation(language, 'notifications')}
            </span>
            <div className="font-headline-md text-2xl font-bold text-on-surface mt-1">
              {unreadNotifsCount > 0 ? (
                <span className="text-primary">{unreadNotifsCount} unread</span>
              ) : (
                '0'
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
        {/* Left Column (Col Span 8) */}
        <div className="md:col-span-8 space-y-lg">
          {/* My Active Projects */}
          <section className="space-y-md">
            <div className="flex items-center justify-between">
              <h3 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">play_circle</span>
                {getTranslation(language, 'myCreatedProjects')}
              </h3>
              <Link className="font-label-md text-label-md text-primary hover:underline font-semibold" to="/my-projects">
                {getTranslation(language, 'viewAll')} ({activeProjects.length})
              </Link>
            </div>
            
            {activeProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                {activeProjects.map((project) => {
                  const techList = Array.isArray(project.tech)
                    ? project.tech
                    : typeof project.tech === 'string'
                    ? project.tech.split(',').map((t) => t.trim())
                    : [];

                  const totalOpenings = project?.roles?.reduce((acc, r) => acc + (parseInt(r.openings, 10) || 1), 0) || 0;
                  const displayCapacity = totalOpenings > 0 
                    ? `${totalOpenings} ${totalOpenings === 1 ? 'Builder' : 'Builders'}`
                    : (project.builders || project.teamSize || '1/5 Builders');

                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate('/view-project', { state: { project, from: 'dashboard' } })}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md hover:border-primary transition-all group cursor-pointer hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-md">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {project.title ? project.title.slice(0, 2).toUpperCase() : 'PR'}
                          </div>
                          <span className="px-2.5 py-1 rounded-full border border-primary/30 text-primary font-label-md text-xs bg-primary/5 flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> {project.status || 'Open'}
                          </span>
                        </div>
                        <h4 className="font-title-md text-title-md font-bold text-on-surface mb-xs group-hover:text-primary transition-colors">
                          {project.title}
                        </h4>
                        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-md text-xs leading-relaxed">
                          {project.desc || project.overview || 'No description provided.'}
                        </p>
                      </div>
                      
                      <div className="space-y-3 pt-md border-t border-outline-variant/50">
                        {techList.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {techList.slice(0, 3).map((t) => (
                              <span key={t} className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded text-[11px] font-mono">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-on-surface-variant font-label-md text-xs">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">groups</span>
                            {displayCapacity}
                          </span>
                          <span className="font-medium text-primary flex items-center gap-0.5">
                            {getTranslation(language, 'viewProjectBtn')} <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">folder_open</span>
                </div>
                <h4 className="font-title-md text-on-surface font-bold">No Active Projects Created Yet</h4>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  Publish your project to start recruiting developers, designers, and smart contract engineers.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/create-project')}
                  className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm mt-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Create Real Project
                </button>
              </div>
            )}
          </section>

          {/* Featured Community Opportunities */}
          <section className="space-y-md">
            <div className="flex items-center justify-between">
              <h3 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-sm">
                <span className="material-symbols-outlined text-tertiary">explore</span>
                {getTranslation(language, 'discoverFeatured')}
              </h3>
              <Link className="font-label-md text-label-md text-primary hover:underline font-semibold" to="/explore-projects">
                {getTranslation(language, 'viewAll')} ({allProjects.length})
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              {allProjects.slice(0, 2).map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate('/view-project', { state: { project: p, from: 'explore' } })}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md hover:border-primary transition-all group cursor-pointer hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-md text-xs font-semibold">
                        {p.category}
                      </span>
                      <span className="text-xs text-on-surface-variant font-mono">{p.level}</span>
                    </div>
                    <h4 className="font-title-md text-title-md font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
                      {p.title}
                    </h4>
                    <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 text-xs mb-3">
                      {p.desc || p.shortDesc}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-primary font-bold pt-2 border-t border-outline-variant/40">
                    <span>{getTranslation(language, 'viewProjectBtn')}</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar Column (Col Span 4) */}
        <div className="md:col-span-4 space-y-lg">
          {/* Saved Bookmarks Spotlight */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs space-y-md">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">bookmark</span>
                {getTranslation(language, 'savedBookmarks')}
              </h3>
              <Link className="text-xs text-primary font-bold hover:underline" to="/bookmarks">
                {getTranslation(language, 'viewAll')}
              </Link>
            </div>

            {savedProjects.length > 0 ? (
              <div className="space-y-3">
                {savedProjects.slice(0, 3).map((sp) => (
                  <div
                    key={sp.id}
                    onClick={() => navigate('/view-project', { state: { project: sp, from: 'bookmarks' } })}
                    className="p-3 rounded-lg border border-outline-variant/60 hover:border-primary transition-colors cursor-pointer bg-surface-container-lowest flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="font-title-md text-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                        {sp.title}
                      </h4>
                      <p className="text-xs text-on-surface-variant">{sp.category || 'Open Source'}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[18px]">bookmark</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-on-surface-variant text-xs italic border border-dashed border-outline-variant rounded-lg">
                {getTranslation(language, 'noSavedProjectsDesc')}
              </div>
            )}
          </section>

          {/* Quick Actions & Find Builders Card */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs space-y-md">
            <h3 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2 border-b border-outline-variant pb-3">
              <span className="material-symbols-outlined text-secondary">group_add</span>
              {getTranslation(language, 'findCollaborators')}
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {getTranslation(language, 'findCollaboratorsSub')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/find-builders')}
              className="w-full py-2.5 rounded-lg border border-outline-variant text-on-surface font-label-md text-xs hover:border-primary hover:text-primary transition-colors cursor-pointer font-semibold flex items-center justify-center gap-2 bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              {getTranslation(language, 'findBuildersDirectory')}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

