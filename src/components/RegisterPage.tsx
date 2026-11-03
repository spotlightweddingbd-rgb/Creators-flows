/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Camera,
  Film,
  Video,
  Scissors,
  Sparkles,
  Plane,
  Palette,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  MapPin,
  DollarSign,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Calendar,
  Clock,
  Plus,
  X,
  Eye,
  Check,
  ShieldCheck,
} from 'lucide-react';
import {
  registerCustomer,
  registerCreator,
  checkUsername,
  CreatorRegistrationPayload,
} from '../services/api';
import { SafeAvatar, SafeCover, normalizeGoogleDriveImageUrl } from '../utils/imageUtils';
import { AuthSession } from '../types';

interface RegisterPageProps {
  onSuccess: (session: AuthSession, targetPath?: string) => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
  initialRole?: 'customer' | 'creator';
}

const STORAGE_DRAFT_KEY = 'creatorflow_creator_onboarding_draft';

const CREATOR_ROLES_LIST = [
  { id: 'photographer', label: 'Photographer', icon: Camera, desc: 'Events, weddings, portraits, commercial shoots' },
  { id: 'cinematographer', label: 'Cinematographer', icon: Film, desc: 'Films, music videos, narrative storytelling' },
  { id: 'videographer', label: 'Videographer', icon: Video, desc: 'Social content, brand promos, live event coverage' },
  { id: 'video_editor', label: 'Video Editor', icon: Scissors, desc: 'Pacing, sound design, YouTube & commercial edits' },
  { id: 'photo_editor', label: 'Photo Editor', icon: Palette, desc: 'Batch grading, lightroom development, curation' },
  { id: 'retoucher', label: 'Retoucher', icon: Sparkles, desc: 'High-end beauty, fashion, and product retouching' },
  { id: 'drone_operator', label: 'Drone Operator', icon: Plane, desc: 'Aerial cinematography, real estate, landscapes' },
  { id: 'graphic_designer', label: 'Graphic Designer', icon: Palette, desc: 'Thumbnails, key visuals, motion graphic assets' },
  { id: 'other', label: 'Other Visual Artist', icon: Sparkles, desc: 'Creative director, lighting specialist, etc.' },
];

const POPULAR_CITIES = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Comilla'];

