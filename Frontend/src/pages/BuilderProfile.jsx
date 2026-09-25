import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { loadSettings, getBookmarkedBuilders, isBuilderBookmarkedInStorage, toggleBuilderBookmarkInStorage, getUserAvatar, getBuilderAvatar, getBuilderDefaultRoles, getAllPublishedProjects, INSTAGRAM_EMPTY_AVATAR, getBuilderSkills, getStoredData } from '../lib/storage';

export default function BuilderProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const passedBuilder = location.state?.builder;
  const [settings, setSettings] = useState(() => loadSettings());
  const [fullBuilderData, setFullBuilderData] = useState(null);
  const [isLoading, setIsLoading] = useState(!!passedBuilder);

  const userProfile = settings.profile;
  const privacy = settings.privacy;
  
  // Real-time fetch for missing builder details (like tech stacks and projects)
  useEffect(() => {
    import('../lib/storage').then(({ fetchRegisteredBuildersFromSupabase }) => {
      fetchRegisteredBuildersFromSupabase().then(builders => {
        const searchEmail = (passedBuilder?.email || passedBuilder?.creatorEmail || passedBuilder?.primaryEmail || '').trim().toLowerCase();
        const searchName = (passedBuilder?.name || passedBuilder?.fullName || passedBuilder?.creatorName || '').trim().toLowerCase();
        const targetId = passedBuilder?.id || passedBuilder?.ownerId;
        const found = builders.find(b => 
          b.id === targetId || 
          (searchEmail && b.email === searchEmail) || 
          (searchName && b.name.toLowerCase() === searchName)
        );
        if (found) {
          setFullBuilderData(found);
        }
        setIsLoading(false);
      });
    });
  }, [passedBuilder]);
  const allPublished = getAllPublishedProjects();
  const allCreatedProjects = getStoredData('created_projects', []);

  const searchName = (passedBuilder?.name || passedBuilder?.creatorName || passedBuilder?.fullName || userProfile?.fullName || '').trim().toLowerCase();
  const searchEmail = (passedBuilder?.email || passedBuilder?.primaryEmail || passedBuilder?.creatorEmail || userProfile?.primaryEmail || '').trim().toLowerCase();

  const targetUserId = passedBuilder?.id || userProfile?.id;

  // 1. Published Projects for this builder
  const publishedForBuilder = allPublished.filter((p) => {
    if (!p) return false;
    if (p.ownerId && targetUserId && p.ownerId !== targetUserId) return false;
    const pName = (p.creatorName || p.author || p.name || '').trim().toLowerCase();
    const pEmail = (p.creatorEmail || p.email || '').trim().toLowerCase();
    return (searchName && pName === searchName) || (searchEmail && pEmail === searchEmail);
  });

  // 2. Created Projects for this builder
  const createdForBuilder = allCreatedProjects.filter((p) => {
    if (!p) return false;
    if (p.ownerId && targetUserId && p.ownerId !== targetUserId) return false;
    const pName = (p.creatorName || p.author || p.name || '').trim().toLowerCase();
    const pEmail = (p.creatorEmail || p.email || '').trim().toLowerCase();
    return (searchName && pName === searchName) || (searchEmail && pEmail === searchEmail);
  });

  // 3. Create Profile Phase Projects specified directly in profile.projects
  const profileStepProjects = passedBuilder
    ? (Array.isArray(passedBuilder.projects) ? passedBuilder.projects : [])
    : (Array.isArray(userProfile?.projects) ? userProfile.projects : []);

  // REAL PROJECTS ONLY: Combine Create Profile phase projects + Created Projects + Published Projects (NO FAKE DATA)
  const combinedRealProjects = [
    ...profileStepProjects,
    ...createdForBuilder,
    ...publishedForBuilder
  ];

  const mergedProjectsMap = new Map();
  combinedRealProjects.forEach((p) => {
    if (!p) return;
    const title = p.title || p.name;
    if (title && title.trim()) {
      const key = title.trim().toLowerCase();
      if (!mergedProjectsMap.has(key)) {
        mergedProjectsMap.set(key, {
          id: p.id || `proj-${Date.now()}-${Math.random()}`,
          title: title,
          status: p.status || p.stage || 'Active',
          techTags: p.techTags || (Array.isArray(p.tech) ? p.tech.join(', ') : (typeof p.tech === 'string' ? p.tech : (Array.isArray(p.skills) ? p.skills.join(', ') : ''))),
          link: p.link || p.refLink || p.projectLink || p.github || p.website || ''
        });
      } else {
        const existing = mergedProjectsMap.get(key);
        if (!existing.link) existing.link = p.link || p.refLink || p.projectLink || p.github || p.website || '';
        if (!existing.techTags && (p.techTags || p.tech || p.skills)) {
          existing.techTags = p.techTags || (Array.isArray(p.tech) ? p.tech.join(', ') : (typeof p.tech === 'string' ? p.tech : (Array.isArray(p.skills) ? p.skills.join(', ') : '')));
        }
      }
    }
  });

  const dynamicProjectsList = Array.from(mergedProjectsMap.values());

  // Tech Stack extraction for passedBuilder & current user profile
  const rawSkillsList = passedBuilder
    ? getBuilderSkills(passedBuilder)
    : (userProfile ? getBuilderSkills(userProfile) : []);

  const userTechLangs = passedBuilder?.techStack?.languages || userProfile?.techStack?.languages || [];
  const userTechFront = passedBuilder?.techStack?.frontend || userProfile?.techStack?.frontend || [];
  const userTechBack = passedBuilder?.techStack?.backend || userProfile?.techStack?.backend || [];

  const frontendList = Array.from(new Set(userTechFront.length > 0
    ? userTechFront
    : rawSkillsList.filter((s) => ['react', 'vue', 'next', 'tailwind', 'css', 'html', 'sass', 'ui', 'frontend', 'js', 'javascript', 'typescript'].some((kw) => s.toLowerCase().includes(kw)))));

  const backendList = Array.from(new Set(userTechBack.length > 0
    ? userTechBack
    : rawSkillsList.filter((s) => ['node', 'express', 'postgres', 'mysql', 'mongo', 'docker', 'python', 'go', 'rust', 'backend', 'api', 'sql', 'kubernetes', 'aws', 'cloud', 'c++', 'c#', 'java'].some((kw) => s.toLowerCase().includes(kw)))));

  const languagesList = Array.from(new Set(userTechLangs.length > 0
    ? userTechLangs
    : rawSkillsList.filter((s) => !frontendList.includes(s) && !backendList.includes(s))));

  let dynamicRoles = passedBuilder
    ? (passedBuilder.roles && passedBuilder.roles.length > 0 ? passedBuilder.roles : getBuilderDefaultRoles(passedBuilder))
    : (userProfile?.roles && userProfile.roles.length > 0 ? userProfile.roles : getBuilderDefaultRoles(userProfile));

  const seenRoles = new Set();
  dynamicRoles = dynamicRoles.filter(r => {
    const key = `${r.title || ''}-${r.company || ''}`.toLowerCase();
    if (seenRoles.has(key)) return false;
    seenRoles.add(key);
    return true;
  });

  const profile = passedBuilder
    ? {
        fullName: fullBuilderData?.name || passedBuilder.name || passedBuilder.fullName || passedBuilder.creatorName || 'Project Lead',
        title: fullBuilderData?.role || passedBuilder.role || passedBuilder.title || 'Software Engineer',
        location: fullBuilderData?.location || passedBuilder.location || (searchName === (userProfile?.fullName || '').trim().toLowerCase() ? userProfile?.location : '') || 'Remote',
        bio: fullBuilderData?.bio || passedBuilder.bio || (searchName === (userProfile?.fullName || '').trim().toLowerCase() ? userProfile?.bio : '') || '',
        github: fullBuilderData?.github || passedBuilder.github || (searchName === (userProfile?.fullName || '').trim().toLowerCase() ? userProfile?.github : ''),
        website: fullBuilderData?.website || passedBuilder.website || (searchName === (userProfile?.fullName || '').trim().toLowerCase() ? userProfile?.website : ''),
        avatar: fullBuilderData?.avatar || getBuilderAvatar(passedBuilder),
        primaryEmail: fullBuilderData?.email || passedBuilder.email || passedBuilder.creatorEmail || (searchName === (userProfile?.fullName || '').trim().toLowerCase() ? userProfile?.primaryEmail : ''),
        techStack: fullBuilderData?.techStack || {
          languages: languagesList,
          frontend: frontendList,
          backend: backendList,
          allSkills: rawSkillsList
        },
        roles: fullBuilderData?.roles?.length > 0 ? fullBuilderData.roles : dynamicRoles,
        projects: [
          ...(fullBuilderData?.projects || []),
          ...dynamicProjectsList
        ].filter((p, index, self) => index === self.findIndex((t) => t.id === p.id || (t.title && p.title && t.title.toLowerCase() === p.title.toLowerCase()))),
        preferences: fullBuilderData?.preferences || passedBuilder.preferences || (searchName === (userProfile?.fullName || '').trim().toLowerCase() ? userProfile?.preferences : null) || {
          projectStyle: 'Early Stage',
          roleInteraction: passedBuilder.role || 'Tech Lead',
          communication: 'Async First'
        }
      }
    : {
        ...userProfile,
        avatar: getUserAvatar(userProfile),
        projects: dynamicProjectsList,
        roles: dynamicRoles,
        techStack: {
          languages: languagesList.length > 0 ? languagesList : (userProfile?.techStack?.languages || []),
          frontend: frontendList.length > 0 ? frontendList : (userProfile?.techStack?.frontend || []),
          backend: backendList.length > 0 ? backendList : (userProfile?.techStack?.backend || []),
          allSkills: rawSkillsList
        }
      };

  const builderObj = {
    id: passedBuilder?.id || `builder-${profile.fullName.toLowerCase().replace(/\s+/g, '-')}`,
    name: profile.fullName || 'User Profile',
    role: profile.title || 'Developer',
    avatar: profile.avatar || INSTAGRAM_EMPTY_AVATAR,
    location: profile.location
  };

  const [isBookmarked, setIsBookmarked] = useState(() =>
    isBuilderBookmarkedInStorage(passedBuilder || builderObj)
  );
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const handleStorageChange = () => {
      setSettings(loadSettings());
      setIsBookmarked(isBuilderBookmarkedInStorage(passedBuilder || builderObj));
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, [profile.fullName, passedBuilder?.id]);

  const handleToggleBookmark = () => {
    const builderObj = {
      id: passedBuilder?.id || `builder-${profile.fullName.toLowerCase().replace(/\s+/g, '-')}`,
      name: profile.fullName || 'User Profile',
      role: profile.title || 'Developer',
      avatar: profile.avatar || INSTAGRAM_EMPTY_AVATAR,
      location: profile.location
    };
    const nowBookmarked = toggleBuilderBookmarkInStorage(builderObj);
    setIsBookmarked(nowBookmarked);
    if (nowBookmarked) {
      setToastMessage({
        text: `Saved "${profile.fullName}" to Bookmarks!`,
        actionText: 'View Saved',
        onAction: () => navigate('/bookmarks')
      });
    } else {
      setToastMessage({
        text: `Removed "${profile.fullName}" from Bookmarks.`,
        actionText: null
      });
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const languages = profile.techStack?.languages || [];
  const frontend = profile.techStack?.frontend || [];
  const backend = profile.techStack?.backend || [];

  if (isLoading) {
    return null;
  }

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

      {/* Top Back Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/find-builders"
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-body-md"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Directory
        </Link>
        <button
          onClick={() => navigate('/settings')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors text-sm font-label-md cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">edit</span>
          Edit Profile
        </button>
      </div>

      {/* Header Profile Card */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-lg items-start">
          {/* Profile Picture Container with Online Dot */}
          <div className="relative shrink-0">
            <img
              alt={profile.fullName || 'User Avatar'}
              className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-surface shadow-sm"
              src={getUserAvatar(profile)}
            />
          </div>

          {/* Profile Details */}
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-md mb-2">
              <div>
                <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">
                  {profile.fullName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-on-surface-variant font-body-md">
                  {profile.title && <span>{profile.title}</span>}
                  {privacy?.locationVisibility && profile.location && (
                    <>
                      {profile.title && <span className="text-outline">•</span>}
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {profile.location}
                      </div>
                    </>
                  )}
                  {privacy?.emailVisibility && profile.primaryEmail && (
                    <>
                      {(profile.title || profile.location) && <span className="text-outline">•</span>}
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">mail</span>
                        {profile.primaryEmail}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {profile.github && (
                  <a
                    href={profile.github.startsWith('http') ? profile.github : `https://${profile.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-container cursor-pointer flex items-center gap-1 text-sm font-label-md"
                  >
                    <span className="material-symbols-outlined text-[20px]">code</span>
                    GitHub
                  </a>
                )}
                {profile.website && (
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-container cursor-pointer flex items-center gap-1 text-sm font-label-md"
                  >
                    <span className="material-symbols-outlined text-[20px]">language</span>
                    Website
                  </a>
                )}
                <button
                  type="button"
                  aria-label="Bookmark"
                  onClick={handleToggleBookmark}
                  className="text-primary hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-container cursor-pointer"
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    bookmark
                  </span>
                </button>
              </div>
            </div>

            {profile.bio && (
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-4xl mt-3">
                {profile.bio}
              </p>
            )}

            {/* User Preferences Pills */}
            {profile.preferences && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-outline-variant/40">
                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-label-md flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
                  {profile.preferences.projectStyle}
                </span>
                <span className="px-3 py-1 bg-secondary-container/60 text-on-surface rounded-full text-xs font-label-md flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">group</span>
                  {profile.preferences.roleInteraction}
                </span>
                <span className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-label-md flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">forum</span>
                  {profile.preferences.communication}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-lg">
          {/* Tech Stack Section */}
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
            <h3 className="font-title-md text-title-md text-on-surface mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
              <span className="material-symbols-outlined text-primary">terminal</span>
              Tech Stack
            </h3>
            <div className="space-y-6">
              {languages.length > 0 && (
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Languages & Specialized Tech</h4>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded-full font-mono text-body-md text-on-surface"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {frontend.length > 0 && (
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Frontend</h4>
                  <div className="flex flex-wrap gap-2">
                    {frontend.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded-full font-mono text-body-md text-on-surface"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {backend.length > 0 && (
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Backend & Infra</h4>
                  <div className="flex flex-wrap gap-2">
                    {backend.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded-full font-mono text-body-md text-on-surface"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {languages.length === 0 && frontend.length === 0 && backend.length === 0 && (
                profile.techStack?.allSkills && profile.techStack.allSkills.length > 0 ? (
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Skills & Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.techStack.allSkills.map((t) => (
                        <span
                          key={t}
                          className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded-full font-mono text-body-md text-on-surface"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-on-surface-variant font-body-md italic border border-dashed border-outline-variant rounded-lg">
                    No tech stack listed yet.
                  </div>
                )
              )}
            </div>
          </section>

          {/* Experience Section */}
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
            <h3 className="font-title-md text-title-md text-on-surface mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
              <span className="material-symbols-outlined text-primary">work</span>
              Experience
            </h3>
            {profile.roles && profile.roles.length > 0 ? (
              <div className="relative border-l-2 border-outline-variant ml-3 space-y-8 pl-6">
                {profile.roles.map((role, idx) => (
                  <div key={role.id || idx} className="relative">
                    <div className="absolute -left-[31px] top-1 w-3 h-3 bg-primary rounded-full border-2 border-surface"></div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-2 gap-2">
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold">
                        {role.title || 'Project Contributor'}{' '}
                        {role.company && <span className="text-on-surface-variant font-normal">at {role.company}</span>}
                      </h4>
                      {role.startDate && (
                        <span className="font-label-md text-label-md text-on-surface-variant bg-surface-container-low py-1 px-2 rounded-md font-mono">
                          {role.startDate} - {role.current ? 'Present' : (role.endDate || 'Present')}
                        </span>
                      )}
                    </div>
                    {role.achievements && (
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                        {role.achievements}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-on-surface-variant font-body-md italic border border-dashed border-outline-variant rounded-lg">
                No formal experience entries listed yet.
              </div>
            )}
          </section>

          {/* Projects Section */}
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
            <h3 className="font-title-md text-title-md text-on-surface mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
              <span className="material-symbols-outlined text-primary">inventory_2</span>
              Projects
            </h3>
            {profile.projects && profile.projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {profile.projects.map((proj, idx) => {
                  const targetProj = allPublished.find((p) => p.id === proj.id || p.title === proj.title);
                  const projectLink = proj.link || proj.refLink || proj.projectLink || targetProj?.refLink || targetProj?.link || targetProj?.projectLink || targetProj?.website || '';

                  return (
                    <div
                      key={proj.id || idx}
                      onClick={(e) => {
                        const nativeProj = targetProj || allCreatedProjects.find(p => p.id === proj.id || p.title === proj.title);
                        if (nativeProj && nativeProj.id) {
                          navigate('/view-project', { state: { project: nativeProj, from: 'explore' } });
                        } else if (projectLink && projectLink.trim().length > 0) {
                          e.stopPropagation();
                          window.open(projectLink.startsWith('http') ? projectLink : `https://${projectLink}`, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="border border-outline-variant rounded-xl p-5 hover:border-primary transition-colors bg-surface-container-lowest flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors font-bold">
                            {proj.title}
                          </h4>
                          <span className="px-2 py-1 rounded-full text-xs font-label-md border border-primary text-primary flex items-center gap-1.5 bg-primary/5">
                            {proj.status || 'Active'}
                          </span>
                        </div>
                        {projectLink && projectLink.trim().length > 0 && (
                          <a
                            href={projectLink.startsWith('http') ? projectLink : `https://${projectLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-body-sm text-body-sm text-primary hover:underline mb-2 inline-flex items-center gap-1 truncate max-w-full"
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            {projectLink}
                          </a>
                        )}
                      </div>
                      {proj.techTags && (
                        <div className="flex flex-wrap gap-2 pt-md border-t border-outline-variant/50 mt-3">
                          {(Array.isArray(proj.techTags) ? proj.techTags : (typeof proj.techTags === 'string' ? proj.techTags.split(',') : [])).map((t, i) => (
                            <span key={i} className="font-label-md text-label-md px-2 py-1 bg-surface-container rounded-md text-on-surface border border-outline-variant/50">
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-on-surface-variant font-body-md italic border border-dashed border-outline-variant rounded-lg">
                No public projects created yet by this builder.
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar Column (4 cols) */}
        <div className="lg:col-span-4 space-y-lg">
          {/* Communication Module */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
            <h4 className="font-title-md text-title-md text-on-surface mb-4 font-semibold">Communication</h4>
            <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant">
              <li className="flex items-center justify-between pb-3 border-b border-outline-variant/50">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">chat</span> Cadence
                </span>
                <span className="font-medium text-on-surface">{profile.preferences?.communication || 'Async First'}</span>
              </li>
              <li className="flex items-center justify-between pb-3 border-b border-outline-variant/50">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">public</span> Visibility
                </span>
                <span className="font-medium text-on-surface">
                  {privacy?.profileVisibility === 'private' ? 'Private Profile' : 'Public Profile'}
                </span>
              </li>
              {privacy?.locationVisibility && profile.location && (
                <li className="flex items-center justify-between pb-3 border-b border-outline-variant/50">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">location_on</span> Location
                  </span>
                  <span className="font-medium text-on-surface">{profile.location}</span>
                </li>
              )}
              {privacy?.emailVisibility && profile.primaryEmail && (
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">mail</span> Email
                  </span>
                  <span className="font-medium text-on-surface">{profile.primaryEmail}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Builder Stats Module */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
            <h4 className="font-title-md text-title-md text-on-surface mb-4 font-semibold">Builder Stats</h4>
            <div className="flex items-center justify-center py-6 mb-6 bg-surface-container-low rounded-xl">
              <div className="text-center">
                <div className="font-display-lg text-display-lg text-primary leading-none mb-2 flex items-center justify-center gap-1 font-bold">
                  5.0 <span className="material-symbols-outlined text-3xl">star</span>
                </div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Verified Builder Score
                </span>
              </div>
            </div>
            <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant">
              <li className="flex items-center justify-between pb-3 border-b border-outline-variant/50">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">calendar_today</span> Joined
                </span>
                <span className="font-medium text-on-surface">Aug 2026</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">folder</span> Status
                </span>
                <span className="font-medium text-primary">Active Contributor</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

