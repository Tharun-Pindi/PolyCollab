import { supabase } from './supabase';

// Central LocalStorage state manager for PolyCollab

export const INSTAGRAM_EMPTY_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238E8E8E"><path fill="%23EFEFEF" d="M0 0h24v24H0z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`;

const DEFAULT_PROFILE = {
  firstName: '',
  lastName: '',
  fullName: '',
  title: '',
  location: '',
  website: '',
  github: '',
  bio: '',
  avatar: INSTAGRAM_EMPTY_AVATAR,
  techStack: {
    languages: [],
    frontend: [],
    backend: []
  },
  roles: [],
  projects: [],
  preferences: {
    projectStyle: 'Early Stage',
    roleInteraction: 'Individual Contributor',
    communication: 'Async First'
  }
};

const DEFAULT_ACCOUNT = {
  username: '',
  primaryEmail: '',
  language: 'English (US)',
  timezone: '12-hour (Normal time)'
};

const DEFAULT_SECURITY = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  twoFactor: false,
  sessions: []
};

const DEFAULT_NOTIFICATIONS = {
  emailNotifications: true,
  pushNotifications: false,
  projectUpdates: true,
  messages: true,
  buildSprints: true
};

const DEFAULT_PRIVACY = {
  profileVisibility: 'public',
  defaultProjectStatus: 'public',
  emailVisibility: false,
  locationVisibility: false
};

const DEFAULT_PREFERENCES = {
  theme: 'light',
  density: 'comfortable',
  defaultLandingPage: 'dashboard'
};

export const DEFAULT_BOOKMARKED_PROJECTS = [];
export const DEFAULT_BOOKMARKED_BUILDERS = [];
export const DEFAULT_REGISTERED_BUILDERS = [];

export const getStoredData = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(`polycollab_${key}`);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);
    if (key === 'profile' && parsed && typeof parsed === 'object') {
      parsed.avatar = getUserAvatar(parsed);
    }
    return parsed;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
};

export const setStoredData = (key, value) => {
  try {
    localStorage.setItem(`polycollab_${key}`, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('polycollab_state_change', { detail: { key, value } }));
  } catch (err) {
    console.error(`Error setting ${key} in localStorage:`, err);
  }
};

export const loadSettings = () => {
  const profile = getUserProfile();
  return {
    profile,
    account: getStoredData('account', DEFAULT_ACCOUNT),
    security: getStoredData('security', DEFAULT_SECURITY),
    notifications: getStoredData('notifications', DEFAULT_NOTIFICATIONS),
    privacy: getStoredData('privacy', DEFAULT_PRIVACY),
    preferences: getStoredData('preferences', DEFAULT_PREFERENCES)
  };
};

export const deleteUserAccount = async () => {
  const profile = getUserProfile();
  const account = getStoredData('account', {});
  const userEmail = account.primaryEmail || profile.primaryEmail;
  const userName = profile.fullName;

  // 1. Delete from Supabase Auth and Database via backend API
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || profile.id;
    if (userId) {
      await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/users/${userId}`
        , { method: 'DELETE' });
    }
  } catch (err) {
    console.warn('Account delete notice:', err.message);
  }

  // 2. Remove from registered builders
  const registered = getStoredData('all_registered_builders', []);
  const cleanRegistered = registered.filter(
    (b) =>
      (!userName || (b.name && b.name.trim().toLowerCase() !== userName.trim().toLowerCase())) &&
      (!userEmail || (b.email && b.email.trim().toLowerCase() !== userEmail.trim().toLowerCase()))
  );
  setStoredData('all_registered_builders', cleanRegistered);

  // 3. Remove created projects
  const created = getStoredData('created_projects', []);
  const cleanCreated = created.filter(
    (p) =>
      (!userEmail || p.creatorEmail !== userEmail) &&
      (!userName || (p.creatorName && p.creatorName.trim().toLowerCase() !== userName.trim().toLowerCase()))
  );
  setStoredData('created_projects', cleanCreated);

  // 4. Remove published projects
  const published = getStoredData('all_published_projects', []);
  const cleanPublished = published.filter(
    (p) =>
      (!userEmail || p.creatorEmail !== userEmail) &&
      (!userName || (p.creatorName && p.creatorName.trim().toLowerCase() !== userName.trim().toLowerCase()))
  );
  setStoredData('all_published_projects', cleanPublished);

  // 5. Remove user support tickets
  if (userEmail) {
    const currentTickets = getStoredData('tickets_list', []);
    const cleanTickets = currentTickets.filter(
      (t) => !t.userEmail || t.userEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()
    );
    setStoredData('tickets_list', cleanTickets);
  }

  // 6. Remove account local storage keys
  localStorage.removeItem('polycollab_profile');
  localStorage.removeItem('polycollab_account');
  localStorage.removeItem('polycollab_security');
  localStorage.removeItem('polycollab_notifications');
  localStorage.removeItem('polycollab_privacy');
  localStorage.removeItem('polycollab_preferences');

  // 7. Sign out so session is destroyed entirely
  await supabase.auth.signOut();

  window.dispatchEvent(new CustomEvent('polycollab_state_change', { detail: { key: 'account_deleted', value: true } }));
};

