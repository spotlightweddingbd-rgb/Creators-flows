/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Camera,
  Film,
  Calendar,
  ArrowRight,
  Star,
  RefreshCw,
  CheckCircle,
  Sparkles,
  ShieldCheck,
  Video,
  Scissors,
  Plane,
  Palette,
  Check,
  Clock,
  HardDrive,
  Users,
  MapPin,
  X,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { CreatorCard } from './components/CreatorCard';
import { CreatorProfileView } from './components/CreatorProfileView';
import { BookingModal } from './components/BookingModal';
import { DashboardView } from './components/DashboardView';
import { AuthModal } from './components/AuthModal';
import { DevBackendView } from './components/DevBackendView';
import { RegisterPage } from './components/RegisterPage';
import { LoginPage } from './components/LoginPage';
import { SafeAvatar, SafeCover } from './utils/imageUtils';
import {
  Creator,
  PortfolioItem,
  Service,
  PackageItem,
  Review,
  Availability,
  AuthSession,
  Booking,
  NotificationItem,
} from './types';
import {
  getCreators,
  getCreatorProfile,
  getAvailability,
  getStoredSession,
  getNotifications,
  syncLocalSessionWithCreatorUpdate,
} from './services/api';
import { MOCK_CREATORS } from './data/mockData';

export const ROLE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'photographer', label: 'Photographer' },
  { id: 'cinematographer', label: 'Cinematographer' },
  { id: 'videographer', label: 'Videographer' },
  { id: 'video_editor', label: 'Video Editor' },
  { id: 'photo_editor', label: 'Photo Editor' },
  { id: 'drone', label: 'Drone Operator' },
  { id: 'designer', label: 'Graphic Designer' },
];

