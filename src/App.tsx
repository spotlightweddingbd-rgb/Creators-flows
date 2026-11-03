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
  Layers,
  Compass,
  Sliders,
  LayoutGrid,
  List as ListIcon,
  Heart,
  Bookmark,
  MessageSquare,
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
import { GuestMessageModal } from './components/GuestMessageModal';
import { BookingAuthGateModal } from './components/BookingAuthGateModal';
import { FeaturedFreelancersMarquee } from './components/FeaturedFreelancersMarquee';
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
  validateSession,
  isLiveBackendConfigured,
  getSavedCreatorIds,
  toggleSaveCreatorId,
} from './services/api';
import { MOCK_CREATORS } from './data/mockData';

export const ROLE_CATEGORIES = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'photographer', label: 'Photographer', icon: Camera },
  { id: 'cinematographer', label: 'Cinematographer', icon: Film },
  { id: 'videographer', label: 'Videographer', icon: Video },
  { id: 'video_editor', label: 'Video Editor', icon: Scissors },
  { id: 'photo_editor', label: 'Photo Editor', icon: Sliders },
  { id: 'drone', label: 'Drone Operator', icon: Compass },
  { id: 'designer', label: 'Graphic Designer', icon: Palette },
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
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
  const [savedCreatorIds, setSavedCreatorIds] = useState<string[]>([]);
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

  // Guest messaging and booking authentication gate state
  const [guestMessageCreator, setGuestMessageCreator] = useState<Creator | null>(null);
  const [isGuestMessageModalOpen, setIsGuestMessageModalOpen] = useState(false);
  const [isBookingAuthGateOpen, setIsBookingAuthGateOpen] = useState(false);
  const [pendingBookingIntent, setPendingBookingIntent] = useState<{
    creator: Creator;
    pkg?: PackageItem;
  } | null>(null);

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

    // Read stored session and validate with backend
    const initSession = async () => {
      const stored = getStoredSession();
      if (!stored) return;
      try {
        const validated = await validateSession();
        if (validated) {
          setSession(validated);
        } else {
          setSession(null);
        }
      } catch (e) {
        setSession(null);
      }
    };
    initSession();

    const handleSessionUpdated = () => {
      const s = getStoredSession();
      if (s) setSession(s);
    };
    const handleCreatorsUpdated = () => {
      loadCreatorsList();
    };
    window.addEventListener('creatorflow:session-updated', handleSessionUpdated);
    window.addEventListener('creatorflow:creators-updated', handleCreatorsUpdated);

    loadCreatorsList();

    return () => {
      window.removeEventListener('hashchange', syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('creatorflow:session-updated', handleSessionUpdated);
      window.removeEventListener('creatorflow:creators-updated', handleCreatorsUpdated);
    };
  }, []);

  useEffect(() => {
    if (session) {
      getNotifications().then((n) => setNotifications(n)).catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    setSavedCreatorIds(getSavedCreatorIds());
    const handleSavedUpdated = (e: any) => {
      setSavedCreatorIds(e.detail || getSavedCreatorIds());
    };
    window.addEventListener('creatorflow:saved-updated', handleSavedUpdated);
    return () => {
      window.removeEventListener('creatorflow:saved-updated', handleSavedUpdated);
    };
  }, []);

  const handleToggleSave = (creator: Creator) => {
    if (!session) {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const updated = toggleSaveCreatorId(creator.creatorId);
    setSavedCreatorIds(updated);
  };

  const loadCreatorsList = async () => {
    setIsLoadingCreators(true);
    try {
      let list = await getCreators({
        role: selectedRole,
        city: selectedCity,
        query: searchQuery,
        sortBy,
        verifiedOnly,
        featuredOnly,
        availability: selectedAvailability,
        minRating,
        priceRange,
      });
      if (savedOnly) {
        const savedIds = getSavedCreatorIds();
        list = list.filter((c) => savedIds.includes(c.creatorId));
      }
      setCreators(list);
    } catch (e) {
      const fallback = isLiveBackendConfigured() ? [] : MOCK_CREATORS;
      let list = fallback;
      if (featuredOnly) list = list.filter((c) => c.featured);
      if (verifiedOnly) list = list.filter((c) => c.verified);
      if (savedOnly) {
        const savedIds = getSavedCreatorIds();
        list = list.filter((c) => savedIds.includes(c.creatorId));
      }
      setCreators(list);
    } finally {
      setIsLoadingCreators(false);
    }
  };

  useEffect(() => {
    loadCreatorsList();
  }, [selectedRole, selectedCity, selectedAvailability, sortBy, verifiedOnly, featuredOnly, savedOnly, minRating, priceRange]);

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
    if (!session) {
      setPendingBookingIntent({ creator, pkg });
      setIsBookingAuthGateOpen(true);
      return;
    }
    setBookingCreator(creator);
    setBookingPackage(pkg || null);
    setIsBookingModalOpen(true);
  };

  const handleMessageCreator = (creator: Creator) => {
    setGuestMessageCreator(creator);
    setIsGuestMessageModalOpen(true);
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
              if (pendingBookingIntent) {
                const intent = pendingBookingIntent;
                setPendingBookingIntent(null);
                handleViewCreatorProfile(intent.creator.username);
                setBookingCreator(intent.creator);
                setBookingPackage(intent.pkg || null);
                setIsBookingModalOpen(true);
              } else {
                navigate('dashboard', { tab: 'overview' });
              }
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
              if (pendingBookingIntent) {
                const intent = pendingBookingIntent;
                setPendingBookingIntent(null);
                handleViewCreatorProfile(intent.creator.username);
                setBookingCreator(intent.creator);
                setBookingPackage(intent.pkg || null);
                setIsBookingModalOpen(true);
              } else {
                navigate('dashboard', { tab: 'overview' });
              }
            }}
            onNavigateRegister={(role) => navigate('register', { role })}
            onNavigateHome={() => navigate('explore')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-rose-500 selection:text-white">
      {/* 1. NAVBAR */}
      <Navbar
        session={session}
        notifications={notifications}
        savedCount={savedCreatorIds.length}
        onOpenSaved={() => {
          setSavedOnly(true);
          const gridEl = document.getElementById('all-freelancers-grid-section');
          if (gridEl) {
            gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
        onOpenAuth={(mode = 'login') => navigate(mode === 'login' ? 'login' : 'register')}
        onOpenDashboard={(tab = 'bookings') => navigate('dashboard', { tab })}
        onSelectCreator={handleViewCreatorProfile}
        onGoHome={() => {
          setSavedOnly(false);
          navigate('explore');
        }}
        onNavigateExplore={() => {
          setSavedOnly(false);
          navigate('explore');
        }}
        onNavigateHowItWorks={() => {
          const el = document.getElementById('how-it-works-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            navigate('how-it-works');
          }
        }}
        onNavigateLogin={() => navigate('login')}
        onNavigateRegister={(role) => navigate('register', { role })}
        onViewPublicProfile={handleViewCreatorProfile}
      />

      {/* Success Toast Notification */}
      {bookingToast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-[#171A22] border border-emerald-500/40 text-emerald-300 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 max-w-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-white">Booking Confirmed</p>
            <p className="text-white/60 mt-0.5">{bookingToast}</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW 1: EXPLORE / MAIN MARKETPLACE (/) */}
        {currentView === 'explore' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10 pb-24">
            {/* 2. HERO / SEARCH SECTION */}
            <section className="relative rounded-3xl bg-[#11141B] border border-white/[0.08] overflow-hidden p-6 sm:p-10 lg:p-12 shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Column: Heading, Eyebrow, Subtext, Real Stats */}
                <div className="lg:col-span-7 space-y-4 sm:space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs font-semibold tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 animate-pulse" />
                    <span>Independent Creative Talent</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-['Space_Grotesk'] tracking-tight leading-[1.12]">
                    Find Creative Professionals Across{' '}
                    <span className="bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 bg-clip-text text-transparent">
                      Bangladesh
                    </span>
                  </h1>

                  <p className="text-sm sm:text-base text-white/60 max-w-xl leading-relaxed">
                    Hire photographers, cinematographers, editors and other independent freelancers for your next project.
                  </p>

                  {/* Real Backend Stats (Genuine numbers only - Rule 29) */}
                  <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/60">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-black text-white font-['Space_Grotesk']">
                        {creators.length}
                      </span>
                      <span className="text-white/50">Creative Freelancers</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-black text-sky-400 font-['Space_Grotesk']">
                        {creators.filter((c) => c.verified).length}
                      </span>
                      <span className="text-white/50">Verified Talent</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-black text-amber-400 font-['Space_Grotesk']">
                        {creators.filter((c) => c.featured).length}
                      </span>
                      <span className="text-white/50">Featured Curations</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Hero Visual (Cinematic, working outdoors, dark overlay) */}
                <div className="lg:col-span-5 relative">
                  <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[16/11] border border-white/[0.08] shadow-2xl bg-[#0B0D12]">
                    <img
                      src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80"
                      alt="Cinematographer operating camera on location"
                      className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.05]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#11141B] via-[#11141B]/30 to-transparent" />

                    {/* Subtle Live Badge */}
                    <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-[#0B0D12]/80 backdrop-blur-md border border-white/[0.08] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-white">Direct Freelancer Discovery</span>
                      </div>
                      <span className="text-[11px] text-white/50 font-mono">SpotlightPhotography</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Large Search Bar below hero text */}
              <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-white/[0.08]">
                <form
                  onSubmit={handleSearchSubmit}
                  className="relative flex items-center w-full rounded-2xl bg-[#171A22] border border-white/[0.08] hover:border-white/[0.16] focus-within:border-amber-500/50 p-1.5 sm:p-2 shadow-2xl transition-all"
                >
                  <Search className="w-5 h-5 text-white/40 ml-3 shrink-0" />
                  <input
                    id="marketplace-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search freelancers by name, role, skill or location (e.g. Wedding, Drone, Dhaka...)"
                    className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 rounded-lg text-white/40 hover:text-white mr-1.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 sm:px-7 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Search</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </section>

            {/* 3. PRIMARY ROLE FILTERS */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                {ROLE_CATEGORIES.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#171A22] text-white border border-amber-500/60 shadow-md shadow-amber-500/10'
                          : 'bg-[#171A22] text-white/60 hover:text-white border border-white/[0.08] hover:border-white/[0.16]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-white/40'}`} />
                      <span>{role.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. SECONDARY FILTERS */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Location */}
              <div className="flex items-center gap-1.5 bg-[#171A22] border border-white/[0.08] rounded-xl px-3 h-10">
                <MapPin className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/40">Location:</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="bg-[#171A22]">All Bangladesh</option>
                  <option value="Dhaka" className="bg-[#171A22]">Dhaka</option>
                  <option value="Chattogram" className="bg-[#171A22]">Chattogram</option>
                  <option value="Sylhet" className="bg-[#171A22]">Sylhet</option>
                  <option value="Rajshahi" className="bg-[#171A22]">Rajshahi</option>
                  <option value="Khulna" className="bg-[#171A22]">Khulna</option>
                </select>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5 bg-[#171A22] border border-white/[0.08] rounded-xl px-3 h-10">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white/40">Rating:</span>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value={0} className="bg-[#171A22]">All Ratings</option>
                  <option value={4.8} className="bg-[#171A22]">★ 4.8+</option>
                  <option value={4.5} className="bg-[#171A22]">★ 4.5+</option>
                  <option value={4.0} className="bg-[#171A22]">★ 4.0+</option>
                </select>
              </div>

              {/* Budget */}
              <div className="flex items-center gap-1.5 bg-[#171A22] border border-white/[0.08] rounded-xl px-3 h-10">
                <span className="text-white/40">Budget:</span>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="bg-[#171A22]">All Budgets</option>
                  <option value="under_20k" className="bg-[#171A22]">Under ৳20,000</option>
                  <option value="20k_40k" className="bg-[#171A22]">৳20,000 - ৳40,000</option>
                  <option value="above_40k" className="bg-[#171A22]">৳40,000+</option>
                </select>
              </div>

              {/* Availability */}
              <div className="flex items-center gap-1.5 bg-[#171A22] border border-white/[0.08] rounded-xl px-3 h-10">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white/40">Availability:</span>
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="bg-[#171A22]">All Statuses</option>
                  <option value="Available" className="bg-[#171A22]">Available</option>
                  <option value="Limited" className="bg-[#171A22]">Limited</option>
                  <option value="Busy" className="bg-[#171A22]">Busy</option>
                  <option value="Unavailable" className="bg-[#171A22]">Unavailable</option>
                </select>
              </div>

              {/* Verified Only */}
              <button
                type="button"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`flex items-center gap-1.5 px-3 h-10 rounded-xl border transition-colors cursor-pointer ${
                  verifiedOnly
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-400 font-semibold'
                    : 'bg-[#171A22] border-white/[0.08] text-white/60 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Only</span>
              </button>

              {/* Featured Only */}
              <button
                type="button"
                onClick={() => setFeaturedOnly(!featuredOnly)}
                className={`flex items-center gap-1.5 px-3 h-10 rounded-xl border transition-colors cursor-pointer ${
                  featuredOnly
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-semibold'
                    : 'bg-[#171A22] border-white/[0.08] text-white/60 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Featured Only</span>
              </button>

              {/* Saved Only Filter */}
              {savedCreatorIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSavedOnly(!savedOnly)}
                  className={`flex items-center gap-1.5 px-3 h-10 rounded-xl border transition-colors cursor-pointer ${
                    savedOnly
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 font-semibold'
                      : 'bg-[#171A22] border-white/[0.08] text-white/60 hover:text-white'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${savedOnly ? 'fill-rose-400' : ''}`} />
                  <span>Saved ({savedCreatorIds.length})</span>
                </button>
              )}

              {/* Sort */}
              <div className="flex items-center gap-1.5 bg-[#171A22] border border-white/[0.08] rounded-xl px-3 h-10 sm:ml-auto">
                <span className="text-white/40">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="rating" className="bg-[#171A22]">Top Rated</option>
                  <option value="newest" className="bg-[#171A22]">Newest</option>
                  <option value="price_asc" className="bg-[#171A22]">Price: Low to High</option>
                  <option value="price_desc" className="bg-[#171A22]">Price: High to Low</option>
                </select>
              </div>

              {/* Clear All */}
              {(selectedRole !== 'all' || selectedCity !== 'all' || selectedAvailability !== 'all' || verifiedOnly || featuredOnly || savedOnly || minRating > 0 || priceRange !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('all');
                    setSelectedCity('all');
                    setSelectedAvailability('all');
                    setSearchQuery('');
                    setVerifiedOnly(false);
                    setFeaturedOnly(false);
                    setSavedOnly(false);
                    setMinRating(0);
                    setPriceRange('all');
                    setSortBy('rating');
                  }}
                  className="text-white/40 hover:text-white underline underline-offset-2 px-2 text-xs cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* 5. FEATURED FREELANCERS SECTION */}
            <FeaturedFreelancersMarquee
              creators={creators}
              onSelectCreator={handleSelectCreator}
              onViewAll={() => {
                const gridEl = document.getElementById('all-freelancers-grid-section');
                if (gridEl) {
                  gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            />

            {/* 6. HOW IT WORKS (COMPACT HORIZONTAL SECTION) */}
            <section id="how-it-works-section" className="rounded-3xl bg-[#11141B] border border-white/[0.08] p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/[0.06] pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-['Space_Grotesk'] tracking-tight">
                    How It Works
                  </h2>
                  <p className="text-xs sm:text-sm text-white/60 mt-0.5">
                    Hire the right creative in a few simple steps.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Step 1 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#171A22] border border-white/[0.08] space-y-3 relative group hover:border-white/[0.18] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400 font-mono">01</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">Find a Freelancer</h3>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      Search and explore talent. Filter by role, city, rating and verified credentials.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#171A22] border border-white/[0.08] space-y-3 relative group hover:border-white/[0.18] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-400 font-mono">02</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">Send a Project Request</h3>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      Share your project brief, preferred shoot dates, and deliverable requirements.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#171A22] border border-white/[0.08] space-y-3 relative group hover:border-white/[0.18] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-400 font-mono">03</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">Confirm &amp; Collaborate</h3>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      Agree on schedule and deliverables, book and start working together directly.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#171A22] border border-white/[0.08] space-y-3 relative group hover:border-white/[0.18] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 font-mono">04</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Star className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">Receive &amp; Review</h3>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      Receive delivery files via Drive and leave an authentic review for the freelancer.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. ALL FREELANCERS SECTION */}
            <section id="all-freelancers-grid-section" className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white font-['Space_Grotesk'] tracking-tight">
                      All Freelancers ({creators.length})
                    </h2>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">
                    Browse all available independent creatives across Bangladesh.
                  </p>
                </div>

                {/* Grid / List view toggle */}
                <div className="flex items-center gap-1 bg-[#171A22] border border-white/[0.08] p-1 rounded-xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setViewLayout('grid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewLayout === 'grid'
                        ? 'bg-white text-black shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewLayout('list')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewLayout === 'list'
                        ? 'bg-white text-black shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                    title="List View"
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>
                </div>
              </div>

              {/* Creators Grid / List Container */}
              {isLoadingCreators ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                  <p className="text-xs text-white/60">Loading freelancers from database...</p>
                </div>
              ) : creators.length === 0 ? (
                <div className="py-16 text-center rounded-3xl bg-[#11141B] border border-white/[0.08] p-8 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#171A22] border border-white/[0.08] flex items-center justify-center mx-auto text-white/40">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      No freelancers match your criteria
                    </h3>
                    <p className="text-xs text-white/60">
                      Try resetting your search query or adjusting your filters.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSelectedRole('all');
                        setSelectedCity('all');
                        setSelectedAvailability('all');
                        setSearchQuery('');
                        setVerifiedOnly(false);
                        setFeaturedOnly(false);
                        setSavedOnly(false);
                        setMinRating(0);
                        setPriceRange('all');
                        setSortBy('rating');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#171A22] hover:bg-[#1E222D] text-xs text-white/80 hover:text-white border border-white/[0.08] font-semibold transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => navigate('register', { role: 'creator' })}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 hover:from-rose-600 hover:to-amber-600 text-xs text-white font-bold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Join as Freelancer</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={
                    viewLayout === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                      : 'space-y-3.5'
                  }
                >
                  {creators.map((c) => (
                    <CreatorCard
                      key={c.creatorId}
                      creator={c}
                      layout={viewLayout}
                      isSaved={savedCreatorIds.includes(c.creatorId)}
                      onToggleSave={handleToggleSave}
                      onSelect={handleSelectCreator}
                      onBook={(creator) => handleStartBooking(creator)}
                      onMessage={(creator) => handleMessageCreator(creator)}
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
            onMessage={(creator) => handleMessageCreator(creator)}
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

      {/* Guest Message Modal (Public inquiries without account creation) */}
      <GuestMessageModal
        isOpen={isGuestMessageModalOpen}
        creator={guestMessageCreator}
        sessionUser={session?.user || null}
        onClose={() => {
          setIsGuestMessageModalOpen(false);
          setGuestMessageCreator(null);
        }}
        onOpenBookingGate={() => {
          const c = guestMessageCreator;
          setIsGuestMessageModalOpen(false);
          if (c) {
            handleStartBooking(c);
          }
        }}
      />

      {/* Booking Auth Gate Modal (Enforces registered client account for booking requests) */}
      <BookingAuthGateModal
        isOpen={isBookingAuthGateOpen}
        creator={pendingBookingIntent?.creator || null}
        selectedPackage={pendingBookingIntent?.pkg || null}
        onClose={() => {
          setIsBookingAuthGateOpen(false);
          setPendingBookingIntent(null);
        }}
        onNavigateLogin={() => {
          setIsBookingAuthGateOpen(false);
          navigate('login');
        }}
        onNavigateRegister={() => {
          setIsBookingAuthGateOpen(false);
          navigate('register', { role: 'customer' });
        }}
        onSwitchToMessage={() => {
          const c = pendingBookingIntent?.creator;
          setIsBookingAuthGateOpen(false);
          setPendingBookingIntent(null);
          if (c) {
            handleMessageCreator(c);
          }
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