export const saveSettingsSection = (section, data) => {
  setStoredData(section, data);
};

// User-Scoped Bookmarks management
export const getBookmarkUserKey = () => {
  const profile = getUserProfile();
  const emailKey = (profile.primaryEmail || profile.id || '').trim().toLowerCase();
  if (emailKey && emailKey !== 'builder') {
    return emailKey.replace(/[^a-z0-9]/gi, '_');
  }
  return 'anonymous_user';
};

export const getBookmarkedProjects = () => {
  const key = getBookmarkUserKey();
  return getStoredData(`bookmarked_projects_${key}`, DEFAULT_BOOKMARKED_PROJECTS);
};

export const getBookmarkedBuilders = () => {
  const key = getBookmarkUserKey();
  return getStoredData(`bookmarked_builders_${key}`, DEFAULT_BOOKMARKED_BUILDERS);
};

export const isProjectBookmarkedInStorage = (project) => {
  if (!project) return false;
  const current = getBookmarkedProjects();
  const projIdStr = project.id !== undefined && project.id !== null ? String(project.id).toLowerCase().trim() : null;
  const projTitleClean = project.title ? project.title.toLowerCase().trim() : null;

  return current.some((p) => {
    const itemCleanId = p.id !== undefined && p.id !== null ? String(p.id).toLowerCase().trim() : null;
    const itemCleanTitle = p.title ? p.title.toLowerCase().trim() : null;
    const idMatch = projIdStr && itemCleanId && projIdStr === itemCleanId;
    const titleMatch = projTitleClean && itemCleanTitle && projTitleClean === itemCleanTitle;
    return Boolean(idMatch || titleMatch);
  });
};

export const isBuilderBookmarkedInStorage = (builder) => {
  if (!builder) return false;
  const current = getBookmarkedBuilders();
  const builderIdStr = builder.id !== undefined && builder.id !== null ? String(builder.id).toLowerCase().trim() : null;
  const builderNameClean = builder.name ? builder.name.toLowerCase().trim() : null;

  return current.some((b) => {
    const itemCleanId = b.id !== undefined && b.id !== null ? String(b.id).toLowerCase().trim() : null;
    const itemCleanName = b.name ? b.name.toLowerCase().trim() : null;
    const idMatch = builderIdStr && itemCleanId && builderIdStr === itemCleanId;
    const nameMatch = builderNameClean && itemCleanName && builderNameClean === itemCleanName;
    return Boolean(idMatch || nameMatch);
  });
};

