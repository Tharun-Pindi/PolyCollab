import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  getBookmarkedProjects,
  isProjectBookmarkedInStorage,
  toggleProjectBookmarkInStorage,
  getUserProfile,
  getUserAvatar,
  getAllRegisteredBuilders,
  getAllPublishedProjects,
  INSTAGRAM_EMPTY_AVATAR
} from '../lib/storage';

export default function ViewProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const userProfile = getUserProfile();

  const passedProject = location.state?.project;
  const fromSource = location.state?.from;
  const isMyCreatedProject =
    passedProject?.id?.startsWith('proj-') ||
    (userProfile.fullName && passedProject?.creatorName?.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase()) ||
    (userProfile.primaryEmail && passedProject?.creatorEmail === userProfile.primaryEmail);
  
  const cleanText = (txt) => {
    if (!txt) return '';
    return String(txt).trim();
  };

  // Get separate texts for overview and short description
  const rawOverview = cleanText(passedProject?.overview) || cleanText(passedProject?.desc);
  const rawShortDescStored = cleanText(passedProject?.shortDesc);

  let rawShortDesc = rawShortDescStored;

  // If the stored short description is identical to the overview (or missing),
  // dynamically generate a real short summary instead of duplicating the long text.
  if (!rawShortDescStored || rawShortDescStored === rawOverview) {
    const sentenceMatch = rawOverview.match(/^.+?[.!?](?=\s|$)/);
    const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : null;
    rawShortDesc = (firstSentence && firstSentence.length <= 160 && firstSentence.length > 10)
      ? firstSentence
      : rawOverview.slice(0, 120).trimEnd() + (rawOverview.length > 120 ? '...' : '');
  }

  const leadName = passedProject?.creatorName || (isMyCreatedProject ? (userProfile.fullName || 'Project Owner') : 'Project Lead');
  let leadAvatar = passedProject?.creatorAvatar;

  const isCurrentUserLead =
    isMyCreatedProject ||
    (userProfile?.fullName && leadName.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase());

  if (isCurrentUserLead) {
    leadAvatar = getUserAvatar(userProfile);
  } else if (!leadAvatar || leadAvatar.startsWith('data:image/svg+xml') || leadAvatar.includes('INSTAGRAM_EMPTY_AVATAR')) {
    const allRegistered = getAllRegisteredBuilders();
    const lEmail = passedProject?.creatorEmail || `${leadName.toLowerCase().replace(/\s+/g, '.')}@polycollab.dev`;
    const matched = allRegistered.find((b) => b.name && b.name.trim().toLowerCase() === leadName.trim().toLowerCase());
    
    if (matched && matched.avatar && !matched.avatar.includes('ui-avatars.com')) {
      leadAvatar = matched.avatar;
    } else {
      leadAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(leadName)}&background=6366f1&color=fff&size=128`;
    }
  }

  if (!passedProject) {
    return (
      <div className="max-w-container-max mx-auto py-16 text-center space-y-4">
        <span className="material-symbols-outlined text-5xl text-outline">folder_off</span>
        <h2 className="text-xl font-bold text-on-surface">No Project Selected</h2>
        <p className="text-sm text-on-surface-variant max-w-md mx-auto">
          Please select a project from Explore Projects or My Projects to view its details.
        </p>
        <button
          type="button"
          onClick={() => navigate('/explore-projects')}
          className="px-5 py-2 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Explore Projects
        </button>
      </div>
    );
  }

  const totalOpenings = passedProject?.roles?.reduce((acc, r) => acc + (parseInt(r.openings, 10) || 1), 0) || 0;

  const projectData = {
    id: passedProject.id,
    initials: passedProject.title ? passedProject.title.slice(0, 2).toUpperCase() : 'PR',
    title: passedProject.title,
    shortDesc: rawShortDesc || 'No short summary provided.',
    overview: rawOverview || 'No detailed overview provided.',
    category: passedProject.category || 'Web Application',
    builders: totalOpenings > 0 
      ? `${totalOpenings} ${totalOpenings === 1 ? 'Builder' : 'Builders'}`
      : ((passedProject.teamSize && passedProject.teamSize.trim()) || (passedProject.builders && passedProject.builders.trim()) || null),
    level: passedProject.level || 'Intermediate',
    stage: passedProject.stage || 'In Development',
    goal: passedProject.goal || '',
    duration: passedProject.duration || '',
    commitment: passedProject.commitment || '',
    communication: passedProject.communication || '',
    visibility: passedProject.visibility || 'Public',
    refLink: passedProject.refLink || '',
    tech: Array.isArray(passedProject.tech) ? passedProject.tech : (passedProject.tech ? (typeof passedProject.tech === 'string' ? passedProject.tech.split(',') : passedProject.tech) : []),
    roles: passedProject.roles && passedProject.roles.length > 0 ? passedProject.roles : null,
    postedTime: passedProject.postedTime || passedProject.createdDate || passedProject.updated || 'Posted recently',
    creatorName: leadName,
    creatorAvatar: leadAvatar,
    creatorEmail: passedProject.creatorEmail
  };

  const handleViewLeadProfile = () => {
    const lName = projectData.creatorName || 'Project Lead';
    const lEmail = projectData.creatorEmail || `${lName.toLowerCase().replace(/\s+/g, '.')}@polycollab.dev`;
    const isCurrentUser = userProfile?.fullName && lName.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase();

    if (isCurrentUser) {
      const userPublishedProjects = getAllPublishedProjects().filter(
        (p) =>
          (p.creatorName && p.creatorName.trim().toLowerCase() === lName.trim().toLowerCase()) ||
          (p.creatorEmail && p.creatorEmail === userProfile.primaryEmail)
      );

      const uniqueUserProjectsMap = new Map();
      userPublishedProjects.forEach((p) => {
        if (p.title && !uniqueUserProjectsMap.has(p.title.trim().toLowerCase())) {
          uniqueUserProjectsMap.set(p.title.trim().toLowerCase(), p);
        }
      });

      const uniqueUserProjects = Array.from(uniqueUserProjectsMap.values()).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status || 'Active',
        techTags: Array.isArray(p.tech) ? p.tech.join(', ') : (typeof p.tech === 'string' ? p.tech : ''),
        link: p.refLink || p.link || ''
      }));

      navigate('/builder-profile', {
        state: {
          builder: {
            ...userProfile,
            name: userProfile.fullName,
            role: userProfile.title || `${projectData.category} Lead`,
            projects: uniqueUserProjects.length > 0 ? uniqueUserProjects : (userProfile.projects || []),
            roles: userProfile.roles && userProfile.roles.length > 0 ? userProfile.roles : []
          }
        }
      });
      return;
    }

    const allRegistered = getAllRegisteredBuilders();
    const matched = allRegistered.find(
      (b) => b.name && b.name.trim().toLowerCase() === lName.trim().toLowerCase()
    );

    const leadPublishedProjects = getAllPublishedProjects().filter(
      (p) =>
        (p.creatorName && p.creatorName.trim().toLowerCase() === lName.trim().toLowerCase()) ||
        (p.creatorEmail && p.creatorEmail === lEmail)
    );

    const uniqueProjectsMap = new Map();
    leadPublishedProjects.forEach((p) => {
      if (p.title && !uniqueProjectsMap.has(p.title.trim().toLowerCase())) {
        uniqueProjectsMap.set(p.title.trim().toLowerCase(), p);
      }
    });

    const projectListForProfile = uniqueProjectsMap.size > 0
      ? Array.from(uniqueProjectsMap.values()).map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status || 'Active',
          techTags: Array.isArray(p.tech) ? p.tech.join(', ') : (typeof p.tech === 'string' ? p.tech : ''),
          link: p.refLink || p.link || ''
        }))
      : [
          {
            id: projectData.id,
            title: projectData.title,
            status: projectData.status || 'Active',
            techTags: Array.isArray(projectData.tech) ? projectData.tech.join(', ') : (typeof projectData.tech === 'string' ? projectData.tech : ''),
            link: projectData.refLink || ''
          }
        ];

    const leadRoles = matched?.roles && matched.roles.length > 0 ? matched.roles : [];

    const builderObj = {
      id: matched?.id || `creator-${lName.toLowerCase().replace(/\s+/g, '-')}`,
      name: matched?.name || lName,
      role: matched?.role || projectData.creatorRole || `${projectData.category} Lead`,
      bio: matched?.bio || projectData.creatorBio || '',
      avatar: projectData.creatorAvatar || matched?.avatar,
      skills: matched?.skills || (Array.isArray(projectData.tech) ? projectData.tech : []),
      location: matched?.location || projectData.creatorLocation || 'Remote',
      email: lEmail,
      github: matched?.github || projectData.creatorGithub || '',
      website: matched?.website || projectData.creatorWebsite || '',
      projects: projectListForProfile,
      roles: leadRoles
    };

    navigate('/builder-profile', { state: { builder: builderObj } });
  };

  const [isSaved, setIsSaved] = useState(() =>
    isProjectBookmarkedInStorage(projectData)
  );
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsSaved(isProjectBookmarkedInStorage(projectData));
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, [projectData.id, projectData.title]);

  const handleToggleSave = () => {
    const nowBookmarked = toggleProjectBookmarkInStorage(projectData);
    setIsSaved(nowBookmarked);
    if (nowBookmarked) {
      setToastMessage({
        text: 'Project saved to Bookmarks!',
        actionText: 'View Saved',
        onAction: () => navigate('/bookmarks')
      });
    } else {
      setToastMessage({
        text: 'Project removed from Bookmarks.',
        actionText: null
      });
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

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

      {/* Breadcrumb & Header Area */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
        <nav className="flex items-center text-on-surface-variant text-body-md font-body-md mb-6">
          <Link
            className="hover:text-primary transition-colors font-medium"
            to={fromSource === 'explore' ? '/explore-projects' : (fromSource === 'my-projects' ? '/my-projects' : (isMyCreatedProject ? '/my-projects' : '/explore-projects'))}
          >
            {fromSource === 'explore' ? 'Explore' : (fromSource === 'my-projects' ? 'My Projects' : (isMyCreatedProject ? 'My Projects' : 'Explore'))}
          </Link>
          <span className="material-symbols-outlined text-[16px] mx-2 text-outline">chevron_right</span>
          <span className="hover:text-primary transition-colors">{projectData.category}</span>
          <span className="material-symbols-outlined text-[16px] mx-2 text-outline">chevron_right</span>
          <span className="text-on-surface font-semibold truncate max-w-[200px] md:max-w-xs">{projectData.title}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 border border-primary text-primary rounded text-[11px] font-label-md uppercase tracking-wider bg-primary/5 font-semibold">
                {projectData.category}
              </span>
              <span className="text-on-surface-variant text-[12px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {projectData.postedTime}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
              {projectData.title}
            </h1>
            {projectData.shortDesc && (
              <p className="text-on-surface-variant text-body-lg font-body-lg mt-2 max-w-3xl leading-relaxed">
                {projectData.shortDesc}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleToggleSave}
              className="px-6 py-2.5 bg-surface text-on-surface border border-outline rounded-lg font-label-md text-label-md hover:bg-surface-variant transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span
                className="material-symbols-outlined text-[18px] text-primary"
                style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
              >
                {isSaved ? 'bookmark' : 'bookmark_border'}
              </span>
              {isSaved ? 'Saved' : 'Save Project'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/apply-to-project', { state: { project: projectData } })}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm cursor-pointer font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">group_add</span>
              Apply to Join
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Overview Card */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm space-y-4">
            <h3 className="font-title-md text-title-md text-on-surface mb-2 flex items-center gap-2 border-b border-outline-variant pb-3 font-bold">
              <span className="material-symbols-outlined text-primary">description</span>
              Project Overview
            </h3>
            <div className="text-on-surface-variant space-y-4 font-body-md text-body-md leading-relaxed">
              <p className="whitespace-pre-line">{projectData.overview}</p>
            </div>

            {/* Goal Banner */}
            {projectData.goal && (
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">flag</span>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Project Goal</h4>
                  <p className="text-sm text-on-surface mt-0.5">{projectData.goal}</p>
                </div>
              </div>
            )}

            {/* Tech Stack Pills */}
            {projectData.tech && projectData.tech.length > 0 && (
              <div className="pt-4 border-t border-outline-variant/60">
                <h4 className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider mb-2 font-semibold">Technologies Used</h4>
                <div className="flex flex-wrap gap-2">
                  {projectData.tech.map((t) => (
                    <span key={t} className="px-3 py-1 bg-surface-container border border-outline-variant/50 rounded-full text-xs font-mono text-on-surface font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Open Roles Card */}
          {projectData.roles && projectData.roles.length > 0 && (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-3">
                <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-primary">engineering</span>
                  Open Roles
                </h3>
                <span className="bg-primary/10 text-primary border border-primary/20 text-xs px-2.5 py-1 rounded-full font-mono font-bold">
                  {projectData.roles.reduce((acc, r) => acc + (r.openings || 1), 0)} Total Openings
                </span>
              </div>
              <div className="space-y-4">
                {projectData.roles.map((r, idx) => {
                  const roleOpenings = r.openings || 1;
                  return (
                    <div
                      key={idx}
                      className="border border-outline-variant rounded-lg p-5 bg-surface-container-lowest shadow-xs"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-title-md text-[16px] text-on-surface font-semibold">
                              {r.title}
                            </h4>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-mono font-bold">
                              {roleOpenings} {roleOpenings === 1 ? 'Opening' : 'Openings'}
                            </span>
                          </div>
                          {r.skills && (
                            <div className="flex items-center gap-2 text-on-surface-variant text-[13px] mt-1">
                              <span className="flex items-center gap-1 font-mono">
                                <span className="material-symbols-outlined text-[14px]">code</span> Required Skills: {r.skills}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {r.description && (
                        <p className="text-on-surface-variant text-[13px] mt-3 leading-relaxed">
                          {r.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Creator Info */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex items-center gap-4 shadow-sm">
            <img
              className="w-12 h-12 rounded-full object-cover border border-outline-variant bg-surface-container"
              src={projectData.creatorAvatar}
              alt={projectData.creatorName || 'Project Lead'}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(projectData.creatorName || 'Project Lead')}&background=6366f1&color=fff&size=128`;
              }}
            />
            <div>
              <div className="text-[12px] text-on-surface-variant uppercase tracking-wider font-label-md mb-1 font-semibold">
                Project Lead
              </div>
              <h4 className="font-title-md text-[16px] text-on-surface font-semibold">{projectData.creatorName || 'Project Lead'}</h4>
              <button
                type="button"
                onClick={handleViewLeadProfile}
                className="text-primary text-[13px] hover:underline flex items-center gap-1 mt-1 font-medium cursor-pointer"
              >
                View Profile <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
              </button>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-title-md text-[16px] text-on-surface mb-4 border-b border-outline-variant pb-3 font-bold">
              Project Details
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">public</span>
                  <span className="text-[14px]">Category</span>
                </div>
                <span className="text-on-surface text-[14px] font-medium text-right">{projectData.category}</span>
              </li>
              {projectData.stage && (
                <li className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    <span className="text-[14px]">Stage</span>
                  </div>
                  <span className="text-on-surface text-[14px] font-medium text-right">{projectData.stage}</span>
                </li>
              )}
              <li className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">military_tech</span>
                  <span className="text-[14px]">Experience</span>
                </div>
                <span className="text-on-surface text-[14px] font-medium text-right">{projectData.level}</span>
              </li>
              {projectData.builders && (
                <li className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">groups</span>
                    <span className="text-[14px]">Team Capacity</span>
                  </div>
                  <span className="text-on-surface text-[14px] font-medium text-right">{projectData.builders}</span>
                </li>
              )}
              {projectData.duration && (
                <li className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">event</span>
                    <span className="text-[14px]">Duration</span>
                  </div>
                  <span className="text-on-surface text-[14px] font-medium text-right">{projectData.duration}</span>
                </li>
              )}
              {projectData.commitment && (
                <li className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                    <span className="text-[14px]">Commitment</span>
                  </div>
                  <span className="text-on-surface text-[14px] font-medium text-right">{projectData.commitment}</span>
                </li>
              )}
              {projectData.communication && (
                <li className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">forum</span>
                    <span className="text-[14px]">Communication</span>
                  </div>
                  <span className="text-on-surface text-[14px] font-medium text-right">{projectData.communication}</span>
                </li>
              )}
              {projectData.refLink && (
                <li className="flex items-start justify-between gap-4 border-t border-outline-variant/40 pt-3">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">link</span>
                    <span className="text-[14px]">Communication Link</span>
                  </div>
                  <a
                    href={projectData.refLink.startsWith('http') ? projectData.refLink : (projectData.refLink.includes('@') ? `mailto:${projectData.refLink}` : `https://${projectData.refLink}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-[14px] font-medium text-right hover:underline truncate max-w-[140px]"
                  >
                    {projectData.refLink}
                  </a>
                </li>
              )}
            </ul>

            {/* Red Note: In-app chat unavailable */}
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2 mt-4">
              <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">error</span>
              <span>Notice: In-app chat option is currently unavailable. Please reach out to the project team using the Communication Link or Method above.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