type ViewMode =
  | 'explore'
  | 'profile'
  | 'dashboard'
  | 'dev'
  | 'register'
  | 'login'
  | 'how-it-works';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [profileData, setProfileData] = useState<{
    creator: Creator;
    portfolios: PortfolioItem[];
    services: Service[];
    packages: PackageItem[];
    reviews: Review[];
    availability: Availability[];
  } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [isLoadingCreators, setIsLoadingCreators] = useState(false);

  // Views & Routing State
  const [currentView, setCurrentView] = useState<ViewMode>('explore');
  const [registerInitialRole, setRegisterInitialRole] = useState<'customer' | 'creator'>('creator');
  const [dashboardTab, setDashboardTab] = useState<string>('bookings');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingCreator, setBookingCreator] = useState<Creator | null>(null);
  const [bookingPackage, setBookingPackage] = useState<PackageItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'registerCustomer' | 'registerCreator'>('login');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [bookingToast, setBookingToast] = useState<string | null>(null);

  // View creator public profile by username
  const handleViewCreatorProfile = async (username: string) => {
    try {
      const fullProfile = await getCreatorProfile(username);
      const avl = await getAvailability(fullProfile.creator.creatorId).catch(() => []);
      setSelectedCreator(fullProfile.creator);
      setProfileData({
        ...fullProfile,
        availability: avl,
      });

      // If current logged-in user is this creator, sync stored session and navbar state
      const currSession = getStoredSession();
      if (currSession?.creator && currSession.creator.creatorId === fullProfile.creator.creatorId) {
        syncLocalSessionWithCreatorUpdate(fullProfile.creator);
        setSession(getStoredSession());
      }

      navigate('profile', { creatorUsername: username });
    } catch (e) {
      const fallback =
        creators.find((x) => x.username === username) ||
        (session?.creator?.username === username ? session.creator : null);
      if (fallback) {
        handleSelectCreator(fallback);
      }
    }
  };

  // Unified Route Handler
  const navigate = (
    view: ViewMode,
    options?: {
      tab?: string;
      creatorUsername?: string;
      role?: 'customer' | 'creator';
      replaceUrl?: boolean;
    }
  ) => {
    setCurrentView(view);
    if (options?.tab) setDashboardTab(options.tab);
    if (options?.role) setRegisterInitialRole(options.role);

    let targetUrl = '/';
    if (view === 'register') targetUrl = '/register';
    else if (view === 'login') targetUrl = '/login';
    else if (view === 'how-it-works') targetUrl = '/how-it-works';
    else if (view === 'dashboard') {
      const isCreator = session?.user?.accountType === 'creator' || Boolean(session?.creator);
      if (isCreator) {
        const tab = options?.tab || dashboardTab || 'overview';
        if (tab === 'overview') targetUrl = '/creator/dashboard';
        else if (tab === 'bookings') targetUrl = '/creator/bookings';
        else if (tab === 'messages') targetUrl = '/creator/messages';
        else if (tab === 'availability' || tab === 'calendar') targetUrl = '/creator/calendar';
        else if (tab === 'portfolio') targetUrl = '/creator/portfolio';
        else if (tab === 'settings') targetUrl = '/creator/settings';
        else targetUrl = `/creator/${tab}`;
      } else {
        targetUrl = '/customer/dashboard';
      }
    } else if (view === 'profile' && options?.creatorUsername) {
      targetUrl = `/creator/${options.creatorUsername}`;
    } else if (view === 'dev') {
      targetUrl = '/dev/backend';
    }

    try {
      if (options?.replaceUrl) {
        window.history.replaceState({}, '', targetUrl);
      } else {
        window.history.pushState({}, '', targetUrl);
      }
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const syncFromUrl = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      const url = hash ? hash.replace(/^#/, '') : path;
      const currentSession = getStoredSession();

      if (url.startsWith('/dev/backend') || search.includes('dev=backend')) {
        setCurrentView('dev');
      } else if (url.startsWith('/register')) {
        setCurrentView('register');
      } else if (url.startsWith('/login')) {
        setCurrentView('login');
      } else if (url.startsWith('/services')) {
        navigate('explore', { replaceUrl: true });
      } else if (url.startsWith('/how-it-works')) {
        setCurrentView('how-it-works');
      } else if (url === '/' || url === '/explore' || url === '') {
        setCurrentView('explore');
      } else if (url.startsWith('/customer/dashboard')) {
        if (!currentSession) {
          navigate('login', { replaceUrl: true });
        } else {
          setDashboardTab('bookings');
          setCurrentView('dashboard');
        }
      } else if (
        url === '/creator/dashboard' ||
        url === '/creator/bookings' ||
        url === '/creator/messages' ||
        url === '/creator/calendar' ||
        url === '/creator/availability' ||
        url === '/creator/portfolio' ||
        url === '/creator/settings'
      ) {
        // Auth Protection
        if (!currentSession) {
          navigate('login', { replaceUrl: true });
          return;
        }
        const isCreator =
          currentSession.user?.accountType === 'creator' || Boolean(currentSession.creator);
        if (!isCreator) {
          navigate('dashboard', { tab: 'bookings', replaceUrl: true });
          return;
        }

        // Map route to active dashboard tab
        if (url === '/creator/dashboard') setDashboardTab('overview');
        else if (url === '/creator/bookings') setDashboardTab('bookings');
        else if (url === '/creator/messages') setDashboardTab('messages');
        else if (url === '/creator/calendar' || url === '/creator/availability') setDashboardTab('availability');
        else if (url === '/creator/portfolio') setDashboardTab('portfolio');
        else if (url === '/creator/settings') setDashboardTab('settings');

        setCurrentView('dashboard');
      } else if (url.startsWith('/creator/')) {
        const username = url.split('/creator/')[1]?.split('/')[0]?.split('?')[0];
        if (username) {
          handleViewCreatorProfile(username);
        }
      } else if (url.startsWith('/profile/')) {
        const username = url.split('/profile/')[1]?.split('/')[0]?.split('?')[0];
        if (username) {
          handleViewCreatorProfile(username);
        }
      }
    };

    syncFromUrl();
    window.addEventListener('hashchange', syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);

    // Read stored session (anonymous visitors stay logged out)
    const stored = getStoredSession();
    if (stored) {
      setSession(stored);
    }

    const handleSessionUpdated = () => {
      const s = getStoredSession();
      if (s) setSession(s);
    };
    window.addEventListener('creatorflow:session-updated', handleSessionUpdated);

    loadCreatorsList();

    return () => {
      window.removeEventListener('hashchange', syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('creatorflow:session-updated', handleSessionUpdated);
    };
  }, []);

  useEffect(() => {
    if (session) {
      getNotifications().then((n) => setNotifications(n)).catch(() => {});
    }
  }, [session]);

  const loadCreatorsList = async () => {
    setIsLoadingCreators(true);
    try {
      const list = await getCreators({
        role: selectedRole,
        city: selectedCity,
        query: searchQuery,
        sortBy,
        verifiedOnly,
        minRating,
        priceRange,
      });
      setCreators(list);
    } catch (e) {
      setCreators(MOCK_CREATORS);
    } finally {
      setIsLoadingCreators(false);
    }
  };

  useEffect(() => {
    loadCreatorsList();
  }, [selectedRole, selectedCity, sortBy, verifiedOnly, minRating, priceRange]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCreatorsList();
  };

  const handleSelectCreator = async (creator: Creator) => {
    setSelectedCreator(creator);
    try {
      const [fullProfile, avl] = await Promise.all([
        getCreatorProfile(creator.username),
        getAvailability(creator.creatorId),
      ]);
      setProfileData({
        ...fullProfile,
        availability: avl,
      });
      navigate('profile', { creatorUsername: creator.username });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartBooking = (creator: Creator, pkg?: PackageItem) => {
    setBookingCreator(creator);
    setBookingPackage(pkg || null);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = (booking: Booking) => {
    setBookingToast(`Booking confirmed for ${booking.projectTitle}! Your schedule has been reserved.`);
    setTimeout(() => setBookingToast(null), 5000);
    getNotifications().then((n) => setNotifications(n)).catch(() => {});
  };

  // View: Hidden Developer Route (/dev/backend)
  if (currentView === 'dev') {
    return (
      <DevBackendView
        onExit={() => {
          navigate('explore');
        }}
      />
    );
  }

  // View: Register Page (/register)
  if (currentView === 'register') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-rose-500 selection:text-white">
        <Navbar
          session={session}
          notifications={notifications}
          onOpenAuth={(mode = 'login') => navigate(mode === 'login' ? 'login' : 'register')}
          onOpenDashboard={(tab = 'bookings') => navigate('dashboard', { tab })}
          onSelectCreator={handleViewCreatorProfile}
          onViewPublicProfile={handleViewCreatorProfile}
          onGoHome={() => navigate('explore')}
          onNavigateExplore={() => navigate('explore')}
          onNavigateHowItWorks={() => navigate('how-it-works')}
          onNavigateLogin={() => navigate('login')}
          onNavigateRegister={(role) => navigate('register', { role })}
        />
        <main className="flex-1">
          <RegisterPage
            initialRole={registerInitialRole}
            onSuccess={(newSession, targetPath) => {
              setSession(newSession);
              getNotifications().then((n) => setNotifications(n)).catch(() => {});
              navigate('dashboard', { tab: 'overview' });
            }}
            onNavigateLogin={() => navigate('login')}
            onNavigateHome={() => navigate('explore')}
          />
        </main>
      </div>
    );
  }

  // View: Login Page (/login)
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-rose-500 selection:text-white">
        <Navbar
          session={session}
          notifications={notifications}
          onOpenAuth={(mode = 'login') => navigate(mode === 'login' ? 'login' : 'register')}
          onOpenDashboard={(tab = 'bookings') => navigate('dashboard', { tab })}
          onSelectCreator={handleViewCreatorProfile}
          onViewPublicProfile={handleViewCreatorProfile}
          onGoHome={() => navigate('explore')}
          onNavigateExplore={() => navigate('explore')}
          onNavigateHowItWorks={() => navigate('how-it-works')}
          onNavigateLogin={() => navigate('login')}
          onNavigateRegister={(role) => navigate('register', { role })}
        />
        <main className="flex-1">
          <LoginPage
            onSuccess={(newSession) => {
              setSession(newSession);
              getNotifications().then((n) => setNotifications(n)).catch(() => {});
              navigate('dashboard', { tab: 'overview' });
            }}
            onNavigateRegister={(role) => navigate('register', { role })}
            onNavigateHome={() => navigate('explore')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-rose-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        session={session}
        notifications={notifications}
        onOpenAuth={(mode = 'login') => navigate(mode === 'login' ? 'login' : 'register')}
        onOpenDashboard={(tab = 'bookings') => navigate('dashboard', { tab })}
        onSelectCreator={handleViewCreatorProfile}
        onGoHome={() => navigate('explore')}
        onNavigateExplore={() => navigate('explore')}
        onNavigateHowItWorks={() => navigate('how-it-works')}
        onNavigateLogin={() => navigate('login')}
        onNavigateRegister={(role) => navigate('register', { role })}
        onViewPublicProfile={handleViewCreatorProfile}
      />

      {/* Success Toast Notification */}
      {bookingToast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-emerald-300 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 max-w-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-white">Booking Confirmed</p>
            <p className="text-neutral-300 mt-0.5">{bookingToast}</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW 1: EXPLORE / DIRECTORY & HOMEPAGE */}
        {/* VIEW: CREATOR MARKETPLACE DIRECT ON ROOT (/) */}
        {currentView === 'explore' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-20">
            {/* Compact Marketplace Header */}
            <header className="space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
                  Find Creative Talent
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Photographers, cinematographers, editors and creative professionals across Bangladesh.
                </p>
              </div>

              {/* Immediate Search Bar */}
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center w-full rounded-2xl bg-neutral-900 border border-neutral-800 p-1.5 shadow-xl backdrop-blur-md focus-within:border-neutral-700 transition-colors"
              >
                <Search className="w-5 h-5 text-neutral-500 ml-3 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by creator name, style, equipment (e.g. Sony FX6, Drone, Wedding)..."
                  className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                    }}
                    className="p-1 rounded-lg text-neutral-500 hover:text-neutral-300 mr-1"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 shrink-0 flex items-center gap-1.5"
                >
                  <span>Search</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Category Role Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                {ROLE_CATEGORIES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                      selectedRole === role.id
                        ? 'bg-white text-black shadow-md'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>

              {/* Additional Filters & Sort Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {/* City Filter */}
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5">
                  <span className="text-neutral-500">City:</span>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Locations</option>
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Sylhet">Sylhet</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Khulna">Khulna</option>
                  </select>
                </div>

                {/* Rating Filter */}
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5">
                  <span className="text-neutral-500">Rating:</span>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value={0}>All Ratings</option>
                    <option value={4.8}>★ 4.8+</option>
                    <option value={4.5}>★ 4.5+</option>
                    <option value={4.0}>★ 4.0+</option>
                  </select>
                </div>

                {/* Price Range */}
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5">
                  <span className="text-neutral-500">Price:</span>
                  <select
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Prices</option>
                    <option value="under_20k">Under ৳20,000</option>
                    <option value="20k_40k">৳20,000 - ৳40,000</option>
                    <option value="above_40k">৳40,000+</option>
                  </select>
                </div>

                {/* Verified Toggle */}
                <button
                  type="button"
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
                    verifiedOnly
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-400 font-semibold'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Only</span>
                </button>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 sm:ml-auto">
                  <span className="text-neutral-500">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="rating">Top Rated</option>
                    <option value="newest">Newest</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>

                {/* Clear all filters button */}
                {(selectedRole !== 'all' || selectedCity !== 'all' || verifiedOnly || minRating > 0 || priceRange !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedRole('all');
                      setSelectedCity('all');
                      setSearchQuery('');
                      setVerifiedOnly(false);
                      setMinRating(0);
                      setPriceRange('all');
                      setSortBy('rating');
                    }}
                    className="text-neutral-400 hover:text-white underline underline-offset-2 px-1 py-1 text-xs"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </header>

            {/* Featured Creators Section */}
            {creators.some((c) => c.featured) && (
              <section className="rounded-2xl bg-gradient-to-b from-neutral-900/90 to-neutral-900/40 border border-neutral-800/80 p-4 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Featured Creators
                    </h2>
                    <span className="text-[11px] text-neutral-400 hidden sm:inline">• Top Rated Verified Talent</span>
                  </div>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {creators.filter((c) => c.featured).length} Featured
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {creators
                    .filter((c) => c.featured)
                    .slice(0, 3)
                    .map((fc) => (
                      <div
                        key={fc.creatorId}
                        className="group relative bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 hover:border-neutral-700 transition-all flex items-center gap-3"
                      >
                        <SafeAvatar
                          src={fc.profileImageUrl}
                          name={fc.displayName}
                          className="w-14 h-14 rounded-xl ring-1 ring-neutral-700 shrink-0"
                          size={200}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white text-xs truncate group-hover:text-amber-400 transition-colors">
                              {fc.displayName}
                            </h3>
                            {fc.verified && (
                              <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {fc.roles[0] || 'Creative Professional'}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {fc.rating.toFixed(1)}
                            </span>
                            <span className="text-neutral-500">•</span>
                            <span className="text-neutral-300 font-bold">
                              From ৳{fc.startingPrice.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => handleSelectCreator(fc)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold transition-colors"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => handleStartBooking(fc)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-[11px] font-bold shadow transition-all"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Available Creators Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white font-['Space_Grotesk']">
                    Available Creators ({creators.length})
                  </h2>
                  <span className="text-xs text-neutral-500 hidden sm:inline">• Verified &amp; Vetted in Bangladesh</span>
                </div>
              </div>

              {/* Creators Grid */}
              {isLoadingCreators ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                  <p className="text-xs text-neutral-400">Loading verified creators...</p>
                </div>
              ) : creators.length === 0 ? (
                <div className="py-16 text-center rounded-3xl bg-neutral-900/60 border border-neutral-800 p-8 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-800/80 flex items-center justify-center mx-auto text-neutral-500">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      No creators available yet
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Become one of the first creators on CreatorFlow or adjust your search filters.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSelectedRole('all');
                        setSelectedCity('all');
                        setSearchQuery('');
                        setVerifiedOnly(false);
                        setMinRating(0);
                        setPriceRange('all');
                        setSortBy('rating');
                      }}
                      className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 hover:text-white font-semibold transition-colors"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => navigate('register', { role: 'creator' })}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-xs text-white font-bold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Become a Creator</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {creators.map((c) => (
                    <CreatorCard
                      key={c.creatorId}
                      creator={c}
                      onSelect={handleSelectCreator}
                      onBook={(creator) => handleStartBooking(creator)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW 3: HOW IT WORKS */}
        {currentView === 'how-it-works' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                Workflow &amp; Guarantees
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk']">
                How CreatorFlow Works
              </h1>
              <p className="text-sm text-neutral-400">
                A streamlined experience designed to make hiring visual talent seamless, transparent, and secure.
              </p>
            </div>

            {/* Split for Clients & Creators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* For Clients */}
              <div className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
                    C
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">For Clients &amp; Brands</h2>
                    <p className="text-xs text-neutral-400">Hiring creative talent without guesswork</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { step: '01', title: 'Discover Verified Creators', desc: 'Browse curated portfolios with authentic gear specs, past projects, and real client reviews.' },
                    { step: '02', title: 'Transparent Packages & Rates', desc: 'Choose clear packages with upfront pricing in ৳ BDT, turnaround times, and revision guarantees.' },
                    { step: '03', title: 'Schedule with Real-Time Calendar', desc: 'Reserve dates directly with synchronous calendar event verification and milestone escrow safety.' },
                    { step: '04', title: 'Direct Cloud Deliverables', desc: 'Receive high-res master files and project deliverables organized in dedicated cloud storage.' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <span className="font-mono text-xs font-bold text-rose-400 mt-1">{item.step}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate('register', { role: 'customer' })}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Create Client Account
                </button>
              </div>

              {/* For Creators */}
              <div className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    ★
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">For Visual Creators</h2>
                    <p className="text-xs text-neutral-400">Scale your freelance business with dignity</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { step: '01', title: 'Build Your Storefront', desc: 'Showcase your best films, photos, gear specs, and custom handle with 9-step instant setup.' },
                    { step: '02', title: 'Set Your Own Rates', desc: 'Define your starting price in ৳ BDT, multi-tiered packages, and terms without middleman interference.' },
                    { step: '03', title: 'Automated Calendar & Bookings', desc: 'Accept bookings synchronized with your Google Calendar to prevent scheduling overlaps.' },
                    { step: '04', title: 'Organized Client Folders', desc: 'Get automated Google Drive workspace folders created for each project and client upload.' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <span className="font-mono text-xs font-bold text-amber-400 mt-1">{item.step}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate('register', { role: 'creator' })}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Join as a Creator
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: CREATOR PROFILE */}
        {currentView === 'profile' && selectedCreator && profileData && (
          <CreatorProfileView
            creator={profileData.creator}
            portfolios={profileData.portfolios}
            services={profileData.services}
            packages={profileData.packages}
            reviews={profileData.reviews}
            availability={profileData.availability}
            session={session}
            onBack={() => navigate('explore')}
            onBook={(creator, pkg) => handleStartBooking(creator, pkg)}
            onMessage={(creator) => {
              navigate('dashboard', { tab: 'messages' });
            }}
            onOpenDashboard={(tab) => navigate('dashboard', { tab })}
            onProfileUpdate={(updatedCreator) => {
              setSelectedCreator(updatedCreator);
              setProfileData((prev) => (prev ? { ...prev, creator: updatedCreator } : null));
              setCreators((prev) =>
                prev.map((c) => (c.creatorId === updatedCreator.creatorId ? updatedCreator : c))
              );
              const curr = getStoredSession();
              if (curr) setSession(curr);
            }}
            onPortfolioUpdate={(newPortfolios) => {
              setProfileData((prev) => (prev ? { ...prev, portfolios: newPortfolios } : null));
            }}
          />
        )}

        {/* VIEW 5: DASHBOARD */}
        {currentView === 'dashboard' && session && (
          <DashboardView
            session={session}
            initialTab={dashboardTab}
            onOpenSetup={() => navigate('dev')}
            onGoHome={() => navigate('explore')}
            onViewPublicProfile={handleViewCreatorProfile}
            onNavigateTab={(tab) => navigate('dashboard', { tab })}
          />
        )}
      </main>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        creator={bookingCreator}
        selectedPackage={bookingPackage}
        session={session}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={handleBookingSuccess}
        onRequireAuth={() => {
          setIsBookingModalOpen(false);
          navigate('login');
        }}
      />

      {/* Auth Modal (Fallback if triggered) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(s) => {
          setSession(s);
          getNotifications().then((n) => setNotifications(n)).catch(() => {});
        }}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">CreatorFlow</span>
              <p className="text-[11px] text-neutral-500">Premium Creative Talent Marketplace</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-neutral-400">
            <button onClick={() => navigate('explore')} className="hover:text-white transition-colors">
              Explore Talent
            </button>
            <button onClick={() => navigate('how-it-works')} className="hover:text-white transition-colors">
              How It Works
            </button>
            <button onClick={() => navigate('register', { role: 'creator' })} className="hover:text-white transition-colors text-amber-400">
              Become a Creator
            </button>
          </div>

          <p className="text-[11px] text-neutral-600">
            &copy; {new Date().getFullYear()} CreatorFlow Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
