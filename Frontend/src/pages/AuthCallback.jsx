import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { saveUserProfile, addNotification, getUserProfile, fetchProjectsFromSupabase } from '../lib/storage';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState(null);
  const processedRef = useRef(false); // Prevent double-processing in React Strict Mode

  // Safely read authSource once on mount to avoid React Strict Mode wiping it before use
  const [authSource] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    let sourceParam = params.get('source');
    if (!sourceParam) {
      const match = document.cookie.match(/(^| )polycollab_github_auth_source=([^;]+)/);
      if (match) sourceParam = match[2];
    }
    return sourceParam || localStorage.getItem('polycollab_github_auth_source');
  });



  /**
   * Core handler: processes the authenticated user session.
   * Checks `polycollab_github_auth_source` and checks `profiles` DB table
   * to route new registrations to /create-profile and returning users to /dashboard.
   */
  const handleAuthenticatedUser = async (user) => {
    if (processedRef.current) return; // Guard against double invocation
    processedRef.current = true;

    const meta = user.user_metadata || {};

    const githubUsername = meta.preferred_username || meta.user_name || '';
    const githubUrl = githubUsername ? `https://github.com/${githubUsername}` : '';
    const avatarUrl = meta.avatar_url || meta.picture || '';
    const fullName = meta.full_name || meta.name || '';

    // ── Look up profile in the database ──
    let dbProfile = null;

    // 1. Try Express Backend API
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/profiles`
      );
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        dbProfile = resData.data.find((p) => p.id === user.id);
      }
    } catch (fetchErr) {
      console.warn('Backend profile fetch notice:', fetchErr.message);
    }

    // 2. Fallback: direct Supabase query by id
    if (!dbProfile) {
      try {
        const { data: sbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (sbProfile) dbProfile = sbProfile;
      } catch (sbErr) {
        console.warn('Supabase profile fetch notice:', sbErr.message);
      }
    }


    // Detect if this user was literally JUST created by Supabase Auth (within the last 15 seconds)
    const isBrandNewAuthUser = new Date().getTime() - new Date(user.created_at).getTime() < 15000;

    // Check if profile exists and has required fields complete
    const hasCompleteProfile = Boolean(
      dbProfile &&
      dbProfile.full_name &&
      dbProfile.full_name.trim().length > 0 &&
      dbProfile.title &&
      dbProfile.bio &&
      dbProfile.bio.trim().length > 0
    );

    // ── DECISION: Route based on authSource and profile completeness ──
    const isSignupSource = authSource === 'signup';
    // Strict Mode Fail-Safe: If source is lost or unrecognized, ALWAYS assume it's a login attempt to prevent unauthorized access
    const isLoginSource = !isSignupSource;

    if (isLoginSource) {
      if (!hasCompleteProfile || isBrandNewAuthUser) {
        // Strict Block: User is trying to login but they are either completely new or don't have a complete profile.
        console.warn('Unauthorized login attempt by unregistered user. Blocking and cleaning up ghost accounts.');

        // 1. Ensure they are deleted from Supabase Auth and any partial DB profiles
        try {
          await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/users/${user.id}`
            , { method: 'DELETE' });
        } catch (e) {
          console.warn('Could not delete unauthorized user:', e);
        }

        // 2. Sign out of the ghost session
        await supabase.auth.signOut();

        // 3. Clear local storage traces
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('polycollab_')) localStorage.removeItem(key);
        });

        // 4. Kick back to login with strict error
        localStorage.setItem('auth_error', "No matching account found. If you registered via email, please login with email/password instead.");
        navigate('/login', { replace: true });
        return;
      }
    }
    if (isSignupSource && hasCompleteProfile) {
      console.warn('Signup attempt by already registered user. Blocking.');
      try {
        await supabase.auth.signOut();
      } catch (e) { }
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('polycollab_') && key !== 'polycollab_github_auth_source') {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('auth_error', "Account already exists. Please login instead.");
      navigate('/login', { replace: true });
      return;
    }

    if (isSignupSource || isBrandNewAuthUser || !hasCompleteProfile) {
      // New user registering via GitHub OR user with incomplete profile
      // Aggressively clear stale local session data from deleted accounts
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('polycollab_') && key !== 'polycollab_github_auth_source') {
          localStorage.removeItem(key);
        }
      });

      // Save user base information to initialize profile wizard (LOCAL ONLY - NO DB SYNC YET)
      await saveUserProfile({
        id: user.id,
        primaryEmail: user.email,
        fullName: dbProfile?.full_name || fullName,
        avatar: avatarUrl || dbProfile?.avatar_url,
        github: githubUrl || dbProfile?.github_url,
      }, false);

      addNotification({
        title: 'Welcome to PolyCollab!',
        desc: 'Please complete your profile to finish account registration.',
        icon: 'account_circle',
        iconColor: 'text-emerald-500',
      });

      // Cleanup auth source
      localStorage.removeItem('polycollab_github_auth_source');
      document.cookie = "polycollab_github_auth_source=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      navigate('/create-profile', { replace: true });
      return;
    }

    // Format complex nested data from raw profile row
    const techStack = { languages: [], frontend: [], backend: [] };
    if (dbProfile?.profile_tech_stacks) {
      dbProfile.profile_tech_stacks.forEach(t => {
        if (techStack[t.category]) techStack[t.category].push(t.skill_name);
      });
    }

    const roles = dbProfile?.profile_experiences?.map(r => ({
      company: r.company,
      title: r.title,
      startDate: r.start_date,
      endDate: r.end_date,
      current: r.is_current,
      achievements: r.achievements
    })) || [];

    const projects = dbProfile?.profile_projects?.map(p => ({
      title: p.title,
      status: p.status,
      techTags: p.tech_tags ? p.tech_tags.split(',').map(s => s.trim()) : [],
      link: p.project_url
    })) || [];

    const preferences = dbProfile?.profile_preferences?.[0] ? {
      projectStyle: dbProfile.profile_preferences[0].project_style,
      roleInteraction: dbProfile.profile_preferences[0].role_interaction,
      communication: dbProfile.profile_preferences[0].communication_preference
    } : null;

    // Case: Returning user logging in with an existing complete profile
    saveUserProfile({
      id: user.id,
      primaryEmail: user.email,
      fullName: dbProfile?.full_name || fullName || '',
      avatar: avatarUrl || dbProfile?.avatar_url || '',
      github: githubUrl || dbProfile?.github_url || '',
      title: dbProfile?.title || 'Software Engineer',
      location: dbProfile?.location || 'Remote',
      bio: dbProfile?.bio || '',
      techStack: Object.keys(techStack).some(k => techStack[k].length > 0) ? techStack : { languages: [], frontend: [], backend: [] },
      roles,
      projects,
      preferences,
      website: dbProfile?.website_url || '',
    }, false);

    addNotification({
      title: 'Welcome Back!',
      desc: `Signed in as ${dbProfile?.full_name || fullName || user.email}.`,
      icon: 'account_circle',
      iconColor: 'text-emerald-500',
    });

    try {
      await fetchProjectsFromSupabase();
    } catch (e) {
      console.warn('Failed to fetch projects during auth callback:', e);
    }

    // Cleanup auth source
    localStorage.removeItem('polycollab_github_auth_source');
    document.cookie = "polycollab_github_auth_source=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    navigate('/dashboard', { replace: true });
  };

  useEffect(() => {
    let mounted = true;

    const processAuthCallback = async () => {
      try {
        // 1. Check current session
        let { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('OAuth Callback Error:', error);
          if (mounted) setErrorMsg(error.message);
          return;
        }

        // 2. If session isn't populated immediately, poll session or process token from hash/query URL
        if (!session?.user) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const searchParams = new URLSearchParams(window.location.search);
          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data: setSessionData, error: setSessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (!setSessionErr && setSessionData?.session) {
              session = setSessionData.session;
            }
          }
        }

        if (session?.user) {
          if (mounted) await handleAuthenticatedUser(session.user);
        } else {
          // Listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (newSession?.user && mounted) {
              subscription.unsubscribe();
              await handleAuthenticatedUser(newSession.user);
            }
          });

          // Polling fallback to ensure session pick-up before timeout
          let pollCount = 0;
          const pollInterval = setInterval(async () => {
            pollCount++;
            const { data: { session: polledSession } } = await supabase.auth.getSession();
            if (polledSession?.user && mounted && !processedRef.current) {
              clearInterval(pollInterval);
              subscription.unsubscribe();
              await handleAuthenticatedUser(polledSession.user);
            }
            if (pollCount > 10) {
              clearInterval(pollInterval);
            }
          }, 500);

          setTimeout(() => {
            if (mounted && !processedRef.current) {
              setErrorMsg('Unable to retrieve active GitHub session. Please try logging in again.');
            }
          }, 8000);
        }
      } catch (err) {
        console.error('Unexpected callback error:', err);
        if (mounted) setErrorMsg(err.message || 'Authentication callback failed.');
      }
    };

    processAuthCallback();

    return () => {
      mounted = false;
    };
  }, [navigate, authSource]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-md text-on-surface">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm text-center flex flex-col items-center gap-md">
        {errorMsg ? (
          <>
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">error</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Authentication Failed</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{errorMsg}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-md px-lg py-sm bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container transition-colors cursor-pointer"
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <svg className="w-6 h-6 absolute text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  fillRule="evenodd"
                ></path>
              </svg>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Completing GitHub Authentication</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Connecting your GitHub account to PolyCollab...</p>
          </>
        )}
      </div>
    </div>
  );
}
