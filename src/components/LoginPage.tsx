/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Camera,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { login } from '../services/api';
import { AuthSession } from '../types';

interface LoginPageProps {
  onSuccess: (session: AuthSession, targetPath?: string) => void;
  onNavigateRegister: (role?: 'customer' | 'creator') => void;
  onNavigateHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateRegister,
  onNavigateHome,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your registered email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const session = await login(email.trim().toLowerCase(), password);
      const redirectPath = session.creator ? '/creator/dashboard' : '/customer/dashboard';
      onSuccess(session, redirectPath);
    } catch (err: any) {
      // User-friendly inline validation message without raw internal errors
      setError(
        err.message || 'Incorrect email or password. Please verify your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 py-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full space-y-6">
        {/* Brand / Logo */}
        <div className="text-center space-y-2">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2.5 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white font-['Space_Grotesk']">
              CreatorFlow
            </span>
          </button>
          <h1 className="text-2xl font-bold text-white font-['Space_Grotesk'] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-neutral-400">
            Sign in to manage your bookings, projects, messages or creator workspace.
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {showForgotNotice && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Password Reset Assistance</p>
                <p className="text-neutral-400 mt-0.5">
                  If this is a managed account, you can sign in directly or register a new client or creator account.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(true)}
                  className="text-[11px] text-neutral-400 hover:text-amber-400 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="border-t border-neutral-800 pt-4 space-y-3">
            <button
              type="button"
              onClick={() => onNavigateRegister('customer')}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
            >
              Create Account
            </button>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">New creator?</p>
                <p className="text-[11px] text-neutral-400">Join our verified talent network</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateRegister('creator')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                Become a Creator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