export const toggleProjectBookmarkInStorage = (project) => {
  const userKey = getBookmarkUserKey();
  const storageKey = `bookmarked_projects_${userKey}`;
  const current = getStoredData(storageKey, DEFAULT_BOOKMARKED_PROJECTS);
  const exists = isProjectBookmarkedInStorage(project);
  let updated;

  const projIdStr = project.id !== undefined && project.id !== null ? String(project.id).toLowerCase().trim() : null;
  const projTitleClean = project.title ? project.title.toLowerCase().trim() : null;

  if (exists) {
    updated = current.filter((p) => {
      const itemCleanId = p.id !== undefined && p.id !== null ? String(p.id).toLowerCase().trim() : null;
      const itemCleanTitle = p.title ? p.title.toLowerCase().trim() : null;
      const idMatch = projIdStr && itemCleanId && projIdStr === itemCleanId;
      const titleMatch = projTitleClean && itemCleanTitle && projTitleClean === itemCleanTitle;
      return !(idMatch || titleMatch);
    });
  } else {
    updated = [{ ...project, isBookmarked: true }, ...current];
  }
  setStoredData(storageKey, updated);
  return !exists;
};

export const toggleBuilderBookmarkInStorage = (builder) => {
  const userKey = getBookmarkUserKey();
  const storageKey = `bookmarked_builders_${userKey}`;
  const current = getStoredData(storageKey, DEFAULT_BOOKMARKED_BUILDERS);
  const exists = isBuilderBookmarkedInStorage(builder);
  let updated;

  const builderIdStr = builder.id !== undefined && builder.id !== null ? String(builder.id).toLowerCase().trim() : null;
  const builderNameClean = builder.name ? builder.name.toLowerCase().trim() : null;

  if (exists) {
    updated = current.filter((b) => {
      const itemCleanId = b.id !== undefined && b.id !== null ? String(b.id).toLowerCase().trim() : null;
      const itemCleanName = b.name ? b.name.toLowerCase().trim() : null;
      const idMatch = builderIdStr && itemCleanId && builderIdStr === itemCleanId;
      const nameMatch = builderNameClean && itemCleanName && builderNameClean === itemCleanName;
      return !(idMatch || nameMatch);
    });
  } else {
    updated = [{ ...builder, isBookmarked: true }, ...current];
  }
  setStoredData(storageKey, updated);
  return !exists;
};

