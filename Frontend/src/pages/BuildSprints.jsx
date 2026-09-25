import React, { useState } from 'react';

// Data for Completed Build Sprints (Exact content from upload)
const completedSprints = [
  {
    id: 'q3-rewrite',
    title: 'Q3 Frontend Rewrite',
    project: 'AlphaCore UI',
    dates: 'Jul 1 - Aug 15, 2023',
    status: 'Completed'
  },
  {
    id: 'api-v2-integration',
    title: 'API V2 Integration',
    project: 'DataSync Engine',
    dates: 'May 10 - Jun 20, 2023',
    status: 'Completed'
  },
  {
    id: 'auth-overhaul',
    title: 'Auth Module Overhaul',
    project: 'SecureGate',
    dates: 'Feb 1 - Mar 15, 2023',
    status: 'Completed'
  }
];

// Data for Joined Build Sprints
const joinedSprints = [
  {
    id: 'frontend-arch',
    title: 'Frontend Architecture Refactor',
    project: 'Project Nova',
    dates: 'Oct 12 - Oct 26',
    progress: 45,
    status: 'In Progress',
    avatars: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      'https://ui-avatars.com/api/?name=Sprint+Member+2&background=e2e8f0&color=64748b&size=120',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'
    ],
    extraCount: '+2'
  },
  {
    id: 'api-gateway',
    title: 'API Gateway Integration',
    project: 'DataHub Core',
    dates: 'Oct 15 - Nov 05',
    progress: 15,
    status: 'In Progress',
    avatars: [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'
    ],
    extraCount: null
  }
];

// Data for Upcoming Build Sprints (Bento Grid)
const upcomingSprints = [
  {
    id: 'core-arch',
    title: 'Core Architecture Refactor',
    project: 'Nebula DB',
    desc: 'A high-priority sprint to migrate the core storage engine from a monolithic structure to a modular, distributed architecture. Requires advanced Rust knowledge.',
    status: 'Open',
    date: 'Oct 15 - Oct 22',
    joined: '+4 joined',
    isFeatured: true,
    isLowBg: false,
    isFull: false,
    avatars: [
      'https://ui-avatars.com/api/?name=Sprint+Member+2&background=e2e8f0&color=64748b&size=120',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'
    ]
  },
  {
    id: 'ui-comp',
    title: 'UI Component Library V2',
    project: 'React Spectrum',
    status: 'Open',
    date: 'Oct 18 - 25',
    isFeatured: false,
    isLowBg: false,
    isFull: false,
    avatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80'
    ]
  },
  {
    id: 'api-gw',
    title: 'API Gateway Integration',
    project: 'MeshNet',
    status: 'Open',
    date: 'Oct 20 - 30',
    isFeatured: false,
    isLowBg: false,
    isFull: false,
    avatars: [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80'
    ]
  },
  {
    id: 'doc-overhaul',
    title: 'Documentation Overhaul',
    project: 'PolyCollab Core',
    status: 'In Progress',
    date: 'Oct 10 - 17',
    isFeatured: false,
    isLowBg: true,
    isFull: true,
    avatars: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80'
    ]
  }
];

// Data for Available Build Sprints
const availableSprints = [
  {
    id: 'auth-rewrite',
    timeBadge: 'In 2 Days',
    title: 'Authentication Module Rewrite',
    project: 'Nexus Auth Gateway',
    dateRange: 'Oct 12 - Oct 14',
    slotsLeft: '2 slots left'
  },
  {
    id: 'collab-canvas',
    timeBadge: 'Next Week',
    title: 'Real-time Collaboration Canvas',
    project: 'Whiteboard Pro',
    dateRange: 'Oct 18 - Oct 20',
    slotsLeft: '4 slots left'
  },
  {
    id: 'graphql-migration',
    timeBadge: 'In 2 Weeks',
    title: 'GraphQL API Migration',
    project: 'DataSphere V2',
    dateRange: 'Oct 25 - Oct 28',
    slotsLeft: '1 slot left'
  }
];

