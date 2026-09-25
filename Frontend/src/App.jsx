import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import CreateProfile from './pages/CreateProfile';
import AuthCallback from './pages/AuthCallback';

import Dashboard from './pages/Dashboard';
import ExploreProjects from './pages/ExploreProjects';
import FindBuilders from './pages/FindBuilders';
import BuildSprints from './pages/BuildSprints';
import BuilderProfile from './pages/BuilderProfile';
import CreateProject from './pages/CreateProject';
import MyProjects from './pages/MyProjects';
import ApplyToProject from './pages/ApplyToProject';
import IncomingApplications from './pages/IncomingApplications';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Bookmarks from './pages/Bookmarks';
import Settings from './pages/Settings';
import HelpSupport from './pages/HelpSupport';
import ViewProject from './pages/ViewProject';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import { supabase } from './lib/supabase';
import { getUserProfile, saveUserProfile, subscribeToSupabaseRealtime } from './lib/storage';

function ProtectedLayout({ session, loading }) {
  const [dbSyncing, setDbSyncing] = useState(true);
  const [hasValidProfile, setHasValidProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyRealDbProfile = async () => {
      if (!session?.user) {
        if (isMounted) setDbSyncing(false);
        return;
      }

      try {
        // REAL DB SYNC: Verify user actually has a profile row in the database
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, title')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          console.warn('Real DB Sync error:', error);
        }

        // Must have a profile and must have completed the wizard (full_name and title)
        let isValid = Boolean(data && data.full_name && data.full_name.trim().length > 0 && data.title);

        // BULLETPROOF FALLBACK: If DB check fails or lags, trust the local storage if they just completed the wizard
        if (!isValid) {
          const localProfile = getUserProfile();
          if (localProfile && localProfile.fullName && localProfile.title) {
            console.log('DB sync lagged or failed, but local profile is complete. Allowing access.');
            isValid = true;
          }
        }

        if (isMounted) {
          setHasValidProfile(isValid);
          setDbSyncing(false);
        }
      } catch (err) {
        console.warn('Real DB Sync failure:', err);
        // Fallback on error too
        const localProfile = getUserProfile();
        const isValid = Boolean(localProfile && localProfile.fullName && localProfile.title);

        if (isMounted) {
          setHasValidProfile(isValid);
          setDbSyncing(false);
        }
      }
    };

    if (!loading) {
      verifyRealDbProfile();
    }

    return () => { isMounted = false; };
  }, [session, loading]);

  if (loading || dbSyncing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-md text-on-surface">
        <div className="flex flex-col items-center gap-md">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-body-md text-on-surface-variant font-medium">Verifying Session...</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = !!session;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // REAL DB SYNC: Block unauthorized access to the dashboard
  if (!hasValidProfile) {
    // Check if we explicitly know they clicked the Login button
    const authSource = localStorage.getItem('polycollab_github_auth_source') ||
      document.cookie.match(/(^| )polycollab_github_auth_source=([^;]+)/)?.[2];

    if (authSource === 'login') {
      // They clicked Login but don't have a profile. This is an unauthorized login attempt!
      // Delete the ghost auth user and kick them back to login.
      try {
        fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/users/${session.user.id}`
          , { method: 'DELETE' }).catch(() => { });
      } catch (e) { }

      supabase.auth.signOut().catch(() => { /* ignore */ });

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('polycollab_')) {
          localStorage.removeItem(key);
        }
      });

      localStorage.setItem('auth_error', "No matching account found. If you registered via email, please login with email/password instead.");
      return <Navigate to="/login" replace />;
    }

    // Default fallback: They clicked Signup, OR state was lost due to browser strictness.
    // Never delete their user here. Route them safely to the wizard to finish onboarding!
    return <Navigate to="/create-profile" replace />;
  }

  return <Layout />;
}

function PublicAuthRoute({ session, loading, children }) {
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-md text-on-surface">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAuthenticated = !!session;
  const isRegisterPage = window.location.pathname === '/register';

  if (isAuthenticated && !isRegisterPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUserSession = (activeSession) => {
    setSession(activeSession);
    if (activeSession?.user) {
      // If an OAuth auth flow is in progress (signup or login), let AuthCallback handle profile saves.
      // This prevents racing with AuthCallback and accidentally populating stale localStorage data.
      const authFlowInProgress = localStorage.getItem('polycollab_github_auth_source');
      if (authFlowInProgress) {
        setLoading(false);
        return;
      }

      const user = activeSession.user;
      const meta = user.user_metadata || {};
      const currentProfile = getUserProfile();

      // Only sync if we already have a profile (i.e., returning user, not mid-signup)
      if (currentProfile.primaryEmail || currentProfile.fullName) {
        const githubUsername = meta.preferred_username || meta.user_name || '';
        const githubUrl = githubUsername ? `https://github.com/${githubUsername}` : currentProfile.github;
        const avatarUrl = meta.avatar_url || meta.picture || currentProfile.avatar;
        const fullName = meta.full_name || meta.name || currentProfile.fullName || '';

        saveUserProfile({
          ...currentProfile,
          id: user.id,
          primaryEmail: user.email,
          fullName,
          avatar: avatarUrl,
          github: githubUrl
        }, false);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    // Fetch active session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Verify the user hasn't been manually deleted from the database
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          await supabase.auth.signOut();
          setSession(null);
          setLoading(false);
          return;
        }
      }
      syncUserSession(session);
    });

    // Subscribe to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserSession(session);
    });

    // Global realtime data sync for profiles and projects
    const unsubscribeRealtime = subscribeToSupabaseRealtime();

    return () => {
      subscription.unsubscribe();
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, []);

  return (
    <ErrorBoundary>
      <Routes>
        {/* Auth & Onboarding Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/login"
          element={
            <PublicAuthRoute session={session} loading={loading}>
              <Login />
            </PublicAuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicAuthRoute session={session} loading={loading}>
              <CreateAccount />
            </PublicAuthRoute>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/create-profile" element={<CreateProfile />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Main Application Routes inside Protected Layout Shell */}
        <Route element={<ProtectedLayout session={session} loading={loading} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/explore-projects" element={<ExploreProjects />} />
          <Route path="/view-project" element={<ViewProject />} />
          <Route path="/find-builders" element={<FindBuilders />} />
          <Route path="/build-sprints" element={<BuildSprints />} />
          <Route path="/builder-profile" element={<BuilderProfile />} />
          <Route path="/create-project" element={<CreateProject />} />
          <Route path="/my-projects" element={<MyProjects />} />
          <Route path="/apply-to-project" element={<ApplyToProject />} />
          <Route path="/applications" element={<IncomingApplications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<HelpSupport />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