export const getUserAvatar = (profile) => {
  if (!profile) return INSTAGRAM_EMPTY_AVATAR;
  const av = typeof profile === 'string' ? profile.trim() : (profile.avatar || profile.avatar_url || '').trim();
  if (!av) return INSTAGRAM_EMPTY_AVATAR;
  if (av.includes('images.unsplash.com')) {
    const name = profile.fullName || profile.name || profile.username;
    if (name) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=128`;
    }
    return INSTAGRAM_EMPTY_AVATAR;
  }
  return av;
};

export const getBuilderAvatar = (builder) => {
  if (!builder) return INSTAGRAM_EMPTY_AVATAR;

  const currentUser = getStoredData('profile', DEFAULT_PROFILE);
  const currentUserEmail = (currentUser.primaryEmail || '').trim().toLowerCase();
  const currentUserId = (currentUser.id || '').trim();

  const builderEmail = typeof builder === 'object' ? (builder.email || builder.primaryEmail || '').trim().toLowerCase() : '';
  const builderId = typeof builder === 'object' ? (builder.id || '').trim() : '';

  // Strictly verify if this builder is EXACTLY the current active logged-in user
  const isExactCurrentUser =
    (currentUserEmail && builderEmail && currentUserEmail === builderEmail) ||
    (currentUserId && builderId && currentUserId === builderId);

  if (isExactCurrentUser) {
    return getUserAvatar(currentUser);
  }

  // If builder has an explicit avatar URL, return it
  const av = typeof builder === 'string' ? builder.trim() : (builder.avatar || builder.avatar_url || '').trim();
  if (av && !av.includes('images.unsplash.com') && !av.includes('empty_avatar')) {
    return av;
  }

  // Fallback to deterministic avatar based solely on the builder's name
  const name = typeof builder === 'string' ? builder : (builder.name || builder.fullName || builder.creatorName || 'Builder');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
};

export const getBuilderDefaultRoles = (builder) => {
  if (builder?.roles && Array.isArray(builder.roles) && builder.roles.length > 0) {
    return builder.roles;
  }
  return [];
};

export const getUserProfile = () => {
  const profile = getStoredData('profile', DEFAULT_PROFILE);
  const firstName = profile.firstName || (profile.fullName ? profile.fullName.split(' ')[0] : '');
  const lastName = profile.lastName || (profile.fullName ? profile.fullName.split(' ').slice(1).join(' ') : '');
  const fullName = profile.fullName || `${firstName} ${lastName}`.trim();
  const avatar = getUserAvatar(profile);
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    firstName,
    lastName,
    fullName,
    avatar
  };
};

export const saveUserProfile = async (profileData, syncToDb = true) => {
  const current = getUserProfile();
  const updated = { ...current, ...profileData };
  setStoredData('profile', updated);
  if (profileData.fullName) {
    const currentAccount = getStoredData('account', DEFAULT_ACCOUNT);
    setStoredData('account', { ...currentAccount, username: profileData.fullName });
  }

  // Sync profile directly to Supabase via backend API
  if (syncToDb && (updated.primaryEmail || updated.fullName)) {
    const currentAvatar = getUserAvatar(updated);
    const payload = {
      id: updated.id || undefined,
      full_name: updated.fullName,
      primary_email: updated.primaryEmail || `${updated.fullName.toLowerCase().replace(/\s+/g, '.')}@polycollab.dev`,
      title: updated.title || 'Full Stack Engineer',
      location: updated.location || 'Remote',
      bio: updated.bio || '',
      github_url: updated.github || '',
      website_url: updated.website || '',
      avatar_url: currentAvatar,
      tech_stack: updated.techStack || { languages: [], frontend: [], backend: [] },
      roles: updated.roles || [],
      projects: updated.projects || [],
      preferences: updated.preferences || { projectStyle: 'Early Stage', roleInteraction: 'Tech Lead', communication: 'Async First' }
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/profiles`
        , {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      const data = await res.json();
      if (!data.success) {
        console.warn('Backend profile sync notice:', data.error);
      } else {
        console.log('✅ Profile synced to Supabase via Backend successfully!');
      }
    } catch (err) {
      console.warn('Backend profile sync fetch error:', err.message);
    }
  }

  return updated;
};


export const DEFAULT_NOTIFICATIONS_LIST = [];

export const getNotificationsList = () => {
  const allNotifs = getStoredData('notifications_list', DEFAULT_NOTIFICATIONS_LIST);
  const settings = loadSettings();
  const notifSettings = settings.notifications || {};

  return allNotifs.filter((item) => {
    if (item.category === 'projectUpdates' && !notifSettings.projectUpdates) return false;
    if (item.category === 'messages' && !notifSettings.messages) return false;
    if (item.category === 'buildSprints' && !notifSettings.buildSprints) return false;
    return true;
  });
};

export const clearAllNotifications = () => {
  setStoredData('notifications_list', []);
};

export const addNotification = (notif) => {
  const category = notif.category || 'projectUpdates';
  const newNotif = {
    id: Date.now().toString(),
    time: 'Just now',
    read: false,
    icon: 'notifications',
    iconColor: 'text-primary',
    category,
    ...notif
  };

  const current = getStoredData('notifications_list', DEFAULT_NOTIFICATIONS_LIST);
  setStoredData('notifications_list', [newNotif, ...current]);

  const settings = loadSettings();
  const notifSettings = settings.notifications || {};
  const isCategoryEnabled =
    (category === 'projectUpdates' && notifSettings.projectUpdates) ||
    (category === 'messages' && notifSettings.messages) ||
    (category === 'buildSprints' && notifSettings.buildSprints);

  if (notifSettings.pushNotifications && isCategoryEnabled) {
    window.dispatchEvent(new CustomEvent('polycollab_instant_notification', { detail: newNotif }));
  }

  // Asynchronously sync notification to Supabase database
  supabase
    .from('notifications')
    .insert({
      title: newNotif.title,
      description: newNotif.desc,
      icon: newNotif.icon,
      icon_color: newNotif.iconColor,
      is_read: false
    })
    .then(({ error }) => {
      if (error) console.warn('Supabase notification sync notice:', error.message);
    });
};