export default function BuildSprints() {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookmarks, setBookmarks] = useState({});

  const toggleBookmark = (id) => {
    setBookmarks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'Completed':
        return 'Review your completed time-boxed development cycles.';
      case 'Joined':
        return 'Manage and track your active collaborative coding sessions.';
      case 'Available':
        return 'Discover and join intensive collaborative coding sessions to rapidly build out core features or MVPs with other talented developers.';
      default:
        return 'Collaborative coding challenges. Join a sprint, contribute to open source, and level up your skills alongside other builders.';
    }
  };

  return (
    <div className="max-w-container-max mx-auto w-full">
      {/* Page Header */}
      <div className="mb-lg flex flex-col gap-sm">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">
          Build Sprints
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          {getSubtitle()}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-outline-variant mb-lg gap-lg font-body-md text-body-md overflow-x-auto">
        {['Upcoming', 'Available', 'Joined', 'Completed'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-sm transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'text-primary font-bold border-b-2 border-primary pb-1'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* COMPLETED TAB UI (Exact content from upload) */}
      {activeTab === 'Completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {completedSprints.map((sprint) => (
            <div
              key={sprint.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col gap-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-title-md text-title-md text-on-surface">
                    {sprint.title}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
                    Project: {sprint.project}
                  </p>
                </div>
                <span className="font-label-md text-label-md px-2 py-1 rounded border border-outline text-outline">
                  {sprint.status}
                </span>
              </div>

              <div className="font-body-md text-body-md text-on-surface-variant flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                {sprint.dates}
              </div>

              <div className="mt-auto pt-sm border-t border-outline-variant/50 flex justify-end">
                <button className="bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-primary hover:text-primary px-3 py-1.5 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-xs cursor-pointer">
                  View Summary
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* JOINED TAB UI */}
      {activeTab === 'Joined' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {joinedSprints.map((sprint) => (
            <article
              key={sprint.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col justify-between hover:border-primary transition-colors h-full min-h-[260px]"
            >
              <div>
                <div className="mb-md">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-indigo-400 text-primary font-label-md text-[12px] bg-primary/5 font-medium leading-none">
                    {sprint.status}
                  </span>
                </div>
                <h3 className="font-title-md text-title-md font-bold text-on-surface mb-xs">
                  {sprint.title}
                </h3>
                <div className="flex items-center gap-xs text-on-surface-variant text-body-md mb-md">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">folder</span>
                  <span>{sprint.project}</span>
                </div>
                <div className="flex items-center gap-xs text-on-surface-variant font-label-md text-label-md mb-xs">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  <span>{sprint.dates}</span>
                </div>
                <div className="mt-xs mb-md">
                  <div className="w-full bg-secondary-container/60 rounded-full h-1.5 overflow-hidden mb-1">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${sprint.progress}%` }}
                    />
                  </div>
                  <div className="text-right text-on-surface-variant font-label-md text-xs">
                    {sprint.progress}% Complete
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-md border-t border-outline-variant/50 mt-auto">
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-2">
                    {sprint.avatars.map((img, idx) => (
                      <img
                        key={idx}
                        alt="Member avatar"
                        className="w-7 h-7 rounded-full border-2 border-surface object-cover"
                        src={img}
                      />
                    ))}
                  </div>
                  {sprint.extraCount && (
                    <span className="text-xs text-on-surface-variant font-label-md font-medium ml-1">
                      {sprint.extraCount}
                    </span>
                  )}
                </div>
                <button className="text-primary font-title-md text-sm font-semibold flex items-center gap-xs hover:underline cursor-pointer">
                  View Details <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* UPCOMING TAB UI */}
      {activeTab === 'Upcoming' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
          {upcomingSprints.map((sprint) => {
            if (sprint.isFeatured) {
              return (
                <article
                  key={sprint.id}
                  className="col-span-1 md:col-span-2 xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-lg hover:border-primary/50 transition-colors group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-label-md font-bold border border-primary text-primary bg-primary/5">
                        {sprint.status}
                      </span>
                      <div className="flex text-on-surface-variant text-sm gap-4">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">calendar_today</span> {sprint.date}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-headline-md text-headline-md font-bold mb-2 group-hover:text-primary transition-colors text-on-surface">
                      {sprint.title}
                    </h3>
                    <p className="text-on-surface-variant text-body-md mb-4">
                      Project: <span className="font-bold text-on-surface">{sprint.project}</span>
                    </p>
                    <p className="text-body-md text-on-surface-variant mb-6 line-clamp-2">{sprint.desc}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/50">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {sprint.avatars.map((img, idx) => (
                          <img
                            key={idx}
                            alt="Participant"
                            className="w-8 h-8 rounded-full border-2 border-surface object-cover"
                            src={img}
                          />
                        ))}
                      </div>
                      {sprint.joined && <span className="text-sm text-on-surface-variant">{sprint.joined}</span>}
                    </div>
                    <button className="px-6 py-2 bg-primary text-on-primary rounded-md font-label-md font-bold hover:bg-surface-tint transition-colors cursor-pointer active:scale-95">
                      Join Sprint
                    </button>
                  </div>
                </article>
              );
            }

            if (sprint.isLowBg) {
              return (
                <article
                  key={sprint.id}
                  className="bg-surface-container-low border border-outline-variant rounded-xl p-md hover:border-primary/50 transition-colors group flex flex-col justify-between opacity-90"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-label-md font-bold border border-tertiary text-tertiary bg-tertiary/5">
                        {sprint.status}
                      </span>
                      <span className="text-on-surface-variant text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span> {sprint.date}
                      </span>
                    </div>
                    <h3 className="font-title-md text-title-md font-bold text-on-surface mb-1">{sprint.title}</h3>
                    <p className="text-on-surface-variant text-sm mb-4">
                      Project: <span className="font-bold text-on-surface">{sprint.project}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/50">
                    <div className="flex -space-x-2">
                      {sprint.avatars.map((img, idx) => (
                        <img
                          key={idx}
                          alt="Participant"
                          className="w-6 h-6 rounded-full border-2 border-surface object-cover"
                          src={img}
                        />
                      ))}
                    </div>
                    {sprint.isFull && <span className="text-xs text-on-surface-variant font-label-md font-medium">Full</span>}
                  </div>
                </article>
              );
            }

            return (
              <article
                key={sprint.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md hover:border-primary/50 transition-colors group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-label-md font-bold border border-primary text-primary bg-primary/5">
                      {sprint.status}
                    </span>
                    <span className="text-on-surface-variant text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span> {sprint.date}
                    </span>
                  </div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
                    {sprint.title}
                  </h3>
                  <p className="text-on-surface-variant text-sm mb-4">
                    Project: <span className="font-bold text-on-surface">{sprint.project}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/50">
                  <div className="flex -space-x-2">
                    {sprint.avatars.map((img, idx) => (
                      <img
                        key={idx}
                        alt="Participant"
                        className="w-6 h-6 rounded-full border-2 border-surface object-cover"
                        src={img}
                      />
                    ))}
                  </div>
                  <button className="px-4 py-1.5 border border-outline-variant text-on-surface rounded-md font-label-md text-xs hover:bg-secondary-container/20 transition-colors cursor-pointer">
                    View Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* AVAILABLE TAB UI */}
      {activeTab === 'Available' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {availableSprints.map((sprint) => {
            const isBookmarked = !!bookmarks[sprint.id];
            return (
              <article
                key={sprint.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col hover:border-primary transition-colors h-full"
              >
                <div className="flex justify-between items-start mb-md">
                  <div className="inline-flex items-center gap-xs px-2 py-1 rounded-full border border-indigo-400 text-primary font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    {sprint.timeBadge}
                  </div>
                  <button
                    onClick={() => toggleBookmark(sprint.id)}
                    className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    title="Bookmark sprint"
                  >
                    <span className="material-symbols-outlined">
                      {isBookmarked ? 'bookmark' : 'bookmark_border'}
                    </span>
                  </button>
                </div>

                <h3 className="font-title-md text-title-md font-bold text-on-surface mb-xs">
                  {sprint.title}
                </h3>
                <p className="font-body-sm text-body-md text-on-surface-variant mb-md flex-1">
                  Project: <span className="font-medium text-on-surface">{sprint.project}</span>
                </p>

                <div className="flex items-center justify-between text-on-surface-variant font-label-md text-label-md mb-lg">
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {sprint.dateRange}
                  </div>
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    {sprint.slotsLeft}
                  </div>
                </div>

                <button className="w-full bg-primary text-on-primary font-label-md text-label-md py-2 rounded-lg hover:bg-surface-tint transition-colors active:scale-95 cursor-pointer">
                  Join Sprint
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
