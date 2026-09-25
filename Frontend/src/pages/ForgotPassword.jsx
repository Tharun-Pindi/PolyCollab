import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error);
      } else {
        setMessage('Check your email for the 6-digit reset code!');
        setStep(2);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setErrorMsg('Password must be at least 12 characters.');
      return;
    }
    
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error);
      } else {
        setMessage('Password updated successfully! Redirecting...');
        setTimeout(() => {
          navigate('/login');
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
          {step === 1 && (
            <Link to="/login" className="inline-block mb-md text-primary hover:opacity-80 transition-opacity">
              <span className="material-symbols-outlined text-3xl">arrow_back</span>
            </Link>
          )}
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface leading-none tracking-tight mb-xs">
            {step === 1 ? 'Reset Password' : 'Enter Reset Code'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {step === 1 
              ? "Enter your email and we'll send you a 6-digit code."
              : `We sent a 6-digit code to ${email}`
            }
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

        {step === 1 ? (
          <form onSubmit={handleSendEmail} className="space-y-lg">
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
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full flex justify-center items-center py-[10px] px-md border border-transparent rounded-lg text-on-primary bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-body-md text-body-md font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-60"
              type="submit"
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-lg">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="otp">
                6-Digit Reset Code
              </label>
              <input
                className="block w-full px-sm py-[10px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none text-center tracking-[0.5em] font-mono text-xl"
                id="otp"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
              />
            </div>
            
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="newPassword">
                New Password
              </label>
              <input
                className="block w-full px-sm py-[10px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 12 characters"
              />
            </div>

            <button
              disabled={loading}
              className="w-full flex justify-center items-center py-[10px] px-md border border-transparent rounded-lg text-on-primary bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-body-md text-body-md font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-60"
              type="submit"
            >
              {loading ? 'Verifying...' : 'Reset Password'}
            </button>
            <div className="text-center pt-2">
               <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-primary hover:underline cursor-pointer">
                 Back to email input
               </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
