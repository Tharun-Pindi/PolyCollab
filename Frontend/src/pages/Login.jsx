import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUserProfile, saveUserProfile, addNotification } from '../lib/storage';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Read error from local storage to survive React Router loops
  React.useEffect(() => {
    const storedError = localStorage.getItem('auth_error');
    if (storedError) {
      setErrorMsg(storedError);
      localStorage.removeItem('auth_error');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      return setErrorMsg('Please enter both email and password.');
    }

    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Attempt Real Supabase Auth Sign In
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (!authError && authData?.user) {
      let dbProfile = null;
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/auth/login`
          , {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password })
          });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.profile) {
            dbProfile = json.profile;
          }
        }
      } catch (err) {
        console.warn('Backend fetch failed during login, falling back:', err);
      }

      const currentProfile = getUserProfile();
      const displayName = dbProfile?.full_name || authData.user.user_metadata?.full_name || '';

      const techStack = dbProfile?.tech_stack || { languages: [], frontend: [], backend: [] };
      const roles = dbProfile?.roles || [];
      const projects = dbProfile?.projects || [];
      const preferences = dbProfile?.preferences || currentProfile.preferences;

      await saveUserProfile({
        ...currentProfile,
        id: authData.user.id,
        fullName: displayName,
        primaryEmail: cleanEmail,
        title: dbProfile?.title || currentProfile.title || 'Software Engineer',
        location: dbProfile?.location || currentProfile.location || 'Remote',
        bio: dbProfile?.bio || currentProfile.bio || '',
        github: dbProfile?.github_url || currentProfile.github || '',
        website: dbProfile?.website_url || currentProfile.website || '',
        avatar: dbProfile?.avatar_url || currentProfile.avatar,
        techStack: Object.keys(techStack).some(k => techStack[k].length > 0) ? techStack : currentProfile.techStack,
        roles: roles.length > 0 ? roles : currentProfile.roles,
        projects: projects.length > 0 ? projects : currentProfile.projects,
        preferences: preferences
      }, false);

      setLoading(false);
      navigate('/dashboard');
      return;
    }

    setLoading(false);
    setErrorMsg("Authentication failed. Please verify your email and password, or click 'Create an account' to register.");
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Mark that this GitHub OAuth was triggered from LOGIN page (not signup)
      localStorage.setItem('polycollab_github_auth_source', 'login');
      document.cookie = "polycollab_github_auth_source=login; path=/; max-age=3600";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?source=login`,
          scopes: 'read:user user:email'
        }
      });

      if (error) {
        console.error('GitHub OAuth Error:', error);
        localStorage.removeItem('polycollab_github_auth_source');
        setLoading(false);
        setErrorMsg(`GitHub OAuth error: ${error.message}. Please ensure GitHub provider is enabled in your Supabase Auth dashboard settings.`);
      }
    } catch (err) {
      console.error('Unexpected GitHub auth error:', err);
      localStorage.removeItem('polycollab_github_auth_source');
      setLoading(false);
      setErrorMsg(`GitHub OAuth error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-md text-on-surface bg-[#F8FAFC]">
      <main className="w-full max-w-[440px]">
        {/* Brand / Logo Area */}
        <div className="flex flex-col items-center mb-xl">
          <div className="flex items-center gap-md mb-md">
            <img
              alt="PolyCollab Logo"
              className="h-10 w-auto object-contain"
              src="/logo.png"
            />
            <h1 className="font-headline-lg text-headline-lg font-bold text-primary leading-none tracking-tight">PolyCollab</h1>
          </div>
          <p className="font-body-lg text-body-lg text-on-surface-variant text-center">
            Sign in to continue to PolyCollab
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl relative shadow-sm">
          {errorMsg && (
            <div className="mb-lg p-md bg-error/10 border border-error/20 text-error rounded-lg text-sm flex items-start gap-sm font-body-md leading-relaxed">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Authentication Notice</span>
                {errorMsg}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-lg" autoComplete="off">
            {/* Email Field */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </div>
                <input
                  className="block w-full pl-[40px] pr-sm py-[10px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline/60 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                  id="email"
                  name="user_login_email"
                  autoComplete="off"
                  placeholder="yourname@gmail.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-xs">
                <label className="block font-label-md text-label-md text-on-surface" htmlFor="password">
                  Password
                </label>
                <Link className="font-body-md text-body-md text-primary hover:text-primary-container transition-colors" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </div>
                <input
                  className="block w-full pl-[40px] pr-sm py-[10px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline/60 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                  id="password"
                  name="user_login_password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Sign In Primary Action */}
            <div className="pt-xs">
              <button
                disabled={loading}
                className="w-full flex justify-center items-center py-[10px] px-md border border-transparent rounded-lg text-on-primary bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-body-md text-body-md font-semibold transition-all shadow-sm cursor-pointer active:scale-[0.99] disabled:opacity-60"
                type="submit"
                style={{ backgroundColor: 'rgb(99, 102, 241)' }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative flex items-center my-lg">
            <div className="flex-grow border-t border-outline-variant"></div>
            <span className="flex-shrink-0 mx-md font-label-md text-label-md text-outline">OR</span>
            <div className="flex-grow border-t border-outline-variant"></div>
          </div>

          {/* OAuth & Secondary Actions */}
          <div className="space-y-md">
            <button
              type="button"
              onClick={handleGithubLogin}
              disabled={loading}
              className="w-full flex justify-center items-center gap-sm py-[10px] px-md border border-outline-variant rounded-lg text-on-surface bg-surface-container-lowest hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-outline font-body-md text-body-md font-medium transition-all shadow-sm cursor-pointer active:scale-[0.99] disabled:opacity-60"
            >
              <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  fillRule="evenodd"
                ></path>
              </svg>
              Continue with GitHub
            </button>

            <Link
              to="/register"
              className="w-full flex justify-center items-center py-[10px] px-md border border-outline-variant rounded-lg text-on-surface bg-surface-container-lowest hover:bg-surface-dim focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-outline font-body-md text-body-md font-medium transition-colors cursor-pointer"
            >
              Create an account
            </Link>
          </div>
        </div>

        <div className="mt-lg text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">
            By signing in, you agree to our <a className="text-primary hover:underline" href="#">Terms of Service</a> and{' '}
            <a className="text-primary hover:underline" href="#">Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}



