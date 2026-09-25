import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the user is actually in a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg('Invalid or expired password reset link.');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match!');
      return;
    }
    if (newPassword.length < 12) {
      setErrorMsg('Password must be at least 12 characters long.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setMessage('Password updated successfully!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-md">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl p-xl relative shadow-sm">
        <div className="text-center mb-lg">
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface leading-none tracking-tight mb-xs">
            Set New Password
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Enter your new password below.
          </p>
        </div>

        {message && (
          <div className="mb-lg p-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-sm font-body-md leading-relaxed text-center">
            {message}
          </div>
        )}

        {errorMsg && (
          <div className="mb-lg p-md bg-error/10 border border-error/20 text-error rounded-lg text-sm font-body-md leading-relaxed text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="newPassword">
              New Password
            </label>
            <input
              className="block w-full px-sm py-[10px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline/60 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 12 characters"
            />
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              className="block w-full px-sm py-[10px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline/60 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
          </div>

          <button
            disabled={loading}
            className="w-full flex justify-center items-center py-[10px] px-md border border-transparent rounded-lg text-on-primary bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-body-md text-body-md font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-60"
            type="submit"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