const INITIAL_CREATOR_DRAFT = {
  step: 1,
  // Step 1: Account
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  // Step 2: Roles
  roles: [] as string[],
  // Step 3: Profile
  displayName: '',
  username: '',
  bio: '',
  city: 'Dhaka',
  district: '',
  country: 'Bangladesh',
  serviceAreas: ['Dhaka'],
  profileImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
  coverImageUrl: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1600&q=80',
  // Step 4: Professional Details
  experienceYears: 3,
  skills: ['Color Grading', 'Lighting', 'Direction'],
  languages: ['Bengali', 'English'],
  equipment: ['Sony FX3 / A7IV', 'G Master Lenses', 'Gimbal'],
  startingPrice: 15000,
  // Step 5: Socials
  facebook: '',
  instagram: '',
  youtube: '',
  tiktok: '',
  linkedin: '',
  website: '',
  // Step 6: Portfolio
  portfolioItems: [
    {
      title: 'Cinematic Fashion Showcase',
      description: 'Golden hour outdoor editorial shoot with natural light.',
      category: 'photography' as 'photography' | 'cinematography' | 'editing',
      fileUrl: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1200&q=80',
    },
  ],
  // Step 7: Services
  firstService: {
    title: 'Full Day Event & Portrait Coverage',
    category: 'Event & Portrait',
    description: 'Comprehensive 8-hour coverage with high-resolution deliverables.',
    startingPrice: 20000,
    deliveryTime: '5-7 days',
    packages: [
      { name: 'Basic', description: '4 hours shoot, 100 edited photos', price: 15000, duration: '4 Hours', revisions: 1 },
      { name: 'Standard', description: '8 hours shoot, 250 edited photos + 1 min teaser', price: 25000, duration: '8 Hours', revisions: 2 },
      { name: 'Premium', description: 'Full day + drone + 500 photos + 3 min film', price: 45000, duration: '12 Hours', revisions: 3 },
    ],
  },
  // Step 8: Availability
  workingDays: ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday'],
  availableHoursStart: '09:00',
  availableHoursEnd: '19:00',
  unavailableDates: [] as string[],
};

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSuccess,
  onNavigateLogin,
  onNavigateHome,
  initialRole,
}) => {
  const [accountType, setAccountType] = useState<'customer' | 'creator' | null>(initialRole || null);

  // Customer State
  const [custFullName, setCustFullName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [custConfirmPassword, setCustConfirmPassword] = useState('');
  const [custAgreeTerms, setCustAgreeTerms] = useState(false);
  const [custLoading, setCustLoading] = useState(false);
  const [custErrors, setCustErrors] = useState<Record<string, string>>({});

  // Creator State (Wizard)
  const [creatorState, setCreatorState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DRAFT_KEY);
      if (saved) {
        return { ...INITIAL_CREATOR_DRAFT, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return INITIAL_CREATOR_DRAFT;
  });

  const [creatorErrors, setCreatorErrors] = useState<Record<string, string>>({});
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [skillInput, setSkillInput] = useState('');
  const [equipmentInput, setEquipmentInput] = useState('');
  const [isSubmittingCreator, setIsSubmittingCreator] = useState(false);

  // Auto-save creator onboarding draft
  useEffect(() => {
    if (accountType === 'creator') {
      try {
        localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(creatorState));
      } catch (e) {}
    }
  }, [creatorState, accountType]);

  // Username suggestion and debounced availability check
  const handleDisplayNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
      ...prev,
      displayName: name,
      username: prev.username ? prev.username : slug,
    }));

    if (slug.length >= 3) {
      triggerUsernameCheck(slug);
    }
  };

  const triggerUsernameCheck = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res = await checkUsername(username);
      setUsernameStatus(res.available ? 'available' : 'taken');
    } catch (e) {
      setUsernameStatus('available');
    }
  };

  // --------------------------------------------------------------------------
  // Customer Registration Submission
  // --------------------------------------------------------------------------
  const validateCustomerForm = () => {
    const errors: Record<string, string> = {};
    if (!custFullName.trim()) errors.fullName = 'Full Name is required.';
    if (!custEmail.trim() || !custEmail.includes('@')) errors.email = 'Please provide a valid email address.';
    if (!custPhone.trim()) errors.phone = 'Phone number is required.';
    if (!custPassword || custPassword.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (custPassword !== custConfirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!custAgreeTerms) errors.terms = 'You must agree to the Terms & Privacy Policy.';
    setCustErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCustomerForm()) return;

    setCustLoading(true);
    setCustErrors({});

    try {
      const session = await registerCustomer({
        fullName: custFullName.trim(),
        email: custEmail.trim().toLowerCase(),
        phone: custPhone.trim(),
        password: custPassword,
      });

      onSuccess(session, '/customer/dashboard');
    } catch (err: any) {
      setCustErrors({ form: err.message || 'Registration could not be completed. Please try again.' });
    } finally {
      setCustLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Creator Multi-Step Validation & Navigation
  // --------------------------------------------------------------------------
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!creatorState.fullName.trim()) errors.fullName = 'Full name is required.';
      if (!creatorState.email.trim() || !creatorState.email.includes('@')) errors.email = 'Valid email is required.';
      if (!creatorState.phone.trim()) errors.phone = 'Phone number is required.';
      if (!creatorState.password || creatorState.password.length < 6) errors.password = 'Password must be at least 6 characters.';
      if (creatorState.password !== creatorState.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    } else if (step === 2) {
      if (!creatorState.roles || creatorState.roles.length === 0) {
        errors.roles = 'Please select at least one creative role.';
      }
    } else if (step === 3) {
      if (!creatorState.displayName.trim()) errors.displayName = 'Display name is required.';
      if (!creatorState.username.trim() || creatorState.username.length < 3) errors.username = 'Username must be at least 3 characters.';
      if (usernameStatus === 'taken') errors.username = 'Username is already taken by another creator.';
      if (!creatorState.city.trim()) errors.city = 'Please select your primary city.';
    } else if (step === 4) {
      if (!creatorState.startingPrice || creatorState.startingPrice <= 0) {
        errors.startingPrice = 'Please set your starting rate in ৳ BDT.';
      }
    }

    setCreatorErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(creatorState.step)) {
      setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
        ...prev,
        step: Math.min(prev.step + 1, 9),
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
      ...prev,
      step: Math.max(prev.step - 1, 1),
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublishCreator = async () => {
    setIsSubmittingCreator(true);
    setCreatorErrors({});

    try {
      const payload: CreatorRegistrationPayload = {
        displayName: creatorState.displayName || creatorState.fullName,
        username: creatorState.username,
        email: creatorState.email.toLowerCase().trim(),
        phone: creatorState.phone,
        password: creatorState.password,
        roles: creatorState.roles,
        bio: creatorState.bio,
        profileImageUrl: creatorState.profileImageUrl,
        coverImageUrl: creatorState.coverImageUrl,
        city: creatorState.city,
        district: creatorState.district,
        country: creatorState.country,
        serviceAreas: creatorState.serviceAreas,
        experienceYears: Number(creatorState.experienceYears) || 3,
        skills: creatorState.skills,
        languages: creatorState.languages,
        equipment: creatorState.equipment,
        startingPrice: Number(creatorState.startingPrice) || 15000,
        facebook: creatorState.facebook,
        instagram: creatorState.instagram,
        youtube: creatorState.youtube,
        tiktok: creatorState.tiktok,
        linkedin: creatorState.linkedin,
        website: creatorState.website,
        initialPortfolio: creatorState.portfolioItems,
        initialService: creatorState.firstService,
        initialAvailability: {
          workingDays: creatorState.workingDays,
          availableHours: {
            start: creatorState.availableHoursStart,
            end: creatorState.availableHoursEnd,
          },
          unavailableDates: creatorState.unavailableDates,
        },
      };

      const session = await registerCreator(payload);

      // Clear draft on successful publishing
      localStorage.removeItem(STORAGE_DRAFT_KEY);

      onSuccess(session, '/creator/dashboard');
    } catch (err: any) {
      setCreatorErrors({ publish: err.message || 'Could not complete registration. Please check your information.' });
    } finally {
      setIsSubmittingCreator(false);
    }
  };

  // --------------------------------------------------------------------------
  // VIEW: ACCOUNT TYPE SELECTION
  // --------------------------------------------------------------------------
  if (!accountType) {
    return (
      <div className="min-h-screen bg-neutral-950 py-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Join CreatorFlow
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
              Create Your Account
            </h1>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              Select how you want to use the marketplace to get started.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
            {/* Card 1: Customer */}
            <button
              onClick={() => setAccountType('customer')}
              className="p-8 rounded-3xl bg-neutral-900/80 hover:bg-neutral-900 border-2 border-neutral-800 hover:border-rose-500/60 text-left transition-all duration-300 group hover:shadow-2xl hover:shadow-rose-500/10 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-neutral-800 group-hover:bg-rose-500/20 border border-neutral-700 group-hover:border-rose-500/30 flex items-center justify-center transition-colors mb-6">
                  <Briefcase className="w-7 h-7 text-neutral-300 group-hover:text-rose-400 transition-colors" />
                </div>
                <span className="text-xs font-bold text-rose-400 tracking-wider uppercase block mb-1">
                  I want to hire
                </span>
                <h3 className="text-xl font-bold text-white mb-2 font-['Space_Grotesk']">
                  Customer / Client
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Discover and hire vetted photographers, cinematographers, and editors for events, brands, or private sessions.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-rose-400 group-hover:translate-x-1 transition-transform">
                <span>Continue as Client</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            {/* Card 2: Creator */}
            <button
              onClick={() => setAccountType('creator')}
              className="p-8 rounded-3xl bg-neutral-900/80 hover:bg-neutral-900 border-2 border-neutral-800 hover:border-amber-500/60 text-left transition-all duration-300 group hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-neutral-800 group-hover:bg-amber-500/20 border border-neutral-700 group-hover:border-amber-500/30 flex items-center justify-center transition-colors mb-6">
                  <Camera className="w-7 h-7 text-neutral-300 group-hover:text-amber-400 transition-colors" />
                </div>
                <span className="text-xs font-bold text-amber-400 tracking-wider uppercase block mb-1">
                  I want to work
                </span>
                <h3 className="text-xl font-bold text-white mb-2 font-['Space_Grotesk']">
                  Creator / Freelancer
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Build your verified portfolio, set your rates in ৳ BDT, manage your booking calendar, and receive client inquiries.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>Start Creator Onboarding</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          <div className="pt-6 text-xs text-neutral-500">
            Already have an account?{' '}
            <button
              onClick={onNavigateLogin}
              className="text-white hover:text-rose-400 font-semibold underline underline-offset-4 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: CUSTOMER REGISTRATION
  // --------------------------------------------------------------------------
  if (accountType === 'customer') {
    return (
      <div className="min-h-screen bg-neutral-950 py-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <div className="max-w-md w-full space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setAccountType(null)}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Account Types
            </button>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
              Client Account
            </span>
          </div>

          <div className="p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                Create Customer Account
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Book verified creators and manage milestone deliverables.
              </p>
            </div>

            {custErrors.form && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{custErrors.form}</span>
              </div>
            )}

            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={custFullName}
                    onChange={(e) => setCustFullName(e.target.value)}
                    placeholder="e.g. Mahir Faisal"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border ${
                      custErrors.fullName ? 'border-rose-500' : 'border-neutral-800'
                    } text-sm text-white focus:outline-none focus:border-rose-500 transition-colors`}
                  />
                </div>
                {custErrors.fullName && <p className="text-[11px] text-rose-400 mt-1">{custErrors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border ${
                      custErrors.email ? 'border-rose-500' : 'border-neutral-800'
                    } text-sm text-white focus:outline-none focus:border-rose-500 transition-colors`}
                  />
                </div>
                {custErrors.email && <p className="text-[11px] text-rose-400 mt-1">{custErrors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="+880 1712 345678"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border ${
                      custErrors.phone ? 'border-rose-500' : 'border-neutral-800'
                    } text-sm text-white focus:outline-none focus:border-rose-500 transition-colors`}
                  />
                </div>
                {custErrors.phone && <p className="text-[11px] text-rose-400 mt-1">{custErrors.phone}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border ${
                      custErrors.password ? 'border-rose-500' : 'border-neutral-800'
                    } text-sm text-white focus:outline-none focus:border-rose-500 transition-colors`}
                  />
                </div>
                {custErrors.password && <p className="text-[11px] text-rose-400 mt-1">{custErrors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={custConfirmPassword}
                    onChange={(e) => setCustConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border ${
                      custErrors.confirmPassword ? 'border-rose-500' : 'border-neutral-800'
                    } text-sm text-white focus:outline-none focus:border-rose-500 transition-colors`}
                  />
                </div>
                {custErrors.confirmPassword && (
                  <p className="text-[11px] text-rose-400 mt-1">{custErrors.confirmPassword}</p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={custAgreeTerms}
                    onChange={(e) => setCustAgreeTerms(e.target.checked)}
                    className="mt-1 rounded bg-neutral-950 border-neutral-700 text-rose-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-neutral-400">
                    I agree to the CreatorFlow{' '}
                    <span className="text-neutral-200 underline">Terms of Service</span> and{' '}
                    <span className="text-neutral-200 underline">Privacy Policy</span>.
                  </span>
                </label>
                {custErrors.terms && <p className="text-[11px] text-rose-400 mt-1">{custErrors.terms}</p>}
              </div>

              <button
                type="submit"
                disabled={custLoading}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                {custLoading ? 'Creating Account...' : 'Create Customer Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-neutral-500">
              Already have an account?{' '}
              <button
                onClick={onNavigateLogin}
                className="text-white hover:text-rose-400 font-semibold underline underline-offset-4"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: CREATOR MULTI-STEP ONBOARDING WIZARD (STEPS 1 - 9)
  // --------------------------------------------------------------------------
  const stepTitles = [
    'Account Credentials',
    'Creative Roles',
    'Public Profile',
    'Experience & Rates',
    'Social Presence',
    'Initial Portfolio',
    'Services & Pricing',
    'Working Availability',
    'Review & Publish',
  ];

  return (
    <div className="min-h-screen bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header / Stepper Progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (creatorState.step === 1) {
                  setAccountType(null);
                } else {
                  prevStep();
                }
              }}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {creatorState.step === 1 ? 'Switch Account Type' : 'Previous Step'}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                Step {creatorState.step} of 9
              </span>
              <span className="text-xs text-neutral-400 hidden sm:inline">• Draft Saved Automatically</span>
            </div>
          </div>

          {/* Stepper Bar */}
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300"
                style={{ width: `${(creatorState.step / 9) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span className="font-semibold text-neutral-300">
                {creatorState.step}. {stepTitles[creatorState.step - 1]}
              </span>
              <span>Next: {creatorState.step < 9 ? stepTitles[creatorState.step] : 'Complete'}</span>
            </div>
          </div>
        </div>

        {/* Wizard Container Card */}
        <div className="p-6 sm:p-10 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl">
          {/* STEP 1: ACCOUNT */}
          {creatorState.step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  STEP 1 — ACCOUNT
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Enter your core contact and security credentials for your Creator workspace.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Full Legal Name</label>
                  <input
                    type="text"
                    value={creatorState.fullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
                        ...prev,
                        fullName: val,
                        displayName: prev.displayName || val,
                      }));
                      handleDisplayNameChange(val);
                    }}
                    placeholder="e.g. Fardin Ahmed"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  {creatorErrors.fullName && <p className="text-[11px] text-rose-400 mt-1">{creatorErrors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={creatorState.email}
                    onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, email: e.target.value }))}
                    placeholder="fardin@studio.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  {creatorErrors.email && <p className="text-[11px] text-rose-400 mt-1">{creatorErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={creatorState.phone}
                    onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+880 1700 000000"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  {creatorErrors.phone && <p className="text-[11px] text-rose-400 mt-1">{creatorErrors.phone}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Password</label>
                    <input
                      type="password"
                      value={creatorState.password}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    {creatorErrors.password && <p className="text-[11px] text-rose-400 mt-1">{creatorErrors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={creatorState.confirmPassword}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    {creatorErrors.confirmPassword && (
                      <p className="text-[11px] text-rose-400 mt-1">{creatorErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROFESSIONAL ROLE */}
          {creatorState.step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  STEP 2 — PROFESSIONAL ROLE
                </h2>
                <h3 className="text-sm font-semibold text-amber-400 mt-1">What do you do?</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Select all that apply. You can offer multiple specialized disciplines on your single profile.
                </p>
              </div>

              {creatorErrors.roles && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
                  {creatorErrors.roles}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {CREATOR_ROLES_LIST.map((role) => {
                  const Icon = role.icon;
                  const isSelected = creatorState.roles.includes(role.label);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => {
                          const exists = prev.roles.includes(role.label);
                          const updated = exists
                            ? prev.roles.filter((r) => r !== role.label)
                            : [...prev.roles, role.label];
                          return { ...prev, roles: updated };
                        });
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-amber-500 text-black' : 'bg-neutral-900 text-neutral-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{role.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{role.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: PROFILE */}
          {creatorState.step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  STEP 3 — PROFILE
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Configure your public marketplace storefront, handle, and service areas.
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Display Name */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={creatorState.displayName}
                      onChange={(e) => handleDisplayNameChange(e.target.value)}
                      placeholder="e.g. Fardin Ahmed"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    {creatorErrors.displayName && (
                      <p className="text-[11px] text-rose-400 mt-1">{creatorErrors.displayName}</p>
                    )}
                  </div>

                  {/* Unique Username */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Unique Handle / Username</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs text-neutral-500 font-mono">@</span>
                      <input
                        type="text"
                        value={creatorState.username}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                          setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, username: val }));
                          triggerUsernameCheck(val);
                        }}
                        placeholder="fardin-ahmed"
                        className="w-full pl-8 pr-24 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <div className="absolute right-3 top-2.5 text-[11px] font-semibold">
                        {usernameStatus === 'checking' && (
                          <span className="text-neutral-400 animate-pulse">Checking...</span>
                        )}
                        {usernameStatus === 'available' && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Available
                          </span>
                        )}
                        {usernameStatus === 'taken' && (
                          <span className="text-rose-400 flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Taken
                          </span>
                        )}
                      </div>
                    </div>
                    {creatorErrors.username && (
                      <p className="text-[11px] text-rose-400 mt-1">{creatorErrors.username}</p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Bio / Creative Statement</label>
                  <textarea
                    rows={3}
                    value={creatorState.bio}
                    onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell clients about your aesthetic, directing experience, and production capabilities..."
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Locations */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Country</label>
                    <input
                      type="text"
                      disabled
                      value={creatorState.country}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800 text-sm text-neutral-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Primary City</label>
                    <select
                      value={creatorState.city}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {POPULAR_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">District / Area</label>
                    <input
                      type="text"
                      value={creatorState.district}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, district: e.target.value }))}
                      placeholder="e.g. Gulshan, Dhanmondi"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Profile & Cover Images */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Profile Photo (URL)</label>
                    <div className="flex items-center gap-3">
                      <SafeAvatar
                        src={creatorState.profileImageUrl}
                        name={creatorState.displayName || creatorState.fullName}
                        className="w-12 h-12 rounded-xl ring-1 ring-neutral-700"
                        size={400}
                      />
                      <input
                        type="text"
                        value={creatorState.profileImageUrl}
                        onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, profileImageUrl: e.target.value }))}
                        className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Cover Banner (URL)</label>
                    <input
                      type="text"
                      value={creatorState.coverImageUrl}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, coverImageUrl: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PROFESSIONAL DETAILS */}
          {creatorState.step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  STEP 4 — PROFESSIONAL DETAILS
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Specify your industry experience, gear, and baseline rate in ৳ BDT.
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Years of experience */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Years of Experience</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={creatorState.experienceYears}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, experienceYears: Number(e.target.value) }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Starting Rate in BDT */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Starting Rate (<span className="text-amber-400 font-bold">৳ BDT</span>)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-amber-400">৳</span>
                      <input
                        type="number"
                        step={500}
                        min={1000}
                        value={creatorState.startingPrice}
                        onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, startingPrice: Number(e.target.value) }))}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    {creatorErrors.startingPrice && (
                      <p className="text-[11px] text-rose-400 mt-1">{creatorErrors.startingPrice}</p>
                    )}
                  </div>
                </div>

                {/* Skills tags */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Skills &amp; Specialties</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (skillInput.trim() && !creatorState.skills.includes(skillInput.trim())) {
                            setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
                              ...prev,
                              skills: [...prev.skills, skillInput.trim()],
                            }));
                            setSkillInput('');
                          }
                        }
                      }}
                      placeholder="Add a skill (e.g. Ronin Stabilization, Anamorphic)..."
                      className="flex-1 px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (skillInput.trim() && !creatorState.skills.includes(skillInput.trim())) {
                          setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
                            ...prev,
                            skills: [...prev.skills, skillInput.trim()],
                          }));
                          setSkillInput('');
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {creatorState.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-200 text-xs flex items-center gap-1.5 border border-neutral-700"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => {
                            setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
                              ...prev,
                              skills: prev.skills.filter((s: string) => s !== skill),
                            }));
                          }}
                          className="hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Equipment */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Primary Equipment &amp; Gear</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={equipmentInput}
                      onChange={(e) => setEquipmentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (equipmentInput.trim() && !creatorState.equipment.includes(equipmentInput.trim())) {
                            setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
                              ...prev,
                              equipment: [...prev.equipment, equipmentInput.trim()],
                            }));
                            setEquipmentInput('');
                          }
                        }
                      }}
                      placeholder="e.g. DJI Mavic 3 Cine, Aputure 300d II, RED Komodo..."
                      className="flex-1 px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (equipmentInput.trim() && !creatorState.equipment.includes(equipmentInput.trim())) {
                          setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
                            ...prev,
                            equipment: [...prev.equipment, equipmentInput.trim()],
                          }));
                          setEquipmentInput('');
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {creatorState.equipment.map((item: string) => (
                      <span
                        key={item}
                        className="px-2.5 py-1 rounded-lg bg-neutral-950 text-neutral-300 text-xs flex items-center gap-1.5 border border-neutral-800"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => {
                            setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
                              ...prev,
                              equipment: prev.equipment.filter((eq: string) => eq !== item),
                            }));
                          }}
                          className="hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SOCIAL LINKS */}
          {creatorState.step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  STEP 5 — SOCIAL LINKS
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Connect your social profiles to increase client trust (all optional).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Instagram</label>
                  <div className="relative">
                    <Instagram className="w-4 h-4 text-pink-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={creatorState.instagram}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, instagram: e.target.value }))}
                      placeholder="https://instagram.com/yourhandle"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">YouTube</label>
                  <div className="relative">
                    <Youtube className="w-4 h-4 text-rose-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={creatorState.youtube}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, youtube: e.target.value }))}
                      placeholder="https://youtube.com/@channel"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Facebook Page</label>
                  <div className="relative">
                    <Facebook className="w-4 h-4 text-sky-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={creatorState.facebook}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, facebook: e.target.value }))}
                      placeholder="https://facebook.com/yourpage"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Website / Portfolio URL</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={creatorState.website}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourportfolio.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: PORTFOLIO */}
          {creatorState.step === 6 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                    STEP 6 — PORTFOLIO
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Showcase initial work sample so clients can review your aesthetic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={nextStep}
                  className="text-xs text-neutral-400 hover:text-white underline underline-offset-4"
                >
                  Skip for now
                </button>
              </div>

              <div className="space-y-4">
                {creatorState.portfolioItems.map((item: { title: string; description: string; category: 'photography' | 'cinematography' | 'editing'; fileUrl: string }, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => {
                              const items = [...prev.portfolioItems];
                              items[idx].title = val;
                              return { ...prev, portfolioItems: items };
                            });
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-neutral-400 mb-1">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) => {
                            const val = e.target.value as 'photography' | 'cinematography' | 'editing';
                            setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => {
                              const items = [...prev.portfolioItems];
                              items[idx].category = val;
                              return { ...prev, portfolioItems: items };
                            });
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white"
                        >
                          <option value="photography">Photography</option>
                          <option value="cinematography">Cinematography</option>
                          <option value="editing">Editing / Post-Production</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">Image / Asset URL</label>
                      <input
                        type="text"
                        value={item.fileUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => {
                            const items = [...prev.portfolioItems];
                            items[idx].fileUrl = val;
                            return { ...prev, portfolioItems: items };
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    {item.fileUrl && (
                      <div className="h-32 rounded-xl overflow-hidden border border-neutral-800">
                        <img
                          src={normalizeGoogleDriveImageUrl(item.fileUrl, 600)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.opacity = '0.5';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: SERVICES & PRICING */}
          {creatorState.step === 7 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                    STEP 7 — SERVICES &amp; PRICING
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Set up your first package offering with defined tiers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={nextStep}
                  className="text-xs text-neutral-400 hover:text-white underline underline-offset-4"
                >
                  Skip for now
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Service Name</label>
                    <input
                      type="text"
                      value={creatorState.firstService.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
                          ...prev,
                          firstService: { ...prev.firstService, title: val },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Turnaround Time</label>
                    <input
                      type="text"
                      value={creatorState.firstService.deliveryTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({
                          ...prev,
                          firstService: { ...prev.firstService, deliveryTime: val },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {creatorState.firstService.packages.map((pkg: { name: string; description: string; price: number; duration: string; revisions: number }, idx: number) => (
                    <div key={pkg.name} className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{pkg.name}</span>
                        <span className="text-xs font-extrabold text-amber-400">৳{pkg.price.toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400">{pkg.description}</p>
                      <span className="text-[10px] text-neutral-500 block">Duration: {pkg.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: AVAILABILITY */}
          {creatorState.step === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  STEP 8 — AVAILABILITY
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Specify your general working days and hours for client booking inquiries.
                </p>
              </div>

              <div className="space-y-5">
                {/* Working Days */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-2">Available Working Days</label>
                  <div className="flex flex-wrap gap-2">
                    {['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => {
                      const isSelected = creatorState.workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => {
                              const exists = prev.workingDays.includes(day);
                              const updated = exists
                                ? prev.workingDays.filter((d: string) => d !== day)
                                : [...prev.workingDays, day];
                              return { ...prev, workingDays: updated };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-black border-amber-500'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={creatorState.availableHoursStart}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, availableHoursStart: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={creatorState.availableHoursEnd}
                      onChange={(e) => setCreatorState((prev: typeof INITIAL_CREATOR_DRAFT) => ({ ...prev, availableHoursEnd: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Google Calendar two-way sync can be connected anytime from your Creator Dashboard settings.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 9: FINISH & PROFILE PREVIEW */}
          {creatorState.step === 9 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  STEP 9 — REVIEW &amp; PUBLISH
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Preview how your verified creator storefront will appear to clients on CreatorFlow.
                </p>
              </div>

              {creatorErrors.publish && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{creatorErrors.publish}</span>
                </div>
              )}

              {/* Profile Card Preview */}
              <div className="rounded-3xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-2xl">
                <div className="relative h-40 bg-neutral-900">
                  <SafeCover
                    src={creatorState.coverImageUrl}
                    alt="Cover Banner"
                    className="w-full h-full object-cover"
                    size={800}
                  />
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md border border-neutral-700 text-white text-xs font-bold">
                    Starting from <span className="text-amber-400 font-extrabold">৳{creatorState.startingPrice.toLocaleString()} BDT</span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <SafeAvatar
                      src={creatorState.profileImageUrl}
                      name={creatorState.displayName || creatorState.fullName}
                      className="w-16 h-16 rounded-2xl ring-2 ring-neutral-800 -mt-12 shadow-xl bg-neutral-900"
                      size={600}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {creatorState.displayName || creatorState.fullName}
                        </h3>
                        <span className="text-xs text-neutral-500 font-mono">@{creatorState.username}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{creatorState.city}, {creatorState.country}</span>
                        <span>•</span>
                        <span>{creatorState.experienceYears} Yrs Experience</span>
                      </div>

                      {/* Roles */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {creatorState.roles.map((r: string) => (
                          <span
                            key={r}
                            className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-semibold"
                          >
                            {r}
                          </span>
                        ))}
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
                        {creatorState.bio || 'Professional visual artist on CreatorFlow.'}
                      </p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {creatorState.skills.map((s: string) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-400 text-[10px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center justify-between">
            {creatorState.step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
            ) : (
              <div />
            )}

            {creatorState.step < 9 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmittingCreator}
                onClick={handlePublishCreator}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSubmittingCreator ? 'Publishing Storefront...' : 'Publish My Profile'}
              </button>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-neutral-500">
          Already registered?{' '}
          <button
            onClick={onNavigateLogin}
            className="text-white hover:text-amber-400 font-semibold underline underline-offset-4"
          >
            Sign In to your workspace
          </button>
        </div>
      </div>
    </div>
  );
};