export const DEFAULT_TICKETS = [];

export const getSupportTickets = (userEmail) => {
  const list = getStoredData('tickets_list', DEFAULT_TICKETS);
  const cleanList = list.filter((t) => t.id !== 'TICKET-5983' && t.id !== 'TICKET-9281');

  if (!userEmail || !userEmail.trim()) return [];

  const targetEmail = userEmail.trim().toLowerCase();

  // Strictly filter tickets matching ONLY this user's email address
  return cleanList.filter((t) => t.userEmail && t.userEmail.trim().toLowerCase() === targetEmail);
};

export const addSupportTicket = (ticket) => {
  const ticketId = `TICKET-${Math.floor(1000 + Math.random() * 9000)}`;
  const userProfile = getStoredData('profile', {});
  const userAccount = getStoredData('account', {});
  const emailVal = (ticket.userEmail || userAccount.primaryEmail || userProfile.primaryEmail || '').trim().toLowerCase();
  const userName = ticket.userName || userProfile.fullName || userAccount.username || 'Builder';

  const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';

  const newTicket = {
    id: ticketId,
    status: 'Open',
    createdAt: formattedTime,
    ...ticket,
    userEmail: emailVal,
    userName
  };

  const currentList = getStoredData('tickets_list', DEFAULT_TICKETS);
  const updated = [newTicket, ...currentList];
  setStoredData('tickets_list', updated);

  addNotification({
    title: `Support Ticket Submitted (${ticketId})`,
    desc: `Your ticket "${ticket.subject}" has been received. Our team will respond shortly.`,
    icon: 'confirmation_number',
    iconColor: 'text-primary'
  });

  // Supabase ticket sync can be added here if needed

  return newTicket;
};

export const deleteSupportTicket = (ticketId) => {
  const current = getStoredData('tickets_list', DEFAULT_TICKETS);
  const updated = current.filter((t) => t.id !== ticketId);
  setStoredData('tickets_list', updated);
  return updated;
};

// Drafts and Created Projects Storage Helpers
export const DEFAULT_USER_DRAFTS = [];
export const DEFAULT_CREATED_PROJECTS = [];

export const getUserDrafts = () => {
  const drafts = getStoredData('user_drafts', DEFAULT_USER_DRAFTS);
  if (!Array.isArray(drafts)) return [];
  return drafts.filter((d) => d && d.id);
};
export const saveUserDrafts = (drafts) => setStoredData('user_drafts', drafts);
export const addUserDraft = (draft) => {
  const current = getUserDrafts();
  const newDrafts = [draft, ...current];
  saveUserDrafts(newDrafts);
  return newDrafts;
};

export const getDeletedProjectIdentifiers = () => new Set();
export const markProjectAsDeleted = () => { };
export const isProjectDeleted = () => false;

export const getUserCreatedProjects = () => {
  const profile = getUserProfile();
  const account = getStoredData('account', DEFAULT_ACCOUNT);
  const currentUserEmail = (account.primaryEmail || profile.primaryEmail || '').trim().toLowerCase();
  const currentUserName = (profile.fullName || account.username || '').trim().toLowerCase();
  const currentUserId = profile.id;

  const allProjects = getStoredData('all_published_projects', []);

  return allProjects.filter((p) => {
    if (!p) return false;

    if (p.ownerId && currentUserId) {
      if (p.ownerId === currentUserId) return true;
    }

    const pEmail = (p.creatorEmail || '').trim().toLowerCase();
    const pName = (p.creatorName || '').trim().toLowerCase();

    const isEmailMatch = Boolean(currentUserEmail && pEmail && pEmail === currentUserEmail);
    const isNameMatch = Boolean(currentUserName && pName && pName === currentUserName);

    return isEmailMatch || isNameMatch;
  });
};

export const saveUserCreatedProjects = (projects) => setStoredData('created_projects', projects);

