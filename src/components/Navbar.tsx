/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  Calendar,
  HardDrive,
  Bell,
  LogOut,
  ChevronDown,
  User as UserIcon,
  LayoutDashboard,
  MessageSquare,
  Bookmark,
  Briefcase,
  Settings,
  Sparkles,
} from 'lucide-react';
import { AuthSession, NotificationItem } from '../types';
import { logout } from '../services/api';
import { SafeAvatar } from '../utils/imageUtils';

interface NavbarProps {
  session: AuthSession | null;
  notifications: NotificationItem[];
  onOpenAuth: (initialMode?: 'login' | 'registerCustomer' | 'registerCreator') => void;
  onOpenDashboard: (tab?: string) => void;
  onSelectCreator: (username: string) => void;
  onGoHome: () => void;
  onNavigateExplore?: () => void;
  onNavigateServices?: () => void;
  onNavigateHowItWorks?: () => void;
  onNavigateLogin?: () => void;
  onNavigateRegister?: (role?: 'customer' | 'creator') => void;
  onViewPublicProfile?: (username: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  notifications,
  onOpenAuth,
  onOpenDashboard,
  onSelectCreator,
  onGoHome,
  onNavigateExplore,
  onNavigateServices,
  onNavigateHowItWorks,
  onNavigateLogin,
  onNavigateRegister,
  onViewPublicProfile,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isCreator = session?.user?.accountType === 'creator' || Boolean(session?.creator);
  const isCustomer = session?.user?.accountType === 'customer' && !session?.creator;

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5 font-['Space_Grotesk']">
                CreatorFlow
              </span>
              <p className="text-[10px] text-neutral-400 font-medium hidden sm:block">
                Creative Talent Marketplace
              </p>
            </div>
          </button>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-neutral-300">
          <button
            onClick={onNavigateExplore || onGoHome}
            className="px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            Explore Creators
          </button>
          <button
            onClick={onNavigateHowItWorks || onGoHome}
            className="px-3.5 py-1.5 rounded-lg hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            How It Works
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Notifications Dropdown (Only when logged in) */}
          {session && (
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-neutral-950" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <span className="font-semibold text-sm text-white">Notifications</span>
                    <span className="text-xs text-neutral-400">Activity &amp; Updates</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-neutral-800/60 mt-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-neutral-500 text-center py-6">
                        No new notifications
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.notificationId} className="py-2.5 px-2 hover:bg-neutral-800/40 rounded-lg">
                          <div className="flex items-start gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-white">{n.title}</p>
                              <p className="text-xs text-neutral-400 mt-0.5">{n.message}</p>
                              <span className="text-[10px] text-neutral-500 mt-1 block">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Account / Auth Actions */}
          {session ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-700"
              >
                <SafeAvatar
                  src={session.creator?.profileImageUrl || session.user.profileImage}
                  name={session.creator?.displayName || session.user.fullName}
                  className="w-8 h-8 rounded-full ring-1 ring-neutral-700"
                  size={400}
                />
                <span className="text-xs font-semibold text-white max-w-[120px] truncate hidden sm:inline">
                  {session.creator?.displayName || session.user.fullName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-neutral-800 mb-1">
                    <p className="text-xs font-bold text-white truncate">{session.user.fullName}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{session.user.email}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {isCreator ? 'Creator' : 'Client'}
                    </span>
                  </div>

                  {/* CREATOR PROFILE MENU */}
                  {isCreator && (
                    <>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          const uname =
                            session.creator?.username ||
                            (session.user as any)?.username ||
                            'siam-ahmed';
                          if (onViewPublicProfile) {
                            onViewPublicProfile(uname);
                          } else {
                            onSelectCreator(uname);
                          }
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <UserIcon className="w-4 h-4 text-neutral-400" />
                        View Public Profile
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('overview');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <LayoutDashboard className="w-4 h-4 text-neutral-400" />
                        Creator Dashboard
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('bookings');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        Bookings
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('messages');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <MessageSquare className="w-4 h-4 text-neutral-400" />
                        Messages
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('availability');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <Calendar className="w-4 h-4 text-amber-400" />
                        Calendar
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('settings');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <Settings className="w-4 h-4 text-neutral-400" />
                        Settings
                      </button>
                    </>
                  )}

                  {/* CUSTOMER PROFILE MENU */}
                  {isCustomer && (
                    <>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('overview');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <LayoutDashboard className="w-4 h-4 text-neutral-400" />
                        Customer Dashboard
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('bookings');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        My Bookings
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('projects');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <Briefcase className="w-4 h-4 text-neutral-400" />
                        Projects
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('saved');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <Bookmark className="w-4 h-4 text-neutral-400" />
                        Saved Creators
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('messages');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <MessageSquare className="w-4 h-4 text-neutral-400" />
                        Messages
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDashboard('settings');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5"
                      >
                        <Settings className="w-4 h-4 text-neutral-400" />
                        Settings
                      </button>
                    </>
                  )}

                  <div className="border-t border-neutral-800 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ANONYMOUS VISITOR PUBLIC HEADER BUTTONS */
            <div className="flex items-center gap-2">
              <button
                onClick={() => (onNavigateLogin ? onNavigateLogin() : onOpenAuth('login'))}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-xl transition-colors"
              >
                Login
              </button>

              <button
                onClick={() =>
                  onNavigateRegister ? onNavigateRegister('customer') : onOpenAuth('registerCustomer')
                }
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl border border-neutral-700 transition-colors hidden sm:inline-block"
              >
                Create Account
              </button>

              <button
                onClick={() =>
                  onNavigateRegister ? onNavigateRegister('creator') : onOpenAuth('registerCreator')
                }
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 hover:from-rose-600 hover:to-amber-600 rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Become a Creator</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
