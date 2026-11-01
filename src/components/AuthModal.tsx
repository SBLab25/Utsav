/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mail, Lock, User, Sparkles, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { isConfigured, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsDemoUser } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setError(err?.message || 'Google sign-in could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 px-6 py-6 text-white relative">
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-200" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-200">Utsav Cloud</span>
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-bold font-serif">
            {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-white/80 mt-1">
            Save your celebrations to the cloud and collaborate with family in real time.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              mode === 'signin'
                ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50/50 dark:bg-rose-950/20'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              mode === 'signup'
                ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50/50 dark:bg-rose-950/20'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Sign Up
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl"
            >
              {error}
            </div>
          )}

          {/* Social Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            aria-label="Sign in with Google"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/60 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-stone-200 dark:border-stone-800 w-full" />
            <span className="bg-white dark:bg-stone-900 px-3 text-xs uppercase tracking-wider text-stone-400">
              Or with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In to Utsav' : 'Create Account'}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
              Instant Multi-User Test Profiles:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  signInAsDemoUser('owner');
                  onClose();
                }}
                className="p-2 text-left bg-stone-50 dark:bg-stone-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-stone-200 dark:border-stone-700 rounded-xl transition-all"
              >
                <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                  Priya (Host)
                </div>
                <div className="text-[10px] text-stone-500">Plan Owner Role</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  signInAsDemoUser('collaborator');
                  onClose();
                }}
                className="p-2 text-left bg-stone-50 dark:bg-stone-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-stone-200 dark:border-stone-700 rounded-xl transition-all"
              >
                <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  Rohit (Editor)
                </div>
                <div className="text-[10px] text-stone-500">Collaborator Role</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