export const addUserCreatedProject = async (project) => {
  const profile = getUserProfile();
  const account = getStoredData('account', DEFAULT_ACCOUNT);
  const currentUserEmail = account.primaryEmail || profile.primaryEmail;
  const currentUserName = profile.fullName || account.username || 'Project Owner';
  const currentAvatar = getUserAvatar(profile);
  const formattedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let ownerId = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      ownerId = session.user.id;
    }
  } catch (err) {
    console.warn('Session retrieval error:', err);
  }

  const projectWithOwner = {
    ...project,
    creatorEmail: project.creatorEmail || currentUserEmail,
    creatorName: project.creatorName || currentUserName,
    creatorAvatar: project.creatorAvatar || currentAvatar,
    postedTime: project.postedTime || `Posted on ${formattedDate}`,
    roles: project.roles || [],
    stage: project.stage || 'In Development',
    goal: project.goal || '',
    duration: project.duration || '',
    commitment: project.commitment || '',
    communication: project.communication || '',
    visibility: project.visibility || 'Public',
    refLink: project.refLink || ''
  };

  // INSTANT UX: Optimistically add the project to local storage so it appears instantly in the UI
  const currentProjects = getStoredData('all_published_projects', []);
  setStoredData('all_published_projects', [projectWithOwner, ...currentProjects]);

  // Sync to Supabase via Express Backend API asynchronously
  (async () => {
    try {
      // Calculate team capacity integer from user selected teamSize or team_capacity
      const capacityInt = parseInt(project.teamSize || project.builders, 10) || project.team_capacity || (Array.isArray(project.roles) && project.roles.length > 0 ? project.roles.reduce((acc, r) => acc + (parseInt(r.openings, 10) || 1), 0) : 5);

      const payload = {
        owner_id: ownerId,
        title: project.title,
        category: project.category,
        status: project.status || 'Open',
        level: project.level || 'Intermediate',
        description: project.overview || project.desc || '',
        team_capacity: capacityInt,
        tech_stack: Array.isArray(project.tech) ? project.tech : (project.tech ? [project.tech] : []),
        roles: project.roles || [],
        stage: project.stage,
        goal: project.goal,
        duration: project.duration,
        commitment: project.commitment,
        communication: project.communication,
        visibility: project.visibility,
        ref_link: project.refLink,
        creator_name: project.creatorName || currentUserName,
        creator_avatar: project.creatorAvatar || currentAvatar
      };

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/projects`
          , {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        if (!res.ok) throw new Error('Failed to create project');
        const json = await res.json();
        console.log('✅ Project synced successfully!', json.data);
      } catch (err) {
        console.error('❌ Backend projects insert error:', err.message);
      }

      // Force a fresh sync from the database
      await fetchProjectsFromSupabase();
    } catch (err) {
      console.error('Project creation error:', err.message);
    }
  })();

  return getUserCreatedProjects();
};

export const deleteUserCreatedProject = async (projectId, projectTitle) => {
  try {
    if (projectId) {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/projects/${projectId}`
        , { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
    } else if (projectTitle) {
      // Deleting by title via API not implemented, but we can try Supabase as fallback
      const { error: errTitle } = await supabase.from('projects').delete().eq('title', projectTitle);
      if (errTitle) console.warn('Supabase delete by Title notice:', errTitle.message);
    }
    console.log(`✅ Project deleted successfully from database!`);
  } catch (err) {
    console.warn('Delete project error:', err.message);
  }

  // Force a fresh sync from the database
  await fetchProjectsFromSupabase();
  return getUserCreatedProjects();
};

export const fetchProjectsFromSupabase = async () => {
  const deletedSet = getDeletedProjectIdentifiers();
  let dbProjects = [];

  // 1. Direct Supabase client query
  if (!dbProjects || dbProjects.length === 0) {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/projects`
      );
      if (res.ok) {
        const json = await res.json();
        dbProjects = json.data || [];
      }
    } catch (err) {
      console.warn('Backend projects fetch notice:', err.message);
    }
  }

  if (dbProjects && Array.isArray(dbProjects)) {
    const formattedList = dbProjects
      .map((p) => {
        const rawOverview = (p.description || p.overview || '').trim();
        const rawShort = (p.shortDesc || (rawOverview.length > 160 ? rawOverview.slice(0, 150) + '...' : rawOverview)).trim();

        const creatorName = p.creator_name || p.profiles?.full_name || 'Project Owner';
        const creatorAvatar = p.creator_avatar || getUserAvatar({ avatar: p.profiles?.avatar_url }) || INSTAGRAM_EMPTY_AVATAR;

        const rolesList = (p.project_roles && p.project_roles.length > 0)
          ? p.project_roles
          : (p.roles && Array.isArray(p.roles) ? p.roles : []);

        const rolesSum = Array.isArray(rolesList) ? rolesList.reduce((acc, r) => acc + (parseInt(r.openings, 10) || 1), 0) : 0;
        const capacityNum = p.team_capacity || (rolesSum > 0 ? rolesSum : 5);
        const capacityStr = `${capacityNum} Builders`;

        return {
          id: p.id,
          ownerId: p.owner_id,
          initials: p.title ? p.title.slice(0, 2).toUpperCase() : 'PR',
          title: p.title,
          shortDesc: rawShort || 'No short summary provided.',
          desc: rawShort || 'No short summary provided.',
          category: p.category || 'Web Application',
          tags: Array.isArray(p.tech_stack) ? p.tech_stack : (typeof p.tech_stack === 'string' ? p.tech_stack.split(',') : [p.category || 'App']),
          tech: Array.isArray(p.tech_stack) ? p.tech_stack.join(', ') : (typeof p.tech_stack === 'string' ? p.tech_stack : 'React, Node.js'),
          teamSize: capacityStr,
          builders: capacityStr,
          level: p.level || 'Intermediate',
          role: rolesList.length > 0 ? rolesList[0].title : 'Contributor',
          status: p.status || 'Open',
          roles: rolesList,
          stage: p.stage || 'In Development',
          goal: p.goal || '',
          duration: p.duration || '',
          commitment: p.commitment || '',
          communication: p.communication || '',
          visibility: p.visibility || 'Public',
          refLink: p.ref_link || '',
          overview: rawOverview || 'No detailed overview provided.',
          creatorEmail: p.profiles?.primary_email || '',
          creatorName,
          creatorAvatar,
          creatorBio: p.profiles?.bio || '',
          creatorRole: p.profiles?.title || '',
          creatorLocation: p.profiles?.location || '',
          creatorGithub: p.profiles?.github_url || '',
          creatorWebsite: p.profiles?.website_url || '',
          postedTime: 'Posted recently'
        };
      });

    setStoredData('all_published_projects', formattedList);
    return formattedList;
  }

  return [];
};

export const getAllPublishedProjects = () => {
  const deletedSet = getDeletedProjectIdentifiers();
  const storedAll = getStoredData('all_published_projects', []);
  return storedAll;
};

export const getBuilderSkills = (b) => {
  if (!b) return ['Software Engineer'];

  if (Array.isArray(b.skills) && b.skills.length > 0) {
    return b.skills;
  }
  if (typeof b.skills === 'string' && b.skills.trim()) {
    return b.skills.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (b.tech_stack) {
    if (Array.isArray(b.tech_stack) && b.tech_stack.length > 0) return b.tech_stack;
    if (typeof b.tech_stack === 'string' && b.tech_stack.trim()) return b.tech_stack.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (b.techStack) {
    const langs = b.techStack.languages || [];
    const front = b.techStack.frontend || [];
    const back = b.techStack.backend || [];
    const combined = [...langs, ...front, ...back];
    if (combined.length > 0) return combined;
  }
  if (b.tech) {
    if (Array.isArray(b.tech) && b.tech.length > 0) return b.tech;
    if (typeof b.tech === 'string' && b.tech.trim()) return b.tech.split(',').map((s) => s.trim()).filter(Boolean);
  }

  if (b.role || b.title) {
    return [(b.role || b.title)];
  }

  return ['Software Developer'];
};

export const fetchRegisteredBuildersFromSupabase = async () => {
  let dbProfiles = [];

  // 1. Direct Supabase client query
  if (!dbProfiles || dbProfiles.length === 0) {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/profiles`
      );
      if (res.ok) {
        const json = await res.json();
        dbProfiles = json.data || [];
      }
    } catch (err) {
      console.warn('Backend profiles fetch notice:', err.message);
    }
  }

  if (dbProfiles && dbProfiles.length > 0) {
    const currentUser = getUserProfile();
    const currentName = (currentUser.fullName || '').trim().toLowerCase();
    const currentEmail = (currentUser.primaryEmail || '').trim().toLowerCase();

    const formatted = dbProfiles.map((p) => {
      const pName = p.full_name || p.name || p.fullName || 'Anonymous Builder';
      const pEmail = p.primary_email || p.email || p.primaryEmail || '';
      const isCurrentUser = (currentEmail && pEmail && pEmail.trim().toLowerCase() === currentEmail);

      // Map Tech Stack
      const languages = (p.profile_tech_stacks || []).filter(s => s.category === 'languages').map(s => s.skill_name);
      const frontend = (p.profile_tech_stacks || []).filter(s => s.category === 'frontend').map(s => s.skill_name);
      const backend = (p.profile_tech_stacks || []).filter(s => s.category === 'backend').map(s => s.skill_name);

      // Map Roles (Experiences)
      const mappedRoles = (p.profile_experiences || []).map(r => ({
        id: r.id,
        company: r.company,
        title: r.title,
        startDate: r.start_date ? new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
        endDate: r.end_date ? new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
        current: r.is_current,
        achievements: r.achievements
      }));

      // Map Projects
      const mappedProjects = (p.profile_projects || []).map(proj => ({
        id: proj.id,
        title: proj.title,
        status: proj.status,
        techTags: proj.tech_tags,
        link: proj.project_url
      }));

      // Map Preferences
      const pref = Array.isArray(p.profile_preferences) ? p.profile_preferences[0] : p.profile_preferences;
      const mappedPreferences = pref ? {
        projectStyle: pref.project_style,
        roleInteraction: pref.role_interaction,
        communication: pref.communication_preference
      } : null;

      return {
        id: p.id || `builder-${pEmail || pName}`,
        name: pName,
        role: p.title || p.role || 'Full Stack Engineer',
        bio: p.bio || 'Registered builder on PolyCollab.',
        skills: getBuilderSkills({ skills: p.skills || p.tech_stack || p.techStack, role: p.title || p.role }),
        experience: 'Developer',
        availability: 'Available for collaboration',
        location: p.location || 'Remote',
        match: isCurrentUser ? 'Current User' : 'Verified Builder',
        avatar: p.avatar_url || p.avatar || getBuilderAvatar({ avatar: p.avatar_url || p.avatar, name: pName }),
        email: pEmail,
        github: p.github_url || p.github,
        website: p.website_url || p.website,
        techStack: { languages, frontend, backend },
        roles: mappedRoles,
        projects: mappedProjects,
        preferences: mappedPreferences
      };
    });

    setStoredData('all_registered_builders', formatted);
    return formatted;
  } else {
    setStoredData('all_registered_builders', []);
    return [];
  }
};

export const getAllRegisteredBuilders = () => {
  return getStoredData('all_registered_builders', []);
};

export const subscribeToSupabaseRealtime = (onProfilesChange, onProjectsChange) => {
  const profileChannel = supabase
    .channel('public:profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      fetchRegisteredBuildersFromSupabase().then(() => {
        if (onProfilesChange) onProfilesChange();
        window.dispatchEvent(new CustomEvent('polycollab_state_change', { detail: { key: 'all_registered_builders' } }));
      });
    })
    .subscribe();

  const projectChannel = supabase
    .channel('public:projects')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
      fetchProjectsFromSupabase().then(() => {
        if (onProjectsChange) onProjectsChange();
        window.dispatchEvent(new CustomEvent('polycollab_state_change', { detail: { key: 'all_published_projects' } }));
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(profileChannel);
    supabase.removeChannel(projectChannel);
  };
};


