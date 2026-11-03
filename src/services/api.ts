/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  Creator,
  PortfolioItem,
  Service,
  PackageItem,
  Availability,
  Booking,
  Project,
  Message,
  Review,
  NotificationItem,
  ApiResponse,
  AuthSession,
  GuestInquiryRecord,
  AccountDeletionStatus,
  AdminDeletionRecord,
} from '../types';
import {
  MOCK_USERS,
  MOCK_CREATORS,
  MOCK_PORTFOLIO,
  MOCK_SERVICES,
  MOCK_PACKAGES,
  MOCK_AVAILABILITY,
  MOCK_BOOKINGS,
  MOCK_PROJECTS,
  MOCK_MESSAGES,
  MOCK_REVIEWS,
  MOCK_NOTIFICATIONS,
} from '../data/mockData';
import { normalizeGoogleDriveImageUrl } from '../utils/imageUtils';

// API URL from environment, or fallback to runtime configuration
const ENV_API_URL = import.meta.env.VITE_APPS_SCRIPT_API_URL || '';

const STORAGE_KEYS = {
  API_URL: 'creatorflow_custom_api_url',
  SESSION_TOKEN: 'creatorflow_session_token',
  CURRENT_USER: 'creatorflow_current_user',
  CURRENT_CREATOR: 'creatorflow_current_creator',
  DEMO_USERS: 'creatorflow_demo_users',
  DEMO_CREATORS: 'creatorflow_demo_creators',
  DEMO_PORTFOLIO: 'creatorflow_demo_portfolio',
  DEMO_SERVICES: 'creatorflow_demo_services',
  DEMO_PACKAGES: 'creatorflow_demo_packages',
  DEMO_AVAILABILITY: 'creatorflow_demo_availability',
  DEMO_BOOKINGS: 'creatorflow_demo_bookings',
  DEMO_PROJECTS: 'creatorflow_demo_projects',
  DEMO_MESSAGES: 'creatorflow_demo_messages',
  DEMO_REVIEWS: 'creatorflow_demo_reviews',
  DEMO_NOTIFICATIONS: 'creatorflow_demo_notifications',
  GUEST_INQUIRIES: 'creatorflow_guest_inquiries',
};

export function getAppsScriptUrl(): string {
  if (typeof window === 'undefined') return ENV_API_URL;
  const custom = localStorage.getItem(STORAGE_KEYS.API_URL);
  return (custom || ENV_API_URL).trim();
}

export function setCustomAppsScriptUrl(url: string): void {
  if (typeof window === 'undefined') return;
  if (!url) {
    localStorage.removeItem(STORAGE_KEYS.API_URL);
  } else {
    localStorage.setItem(STORAGE_KEYS.API_URL, url.trim());
  }
}

export function isLiveBackendConfigured(): boolean {
  const url = getAppsScriptUrl();
  return Boolean(url && url.startsWith('http') && url.includes('script.google.com'));
}

// ----------------------------------------------------
// Demo Storage helpers (for seamless fallback state)
// ----------------------------------------------------
function getLocalDemoState<T>(key: string, initialData: T): T {
  if (typeof window === 'undefined') return initialData;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initialData;
  } catch (e) {
    return initialData;
  }
}

function setLocalDemoState<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage quota error', e);
  }
}

// ----------------------------------------------------
// Generic Network Request Handler for Apps Script
// ----------------------------------------------------
async function callAppsScript<T = any>(
  method: 'GET' | 'POST',
  action: string,
  data?: Record<string, any>,
  params?: Record<string, string>
): Promise<ApiResponse<T>> {
  const apiUrl = getAppsScriptUrl();
  if (!apiUrl) {
    throw new Error('NO_API_URL: Google Apps Script Web App URL is not configured.');
  }

  const token = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN) || '';

  try {
    if (method === 'GET') {
      const url = new URL(apiUrl);
      url.searchParams.set('action', action);
      // Tokens must never be placed in GET URL query parameters (security rule)
      if (params) {
        Object.keys(params).forEach((k) => {
          if (params[k] !== undefined && params[k] !== null) {
            url.searchParams.set(k, String(params[k]));
          }
        });
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } else {
      // POST payload
      const payload = {
        action,
        token,
        data: data || {},
      };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // text/plain prevents CORS preflight issues with Google Apps Script
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    }
  } catch (err: any) {
    console.warn(`[AppsScript API] ${action} failed:`, err);
    throw err;
  }
}

// ----------------------------------------------------
// Authentication & Session
// ----------------------------------------------------
export async function pingBackend(): Promise<{ online: boolean; message: string; details?: any }> {
  if (!isLiveBackendConfigured()) {
    return {
      online: false,
      message: 'Operating in High-Fidelity Demo Fallback Mode (Google Apps Script URL not configured)',
    };
  }
  try {
    const res = await callAppsScript('GET', 'ping');
    return { online: res.success, message: res.message || 'Connected to Google Apps Script', details: res.data };
  } catch (err: any) {
    return {
      online: false,
      message: `Could not reach Apps Script endpoint: ${err.message || 'Network error'}`,
    };
  }
}

export async function runBackendSetup(): Promise<ApiResponse> {
  if (isLiveBackendConfigured()) {
    return await callAppsScript('POST', 'setupDatabase');
  }
  return {
    success: true,
    message: 'Demo database sheets and structures are simulated and verified.',
    data: { simulated: true },
  };
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
  const userRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  const creatorRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_CREATOR);

  if (!token || !userRaw) return null;
  try {
    const user: User = JSON.parse(userRaw);
    let creator: Creator | undefined = creatorRaw ? JSON.parse(creatorRaw) : undefined;
    if (!creator && user.accountType === 'creator') {
      const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
      creator = creators.find((c) => c.userId === user.userId);
      if (creator) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CREATOR, JSON.stringify(creator));
      }
    }
    return {
      token,
      user,
      creator,
    };
  } catch (e) {
    return null;
  }
}

export function saveSession(token: string, user: User, creator?: Creator): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  if (creator) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CREATOR, JSON.stringify(creator));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CREATOR);
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_CREATOR);
}

export async function validateSession(): Promise<AuthSession | null> {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
  if (!token) return null;

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'validateSession', {});
      if (res.success && res.data && res.data.user) {
        saveSession(token, res.data.user, res.data.creator || undefined);
        return {
          token,
          user: res.data.user,
          creator: res.data.creator || undefined,
        };
      }
      clearSession();
      return null;
    } catch (e) {
      clearSession();
      return null;
    }
  }

  // Demo fallback mode (only when no Apps Script URL is configured)
  const stored = getStoredSession();
  if (stored && stored.token === token) {
    return stored;
  }
  clearSession();
  return null;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const normEmail = email.trim().toLowerCase();

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'login', { email: normEmail, password });
      if (res.success && res.data) {
        saveSession(res.data.sessionToken, res.data.user, res.data.creatorProfile);
        linkGuestInquiriesToUser(res.data.user);
        return {
          token: res.data.sessionToken,
          user: res.data.user,
          creator: res.data.creatorProfile,
          deletionCancelledNotice: Boolean(res.data.deletionCancelledNotice),
        };
      }
      throw new Error(res.message || 'Incorrect email or password.');
    } catch (err: any) {
      // In live backend mode, NEVER silently switch to fake demo accounts.
      throw new Error(err.message || 'Incorrect email or password.');
    }
  }

  // Demo Fallback Login (Only when NO Apps Script backend is configured)
  const users = getLocalDemoState<User[]>(STORAGE_KEYS.DEMO_USERS, MOCK_USERS);
  const user = users.find((u) => u.email.toLowerCase() === normEmail);

  if (!user) {
    throw new Error('Incorrect email or password.');
  }

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const creator = creators.find((c) => c.userId === user.userId);
  const token = 'DEMO-TOKEN-' + user.userId;

  let deletionCancelledNotice = false;
  if (user.accountStatus === 'PENDING_DELETION') {
    user.accountStatus = 'ACTIVE';
    user.deletionCancelledAt = new Date().toISOString();
    deletionCancelledNotice = true;
    setLocalDemoState(
      STORAGE_KEYS.DEMO_USERS,
      users.map((u) => (u.userId === user.userId ? user : u))
    );
    if (creator) {
      creator.accountStatus = 'ACTIVE';
      creator.availabilityStatus = 'Available';
      setLocalDemoState(
        STORAGE_KEYS.DEMO_CREATORS,
        creators.map((c) => (c.creatorId === creator.creatorId ? creator : c))
      );
    }
  }

  saveSession(token, user, creator);
  linkGuestInquiriesToUser(user);
  return { token, user, creator, deletionCancelledNotice };
}

export async function logout(): Promise<void> {
  if (isLiveBackendConfigured()) {
    try {
      await callAppsScript('POST', 'logout');
    } catch (e) {
      // ignore
    }
  }
  clearSession();
}

export async function registerCustomer(data: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<AuthSession> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'registerCustomer', data);
      if (res.success && res.data) {
        saveSession(res.data.sessionToken, res.data.user);
        linkGuestInquiriesToUser(res.data.user);
        return { token: res.data.sessionToken, user: res.data.user };
      }
      throw new Error(res.message || 'Registration failed');
    } catch (e: any) {
      throw new Error(e.message || 'Registration failed');
    }
  }

  // Demo fallback
  const users = getLocalDemoState<User[]>(STORAGE_KEYS.DEMO_USERS, MOCK_USERS);
  if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('Email address is already registered');
  }

  const nextNum = users.length + 1;
  const userId = `USER-${String(nextNum).padStart(6, '0')}`;
  const newUser: User = {
    userId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone || '',
    accountType: 'customer',
    status: 'active',
    profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  setLocalDemoState(STORAGE_KEYS.DEMO_USERS, updatedUsers);
  const token = `DEMO-TOKEN-${userId}`;
  saveSession(token, newUser);
  linkGuestInquiriesToUser(newUser);

  return { token, user: newUser };
}

export async function checkUsername(username: string): Promise<{ available: boolean; username: string }> {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!clean || clean.length < 3) {
    return { available: false, username: clean };
  }
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('GET', 'checkUsername', undefined, { username: clean });
      if (res.success && res.data) {
        return res.data;
      }
    } catch (e) {
      console.warn('Apps Script checkUsername failed, falling back to local');
    }
  }

  // Demo fallback
  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const exists = creators.some((c) => c.username.toLowerCase() === clean);
  return { available: !exists, username: clean };
}

export interface CreatorRegistrationPayload {
  displayName: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
  roles: string[];
  city: string;
  district?: string;
  country?: string;
  serviceAreas?: string[];
  bio?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  experienceYears?: number;
  skills?: string[];
  languages?: string[];
  equipment?: string[];
  startingPrice?: number;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  website?: string;
  initialPortfolio?: {
    title: string;
    description: string;
    category: 'photography' | 'cinematography' | 'editing';
    fileUrl: string;
    mimeType?: string;
  }[];
  initialService?: {
    title: string;
    category: string;
    description: string;
    startingPrice: number;
    deliveryTime: string;
    packages?: {
      name: string;
      description: string;
      price: number;
      duration: string;
      revisions: number;
    }[];
  };
  initialAvailability?: {
    workingDays: string[];
    availableHours: { start: string; end: string };
    unavailableDates?: string[];
  };
}

export async function registerCreator(data: CreatorRegistrationPayload): Promise<AuthSession> {
  const cleanUsername = data.username.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'registerCreator', {
        ...data,
        username: cleanUsername,
      });
      if (res.success && res.data) {
        saveSession(res.data.sessionToken, res.data.user, res.data.creatorProfile);
        return {
          token: res.data.sessionToken,
          user: res.data.user,
          creator: res.data.creatorProfile,
        };
      }
      throw new Error(res.message || 'Creator registration failed');
    } catch (e: any) {
      throw new Error(e.message || 'Creator registration failed');
    }
  }

  // Demo fallback
  const users = getLocalDemoState<User[]>(STORAGE_KEYS.DEMO_USERS, MOCK_USERS);
  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);

  if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('Email address is already registered');
  }
  if (creators.some((c) => c.username.toLowerCase() === cleanUsername)) {
    throw new Error('Username is already taken by another creator');
  }

  const userNum = users.length + 1;
  const creatorNum = creators.length + 1;
  const userId = `USER-${String(userNum).padStart(6, '0')}`;
  const creatorId = `CRT-${String(creatorNum).padStart(6, '0')}`;

  const profileImg = data.profileImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
  const coverImg = data.coverImageUrl || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1600&q=80';

  const newUser: User = {
    userId,
    fullName: data.displayName,
    email: data.email,
    phone: data.phone || '',
    accountType: 'creator',
    status: 'active',
    profileImage: profileImg,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newCreator: Creator = {
    creatorId,
    userId,
    displayName: data.displayName,
    username: cleanUsername,
    roles: data.roles.length > 0 ? data.roles : ['Photographer'],
    bio: data.bio || 'Professional visual artist on CreatorFlow.',
    profileImageUrl: profileImg,
    coverImageUrl: coverImg,
    city: data.city || 'Dhaka',
    district: data.district || '',
    country: data.country || 'Bangladesh',
    serviceAreas: data.serviceAreas && data.serviceAreas.length > 0 ? data.serviceAreas : [data.city || 'Dhaka'],
    skills: data.skills && data.skills.length > 0 ? data.skills : ['Cinematography', 'Photography'],
    languages: data.languages && data.languages.length > 0 ? data.languages : ['English', 'Bengali'],
    experienceYears: data.experienceYears || 3,
    equipment: data.equipment && data.equipment.length > 0 ? data.equipment : ['Professional Mirrorless Camera'],
    startingPrice: data.startingPrice || 15000,
    facebook: data.facebook || '',
    instagram: data.instagram || '',
    youtube: data.youtube || '',
    tiktok: data.tiktok || '',
    linkedin: data.linkedin || '',
    website: data.website || '',
    verified: false,
    featured: false,
    rating: 5.0,
    reviewCount: 0,
    driveRootFolderId: `1drive_folder_${creatorId}`,
    driveRootFolderUrl: `https://drive.google.com/drive/folders/1drive_folder_${creatorId}`,
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setLocalDemoState(STORAGE_KEYS.DEMO_USERS, [...users, newUser]);
  setLocalDemoState(STORAGE_KEYS.DEMO_CREATORS, [...creators, newCreator]);

  // Seed optional initial portfolio item if provided
  if (data.initialPortfolio && data.initialPortfolio.length > 0) {
    const existingPortfolio = getLocalDemoState<PortfolioItem[]>(STORAGE_KEYS.DEMO_PORTFOLIO, MOCK_PORTFOLIO);
    const newItems: PortfolioItem[] = data.initialPortfolio.map((p, idx) => ({
      portfolioId: `PORT-${String(existingPortfolio.length + idx + 1).padStart(6, '0')}`,
      creatorId,
      title: p.title || 'Featured Shoot',
      description: p.description || '',
      category: p.category || 'photography',
      fileId: `drive_file_${Date.now()}_${idx}`,
      fileUrl: p.fileUrl,
      thumbnailUrl: p.fileUrl,
      mimeType: p.mimeType || 'image/jpeg',
      tags: ['Portfolio', ...newCreator.roles],
      featured: true,
      status: 'active',
      sortOrder: idx + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setLocalDemoState(STORAGE_KEYS.DEMO_PORTFOLIO, [...existingPortfolio, ...newItems]);
  }

  // Seed optional initial service and packages if provided
  if (data.initialService && data.initialService.title) {
    const existingServices = getLocalDemoState<Service[]>(STORAGE_KEYS.DEMO_SERVICES, MOCK_SERVICES);
    const existingPackages = getLocalDemoState<PackageItem[]>(STORAGE_KEYS.DEMO_PACKAGES, MOCK_PACKAGES);

    const srvId = `SRV-${String(existingServices.length + 1).padStart(6, '0')}`;
    const newService: Service = {
      serviceId: srvId,
      creatorId,
      title: data.initialService.title,
      description: data.initialService.description || '',
      category: data.initialService.category || 'General',
      startingPrice: data.initialService.startingPrice || newCreator.startingPrice,
      deliveryTime: data.initialService.deliveryTime || '3-5 days',
      location: data.city || 'Dhaka',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalDemoState(STORAGE_KEYS.DEMO_SERVICES, [...existingServices, newService]);

    if (data.initialService.packages && data.initialService.packages.length > 0) {
      const newPkgs: PackageItem[] = data.initialService.packages.map((pkg, idx) => ({
        packageId: `PKG-${String(existingPackages.length + idx + 1).padStart(6, '0')}`,
        creatorId,
        serviceId: srvId,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        duration: pkg.duration,
        teamSize: 1,
        photoCount: 50,
        editedPhotoCount: 20,
        videoDuration: '3-5 min',
        deliveryTime: data.initialService!.deliveryTime || '5 days',
        revisions: pkg.revisions || 2,
        travelIncluded: false,
        equipment: newCreator.equipment,
        addons: [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setLocalDemoState(STORAGE_KEYS.DEMO_PACKAGES, [...existingPackages, ...newPkgs]);
    }
  }

  const token = `DEMO-TOKEN-${userId}`;
  saveSession(token, newUser, newCreator);
  linkGuestInquiriesToUser(newUser);
  return { token, user: newUser, creator: newCreator };
}


// ----------------------------------------------------
// Creators & Discovery
// ----------------------------------------------------
export async function getCreators(filters?: {
  role?: string;
  city?: string;
  query?: string;
  sortBy?: string;
  verifiedOnly?: boolean;
  featuredOnly?: boolean;
  minRating?: number;
  priceRange?: string;
  availability?: string;
}): Promise<Creator[]> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Creator[]>('GET', 'getCreators', undefined, filters as any);
      if (res.success && Array.isArray(res.data)) {
        let liveList = res.data.map((c) => ({
          ...c,
          profileImageUrl: normalizeGoogleDriveImageUrl(c.profileImageUrl, 800),
          coverImageUrl: c.coverImageUrl ? normalizeGoogleDriveImageUrl(c.coverImageUrl, 1600) : '',
        }));

        if (filters?.verifiedOnly) {
          liveList = liveList.filter((c) => c.verified);
        }
        if (filters?.featuredOnly) {
          liveList = liveList.filter((c) => c.featured);
        }
        if (filters?.minRating) {
          liveList = liveList.filter((c) => c.rating >= filters.minRating!);
        }
        if (filters?.availability && filters.availability !== 'all') {
          liveList = liveList.filter(
            (c) => (c.availabilityStatus || 'Available').toLowerCase() === filters.availability!.toLowerCase()
          );
        }
        if (filters?.priceRange) {
          if (filters.priceRange === 'under_20k') {
            liveList = liveList.filter((c) => c.startingPrice < 20000);
          } else if (filters.priceRange === '20k_40k') {
            liveList = liveList.filter((c) => c.startingPrice >= 20000 && c.startingPrice <= 40000);
          } else if (filters.priceRange === 'above_40k') {
            liveList = liveList.filter((c) => c.startingPrice > 40000);
          }
        }
        return liveList;
      }
      return [];
    } catch (e) {
      console.warn('Apps Script getCreators error:', e);
      return [];
    }
  }

  // Demo fallback
  let list = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);

  if (filters?.role && filters.role !== 'all') {
    const roleTarget = filters.role.toLowerCase();
    list = list.filter((c) => {
      const rolesLower = c.roles.map((r) => r.toLowerCase());
      if (roleTarget === 'video_editor' || roleTarget === 'editor') {
        return rolesLower.some((r) => r.includes('editor') || r.includes('colorist') || r.includes('post'));
      }
      if (roleTarget === 'photo_editor') {
        return rolesLower.some((r) => r.includes('photo editor') || r.includes('retouch'));
      }
      if (roleTarget === 'drone') {
        return rolesLower.some((r) => r.includes('drone') || r.includes('aerial'));
      }
      if (roleTarget === 'designer') {
        return rolesLower.some((r) => r.includes('design'));
      }
      return rolesLower.some((r) => r.includes(roleTarget));
    });
  }

  if (filters?.city && filters.city !== 'all') {
    list = list.filter((c) => c.city.toLowerCase() === filters.city!.toLowerCase());
  }

  if (filters?.verifiedOnly) {
    list = list.filter((c) => c.verified);
  }

  if (filters?.featuredOnly) {
    list = list.filter((c) => c.featured);
  }

  if (filters?.availability && filters.availability !== 'all') {
    list = list.filter(
      (c) => (c.availabilityStatus || 'Available').toLowerCase() === filters.availability!.toLowerCase()
    );
  }

  if (filters?.minRating && filters.minRating > 0) {
    list = list.filter((c) => c.rating >= filters.minRating!);
  }

  if (filters?.priceRange && filters.priceRange !== 'all') {
    if (filters.priceRange === 'under_20k') {
      list = list.filter((c) => c.startingPrice < 20000);
    } else if (filters.priceRange === '20k_40k') {
      list = list.filter((c) => c.startingPrice >= 20000 && c.startingPrice <= 40000);
    } else if (filters.priceRange === 'above_40k') {
      list = list.filter((c) => c.startingPrice > 40000);
    }
  }

  if (filters?.query) {
    const q = filters.query.toLowerCase().trim();
    list = list.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.bio.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.roles.some((r) => r.toLowerCase().includes(q)) ||
        (c.equipment && c.equipment.some((eq) => eq.toLowerCase().includes(q))) ||
        (c.skills && c.skills.some((sk) => sk.toLowerCase().includes(q)))
    );
  }

  if (filters?.sortBy === 'rating') {
    list = [...list].sort((a, b) => b.rating - a.rating);
  } else if (filters?.sortBy === 'newest') {
    list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (filters?.sortBy === 'price_asc') {
    list = [...list].sort((a, b) => a.startingPrice - b.startingPrice);
  } else if (filters?.sortBy === 'price_desc') {
    list = [...list].sort((a, b) => b.startingPrice - a.startingPrice);
  }

  return list.map((c) => ({
    ...c,
    availabilityStatus: c.availabilityStatus || 'Available',
    profileImageUrl: normalizeGoogleDriveImageUrl(c.profileImageUrl, 800),
    coverImageUrl: c.coverImageUrl ? normalizeGoogleDriveImageUrl(c.coverImageUrl, 1600) : '',
  }));
}

export function getSavedCreatorIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('creatorflow_saved_creators');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleSaveCreatorId(creatorId: string): string[] {
  if (typeof window === 'undefined') return [];
  const current = getSavedCreatorIds();
  const next = current.includes(creatorId)
    ? current.filter((id) => id !== creatorId)
    : [...current, creatorId];
  try {
    localStorage.setItem('creatorflow_saved_creators', JSON.stringify(next));
  } catch (e) {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('creatorflow:saved-updated', { detail: next }));
  }
  return next;
}

export async function getCreatorProfile(usernameOrId: string): Promise<{
  creator: Creator;
  portfolios: PortfolioItem[];
  services: Service[];
  packages: PackageItem[];
  reviews: Review[];
}> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('GET', 'getCreatorProfile', undefined, {
        username: usernameOrId,
        creatorId: usernameOrId,
      });
      if (res.success && res.data) {
        const c = res.data.creator;
        if (c) {
          c.profileImageUrl = normalizeGoogleDriveImageUrl(c.profileImageUrl, 800);
          c.coverImageUrl = c.coverImageUrl ? normalizeGoogleDriveImageUrl(c.coverImageUrl, 1600) : '';
        }
        return res.data;
      }
    } catch (e) {
      console.warn('Apps Script getCreatorProfile failed, falling back to mock');
    }
  }

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const rawCreator = creators.find(
    (c) =>
      c.username.toLowerCase() === usernameOrId.toLowerCase() ||
      c.creatorId.toLowerCase() === usernameOrId.toLowerCase()
  );

  if (!rawCreator) {
    throw new Error('Creator not found');
  }

  const creator: Creator = {
    ...rawCreator,
    profileImageUrl: normalizeGoogleDriveImageUrl(rawCreator.profileImageUrl, 800),
    coverImageUrl: rawCreator.coverImageUrl ? normalizeGoogleDriveImageUrl(rawCreator.coverImageUrl, 1600) : '',
  };

  const portfolios = getLocalDemoState<PortfolioItem[]>(STORAGE_KEYS.DEMO_PORTFOLIO, MOCK_PORTFOLIO).filter(
    (p) => p.creatorId === creator.creatorId && p.status === 'active'
  );
  const services = getLocalDemoState<Service[]>(STORAGE_KEYS.DEMO_SERVICES, MOCK_SERVICES).filter(
    (s) => s.creatorId === creator.creatorId && s.status === 'active'
  );
  const packages = getLocalDemoState<PackageItem[]>(STORAGE_KEYS.DEMO_PACKAGES, MOCK_PACKAGES).filter(
    (pkg) => pkg.creatorId === creator.creatorId && pkg.status === 'active'
  );
  const reviews = getLocalDemoState<Review[]>(STORAGE_KEYS.DEMO_REVIEWS, MOCK_REVIEWS).filter(
    (r) => r.creatorId === creator.creatorId
  );

  return { creator, portfolios, services, packages, reviews };
}

export function syncLocalSessionWithCreatorUpdate(updatedCreator: Creator): void {
  if (typeof window === 'undefined') return;
  try {
    const normalizedCreator: Creator = {
      ...updatedCreator,
      profileImageUrl: normalizeGoogleDriveImageUrl(updatedCreator.profileImageUrl, 800),
      coverImageUrl: updatedCreator.coverImageUrl
        ? normalizeGoogleDriveImageUrl(updatedCreator.coverImageUrl, 1600)
        : '',
    };

    localStorage.setItem(STORAGE_KEYS.CURRENT_CREATOR, JSON.stringify(normalizedCreator));
    const userRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (userRaw) {
      const user: User = JSON.parse(userRaw);
      if (normalizedCreator.profileImageUrl !== undefined) {
        user.profileImage = normalizedCreator.profileImageUrl || '';
      }
      if (normalizedCreator.displayName) {
        user.fullName = normalizedCreator.displayName;
      }
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

      const demoUsers = getLocalDemoState<User[]>(STORAGE_KEYS.DEMO_USERS, MOCK_USERS);
      const updatedDemoUsers = demoUsers.map((u) => (u.userId === user.userId ? { ...u, ...user } : u));
      setLocalDemoState(STORAGE_KEYS.DEMO_USERS, updatedDemoUsers);
    }
    window.dispatchEvent(
      new CustomEvent('creatorflow:session-updated', { detail: { creator: normalizedCreator } })
    );
  } catch (e) {
    console.error('Failed to sync local session with creator update', e);
  }
}

export async function updateCreatorProfile(creatorId: string, data: Partial<Creator>): Promise<Creator> {
  const normalizedPayload: Partial<Creator> = { ...data };
  if (normalizedPayload.profileImageUrl !== undefined) {
    normalizedPayload.profileImageUrl = normalizeGoogleDriveImageUrl(normalizedPayload.profileImageUrl, 800);
  }
  if (normalizedPayload.coverImageUrl !== undefined) {
    normalizedPayload.coverImageUrl = normalizedPayload.coverImageUrl
      ? normalizeGoogleDriveImageUrl(normalizedPayload.coverImageUrl, 1600)
      : '';
  }

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'updateCreatorProfile', { creatorId, ...normalizedPayload });
      if (res.success && res.data) {
        const normalizedRes: Creator = {
          ...res.data,
          profileImageUrl: normalizeGoogleDriveImageUrl(res.data.profileImageUrl, 800),
          coverImageUrl: res.data.coverImageUrl ? normalizeGoogleDriveImageUrl(res.data.coverImageUrl, 1600) : '',
        };
        syncLocalSessionWithCreatorUpdate(normalizedRes);
        return normalizedRes;
      }
    } catch (e) {
      console.warn('Apps Script updateCreatorProfile failed, fallback');
    }
  }

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const updated = creators.map((c) =>
    c.creatorId === creatorId
      ? { ...c, ...normalizedPayload, updatedAt: new Date().toISOString() }
      : c
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_CREATORS, updated);
  const result = updated.find((c) => c.creatorId === creatorId)!;
  syncLocalSessionWithCreatorUpdate(result);
  return result;
}

// ----------------------------------------------------
// Portfolio Items
// ----------------------------------------------------
export async function getCreatorPortfolio(creatorId: string): Promise<PortfolioItem[]> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<PortfolioItem[]>('GET', 'getCreatorPortfolio', undefined, { creatorId });
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<PortfolioItem[]>(STORAGE_KEYS.DEMO_PORTFOLIO, MOCK_PORTFOLIO);
  return all.filter((p) => p.creatorId === creatorId && p.status === 'active');
}

export async function createPortfolioItem(
  creatorId: string,
  data: Partial<PortfolioItem>
): Promise<PortfolioItem> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<PortfolioItem>('POST', 'createPortfolioItem', { creatorId, ...data });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<PortfolioItem[]>(STORAGE_KEYS.DEMO_PORTFOLIO, MOCK_PORTFOLIO);
  const newItem: PortfolioItem = {
    portfolioId: `PORT-${String(all.length + 1).padStart(6, '0')}`,
    creatorId,
    title: data.title || 'Untitled Shoot',
    description: data.description || '',
    category: data.category || 'photography',
    fileId: `drive_file_${Date.now()}`,
    fileUrl: data.fileUrl || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: data.thumbnailUrl || data.fileUrl || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=600&q=80',
    mimeType: data.mimeType || 'image/jpeg',
    tags: data.tags || ['CreatorFlow'],
    featured: Boolean(data.featured),
    status: 'active',
    sortOrder: all.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setLocalDemoState(STORAGE_KEYS.DEMO_PORTFOLIO, [...all, newItem]);
  return newItem;
}

export async function deletePortfolioItem(portfolioId: string): Promise<void> {
  if (isLiveBackendConfigured()) {
    try {
      await callAppsScript('POST', 'deletePortfolioItem', { portfolioId });
      return;
    } catch (e) {}
  }

  const all = getLocalDemoState<PortfolioItem[]>(STORAGE_KEYS.DEMO_PORTFOLIO, MOCK_PORTFOLIO);
  const updated = all.filter((p) => p.portfolioId !== portfolioId);
  setLocalDemoState(STORAGE_KEYS.DEMO_PORTFOLIO, updated);
}

export async function updatePortfolioItem(
  portfolioId: string,
  data: Partial<PortfolioItem>
): Promise<PortfolioItem> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<PortfolioItem>('POST', 'updatePortfolioItem', { portfolioId, ...data });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<PortfolioItem[]>(STORAGE_KEYS.DEMO_PORTFOLIO, MOCK_PORTFOLIO);
  const updated = all.map((p) =>
    p.portfolioId === portfolioId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_PORTFOLIO, updated);
  const found = updated.find((p) => p.portfolioId === portfolioId);
  if (!found) throw new Error('Portfolio item not found');
  return found;
}

// ----------------------------------------------------
// Services & Packages
// ----------------------------------------------------
export async function getCreatorServices(creatorId: string): Promise<Service[]> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Service[]>('GET', 'getCreatorServices', undefined, { creatorId });
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }
  const all = getLocalDemoState<Service[]>(STORAGE_KEYS.DEMO_SERVICES, MOCK_SERVICES);
  return all.filter((s) => s.creatorId === creatorId && s.status === 'active');
}

export async function createService(creatorId: string, data: Partial<Service>): Promise<Service> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Service>('POST', 'createService', { creatorId, ...data });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }
  const all = getLocalDemoState<Service[]>(STORAGE_KEYS.DEMO_SERVICES, MOCK_SERVICES);
  const newService: Service = {
    serviceId: `SRV-${String(all.length + 1).padStart(6, '0')}`,
    creatorId,
    title: data.title || 'New Creative Service',
    description: data.description || '',
    category: data.category || 'Cinematography',
    startingPrice: data.startingPrice || 500,
    deliveryTime: data.deliveryTime || '14 Days',
    location: data.location || 'On-Location',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  setLocalDemoState(STORAGE_KEYS.DEMO_SERVICES, [...all, newService]);
  return newService;
}

export async function updateService(
  serviceId: string,
  data: Partial<Service>
): Promise<Service> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Service>('POST', 'updateService', { serviceId, ...data });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }
  const all = getLocalDemoState<Service[]>(STORAGE_KEYS.DEMO_SERVICES, MOCK_SERVICES);
  const updated = all.map((s) =>
    s.serviceId === serviceId ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_SERVICES, updated);
  const found = updated.find((s) => s.serviceId === serviceId);
  if (!found) throw new Error('Service not found');
  return found;
}

export async function deleteService(serviceId: string): Promise<void> {
  if (isLiveBackendConfigured()) {
    try {
      await callAppsScript('POST', 'deleteService', { serviceId });
      return;
    } catch (e) {}
  }
  const all = getLocalDemoState<Service[]>(STORAGE_KEYS.DEMO_SERVICES, MOCK_SERVICES);
  const updated = all.filter((s) => s.serviceId !== serviceId);
  setLocalDemoState(STORAGE_KEYS.DEMO_SERVICES, updated);
}

export async function getCreatorPackages(creatorId: string, serviceId?: string): Promise<PackageItem[]> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<PackageItem[]>('GET', 'getCreatorPackages', undefined, { creatorId, serviceId: serviceId || '' });
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }
  const all = getLocalDemoState<PackageItem[]>(STORAGE_KEYS.DEMO_PACKAGES, MOCK_PACKAGES);
  return all.filter((p) => p.creatorId === creatorId && p.status === 'active');
}

export async function createPackage(creatorId: string, data: Partial<PackageItem>): Promise<PackageItem> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<PackageItem>('POST', 'createPackage', { creatorId, ...data });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }
  const all = getLocalDemoState<PackageItem[]>(STORAGE_KEYS.DEMO_PACKAGES, MOCK_PACKAGES);
  const newPkg: PackageItem = {
    packageId: `PKG-${String(all.length + 1).padStart(6, '0')}`,
    creatorId,
    serviceId: data.serviceId || '',
    name: data.name || 'Custom Package',
    description: data.description || '',
    price: data.price || 600,
    duration: data.duration || 'Full Day',
    teamSize: data.teamSize || 1,
    photoCount: data.photoCount || 0,
    editedPhotoCount: data.editedPhotoCount || 0,
    videoDuration: data.videoDuration || '',
    deliveryTime: data.deliveryTime || '14 Days',
    revisions: data.revisions || 2,
    travelIncluded: Boolean(data.travelIncluded),
    equipment: data.equipment || ['Camera Rig'],
    addons: data.addons || [],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  setLocalDemoState(STORAGE_KEYS.DEMO_PACKAGES, [...all, newPkg]);
  return newPkg;
}

export async function updatePackage(
  packageId: string,
  data: Partial<PackageItem>
): Promise<PackageItem> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<PackageItem>('POST', 'updatePackage', { packageId, ...data });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }
  const all = getLocalDemoState<PackageItem[]>(STORAGE_KEYS.DEMO_PACKAGES, MOCK_PACKAGES);
  const updated = all.map((p) =>
    p.packageId === packageId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_PACKAGES, updated);
  const found = updated.find((p) => p.packageId === packageId);
  if (!found) throw new Error('Package not found');
  return found;
}

export async function deletePackage(packageId: string): Promise<void> {
  if (isLiveBackendConfigured()) {
    try {
      await callAppsScript('POST', 'deletePackage', { packageId });
      return;
    } catch (e) {}
  }
  const all = getLocalDemoState<PackageItem[]>(STORAGE_KEYS.DEMO_PACKAGES, MOCK_PACKAGES);
  const updated = all.filter((p) => p.packageId !== packageId);
  setLocalDemoState(STORAGE_KEYS.DEMO_PACKAGES, updated);
}

// ----------------------------------------------------
// Availability
// ----------------------------------------------------
export async function getAvailability(creatorId: string): Promise<Availability[]> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Availability[]>('GET', 'getAvailability', undefined, { creatorId });
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }
  const all = getLocalDemoState<Availability[]>(STORAGE_KEYS.DEMO_AVAILABILITY, MOCK_AVAILABILITY);
  return all.filter((a) => a.creatorId === creatorId);
}

export async function blockDate(creatorId: string, date: string, notes?: string): Promise<Availability> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Availability>('POST', 'blockDate', { creatorId, date, notes });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }
  const all = getLocalDemoState<Availability[]>(STORAGE_KEYS.DEMO_AVAILABILITY, MOCK_AVAILABILITY);
  const newSlot: Availability = {
    availabilityId: `AVL-${String(all.length + 1).padStart(6, '0')}`,
    creatorId,
    date,
    startTime: '00:00',
    endTime: '23:59',
    status: 'unavailable',
    notes: notes || 'Blocked',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  setLocalDemoState(STORAGE_KEYS.DEMO_AVAILABILITY, [...all, newSlot]);
  return newSlot;
}

export async function unblockDate(creatorId: string, date: string): Promise<void> {
  if (isLiveBackendConfigured()) {
    try {
      await callAppsScript('POST', 'unblockDate', { creatorId, date });
      return;
    } catch (e) {}
  }
  const all = getLocalDemoState<Availability[]>(STORAGE_KEYS.DEMO_AVAILABILITY, MOCK_AVAILABILITY);
  const updated = all.filter((a) => !(a.creatorId === creatorId && a.date === date && a.status === 'unavailable'));
  setLocalDemoState(STORAGE_KEYS.DEMO_AVAILABILITY, updated);
}

// ----------------------------------------------------
// Bookings & Projects
// ----------------------------------------------------
export async function createBooking(data: {
  creatorId: string;
  serviceId?: string;
  packageId?: string;
  projectTitle: string;
  projectType: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  location: string;
  budget: number;
  message: string;
}): Promise<Booking> {
  const session = getStoredSession();
  if (!session) throw new Error('Please sign in or create an account to book this creator');

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking>('POST', 'createBooking', data);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || 'Booking submission failed');
    } catch (e: any) {
      if (e.message && e.message.includes('DATE_UNAVAILABLE')) {
        throw new Error('This date or time slot is already booked for this creator.');
      }
      console.warn('Backend createBooking failed, saving to demo fallback:', e);
    }
  }

  // Demo fallback
  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const creator = creators.find((c) => c.creatorId === data.creatorId);

  const bookingId = `BKG-${String(bookings.length + 1).padStart(6, '0')}`;
  const newBooking: Booking = {
    bookingId,
    customerId: session.user.userId,
    creatorId: data.creatorId,
    serviceId: data.serviceId || '',
    packageId: data.packageId || '',
    projectTitle: data.projectTitle,
    projectType: data.projectType,
    eventDate: data.eventDate,
    startTime: data.startTime || '10:00',
    endTime: data.endTime || '18:00',
    location: data.location,
    budget: data.budget,
    message: data.message,
    status: 'pending',
    paymentStatus: 'unpaid',
    calendarEventId: '',
    driveProjectFolderId: `drive_folder_${bookingId}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerName: session.user.fullName,
    customerEmail: session.user.email,
    creatorName: creator ? creator.displayName : 'Creator',
  };

  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, [newBooking, ...bookings]);

  // Mark tentative in availability
  const avl = getLocalDemoState<Availability[]>(STORAGE_KEYS.DEMO_AVAILABILITY, MOCK_AVAILABILITY);
  const newAvl: Availability = {
    availabilityId: `AVL-${String(avl.length + 1).padStart(6, '0')}`,
    creatorId: data.creatorId,
    date: data.eventDate,
    startTime: data.startTime || '10:00',
    endTime: data.endTime || '18:00',
    status: 'tentative',
    bookingId,
    notes: `Pending request: ${data.projectTitle}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  setLocalDemoState(STORAGE_KEYS.DEMO_AVAILABILITY, [...avl, newAvl]);

  return newBooking;
}

export async function acceptBooking(bookingId: string): Promise<Booking> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking>('POST', 'acceptBooking', { bookingId });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const updated = bookings.map((b) => (b.bookingId === bookingId ? { ...b, status: 'accepted' as const, updatedAt: new Date().toISOString() } : b));
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updated);
  return updated.find((b) => b.bookingId === bookingId)!;
}

export async function confirmBooking(bookingId: string): Promise<Booking> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking>('POST', 'confirmBooking', { bookingId });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const target = bookings.find((b) => b.bookingId === bookingId);
  if (!target) throw new Error('Booking not found');

  const updatedTarget: Booking = {
    ...target,
    status: 'confirmed',
    paymentStatus: 'deposit_paid',
    calendarEventId: `CAL-EVENT-${bookingId}`,
    updatedAt: new Date().toISOString(),
  };

  const updatedBookings = bookings.map((b) => (b.bookingId === bookingId ? updatedTarget : b));
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updatedBookings);

  // Automatically create a Project if not already existing
  const projects = getLocalDemoState<Project[]>(STORAGE_KEYS.DEMO_PROJECTS, MOCK_PROJECTS);
  if (!projects.some((p) => p.bookingId === bookingId)) {
    const newPrj: Project = {
      projectId: `PRJ-${String(projects.length + 1).padStart(6, '0')}`,
      bookingId,
      customerId: target.customerId,
      creatorId: target.creatorId,
      title: target.projectTitle,
      status: 'Active',
      driveFolderId: target.driveProjectFolderId,
      startDate: target.eventDate,
      deliveryDate: '',
      notes: 'Booking confirmed and Google Calendar synchronized.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerName: target.customerName,
      creatorName: target.creatorName,
    };
    setLocalDemoState(STORAGE_KEYS.DEMO_PROJECTS, [newPrj, ...projects]);
  }

  return updatedTarget;
}

export async function declineBooking(bookingId: string, reason?: string): Promise<Booking> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking>('POST', 'declineBooking', { bookingId, reason });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const updated = bookings.map((b) => (b.bookingId === bookingId ? { ...b, status: 'declined' as const, updatedAt: new Date().toISOString() } : b));
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updated);
  return updated.find((b) => b.bookingId === bookingId)!;
}

export async function getBookings(): Promise<Booking[]> {
  const session = getStoredSession();
  if (!session) return [];

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking[]>('GET', 'getBookings');
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  if (session.user.accountType === 'admin') return all;

  return all.filter(
    (b) =>
      b.customerId === session.user.userId ||
      (session.creator && b.creatorId === session.creator.creatorId)
  );
}

export async function getProjects(): Promise<Project[]> {
  const session = getStoredSession();
  if (!session) return [];

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Project[]>('GET', 'getProjects');
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<Project[]>(STORAGE_KEYS.DEMO_PROJECTS, MOCK_PROJECTS);
  if (session.user.accountType === 'admin') return all;

  return all.filter(
    (p) =>
      p.customerId === session.user.userId ||
      (session.creator && p.creatorId === session.creator.creatorId)
  );
}

export async function updateProjectStatus(projectId: string, status: Project['status'], notes?: string): Promise<Project> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Project>('POST', 'updateProjectStatus', { projectId, status, notes });
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const projects = getLocalDemoState<Project[]>(STORAGE_KEYS.DEMO_PROJECTS, MOCK_PROJECTS);
  const updated = projects.map((p) => (p.projectId === projectId ? { ...p, status, notes: notes ?? p.notes, updatedAt: new Date().toISOString() } : p));
  setLocalDemoState(STORAGE_KEYS.DEMO_PROJECTS, updated);

  if (status === 'Completed') {
    const target = updated.find((p) => p.projectId === projectId);
    if (target?.bookingId) {
      const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
      setLocalDemoState(
        STORAGE_KEYS.DEMO_BOOKINGS,
        bookings.map((b) => (b.bookingId === target.bookingId ? { ...b, status: 'completed' as const } : b))
      );
    }
  }

  return updated.find((p) => p.projectId === projectId)!;
}

// ----------------------------------------------------
// Messages
// ----------------------------------------------------
// ----------------------------------------------------
// Guest Inquiries & Messaging
// ----------------------------------------------------
export function getGuestStoredConversations(): GuestInquiryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GUEST_INQUIRIES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveGuestConversation(record: GuestInquiryRecord): void {
  if (typeof window === 'undefined') return;
  const current = getGuestStoredConversations();
  const existingIdx = current.findIndex((c) => c.conversationId === record.conversationId);
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...record };
  } else {
    current.unshift(record);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.GUEST_INQUIRIES, JSON.stringify(current));
  } catch (e) {
    console.error('Storage error saving guest inquiry', e);
  }
}

export async function sendGuestMessage(data: {
  creatorId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  message: string;
  conversationId?: string;
  guestAccessToken?: string;
}): Promise<{
  conversationId: string;
  guestAccessToken: string;
  message: Message;
}> {
  const normEmail = data.guestEmail.trim().toLowerCase();
  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const creator = creators.find((c) => c.creatorId === data.creatorId);

  // If live backend configured, call Apps Script
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<{
        conversationId: string;
        guestAccessToken: string;
        message: Message;
      }>('POST', 'sendGuestInquiry', {
        ...data,
        guestEmail: normEmail,
      });
      if (res.success && res.data) {
        saveGuestConversation({
          conversationId: res.data.conversationId,
          guestAccessToken: res.data.guestAccessToken,
          creatorId: data.creatorId,
          creatorName: creator?.displayName || 'Creator',
          guestName: data.guestName,
          guestEmail: normEmail,
          guestPhone: data.guestPhone,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        return res.data;
      }
    } catch (e) {
      console.warn('Apps Script sendGuestInquiry failed, falling back to local storage:', e);
    }
  }

  // Local fallback storage
  const convId =
    data.conversationId ||
    `GUEST-CONV-${data.creatorId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36)}`;

  const token =
    data.guestAccessToken ||
    `GUEST_TK_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

  const messages = getLocalDemoState<Message[]>(STORAGE_KEYS.DEMO_MESSAGES, MOCK_MESSAGES);
  const newMsgId = `MSG-GUEST-${String(messages.length + 1).padStart(6, '0')}`;

  const newMsg: Message = {
    messageId: newMsgId,
    conversationId: convId,
    senderId: `guest_${convId}`,
    receiverId: creator ? creator.userId : 'unknown_creator',
    message: data.message,
    isRead: false,
    createdAt: new Date().toISOString(),
    isGuest: true,
    guestName: data.guestName,
    guestEmail: normEmail,
    guestPhone: data.guestPhone,
  };

  setLocalDemoState(STORAGE_KEYS.DEMO_MESSAGES, [...messages, newMsg]);

  // Persist guest conversation record
  saveGuestConversation({
    conversationId: convId,
    guestAccessToken: token,
    creatorId: data.creatorId,
    creatorName: creator?.displayName || 'Creator',
    guestName: data.guestName,
    guestEmail: normEmail,
    guestPhone: data.guestPhone,
    lastMessageAt: newMsg.createdAt,
    createdAt: new Date().toISOString(),
  });

  // If creator exists, trigger an in-app notification for the creator
  if (creator) {
    const notifs = getLocalDemoState<NotificationItem[]>(STORAGE_KEYS.DEMO_NOTIFICATIONS, MOCK_NOTIFICATIONS);
    const newNotif: NotificationItem = {
      notificationId: `NOTIF-${Date.now()}`,
      userId: creator.userId,
      title: `Guest Inquiry from ${data.guestName}`,
      message: `"${data.message.substring(0, 80)}${data.message.length > 80 ? '...' : ''}"`,
      type: 'message',
      isRead: false,
      createdAt: new Date().toISOString(),
      linkUrl: '/creator/messages',
    };
    setLocalDemoState(STORAGE_KEYS.DEMO_NOTIFICATIONS, [newNotif, ...notifs]);
  }

  return {
    conversationId: convId,
    guestAccessToken: token,
    message: newMsg,
  };
}

export async function getGuestMessages(
  conversationId: string,
  guestAccessToken?: string
): Promise<Message[]> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Message[]>('GET', 'getGuestMessages', undefined, {
        conversationId,
        guestAccessToken: guestAccessToken || '',
      });
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<Message[]>(STORAGE_KEYS.DEMO_MESSAGES, MOCK_MESSAGES);
  return all
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Helper to link previous guest inquiries when a user logs in or registers
export function linkGuestInquiriesToUser(user: User): void {
  if (typeof window === 'undefined' || !user.email) return;
  const normEmail = user.email.trim().toLowerCase();
  const guestInquiries = getGuestStoredConversations();
  const matchingInquiries = guestInquiries.filter(
    (inq) => inq.guestEmail && inq.guestEmail.trim().toLowerCase() === normEmail
  );

  if (matchingInquiries.length === 0) return;

  const messages = getLocalDemoState<Message[]>(STORAGE_KEYS.DEMO_MESSAGES, MOCK_MESSAGES);
  let updatedAny = false;

  const matchingConvIds = new Set(matchingInquiries.map((inq) => inq.conversationId));
  const updatedMessages = messages.map((m) => {
    if (matchingConvIds.has(m.conversationId) && m.isGuest) {
      updatedAny = true;
      return {
        ...m,
        senderId: user.userId, // Map to authenticated user ID
      };
    }
    return m;
  });

  if (updatedAny) {
    setLocalDemoState(STORAGE_KEYS.DEMO_MESSAGES, updatedMessages);
  }
}

// ----------------------------------------------------
// Messages (Authenticated & Guest Inquiries)
// ----------------------------------------------------
export async function getConversations(): Promise<any[]> {
  const session = getStoredSession();
  if (!session) return [];

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'getConversations');
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }

  const messages = getLocalDemoState<Message[]>(STORAGE_KEYS.DEMO_MESSAGES, MOCK_MESSAGES);
  const users = getLocalDemoState<User[]>(STORAGE_KEYS.DEMO_USERS, MOCK_USERS);
  const guestInquiries = getGuestStoredConversations();

  const convMap: Record<string, any> = {};

  // 1. Process regular user-to-user and linked messages
  for (const m of messages) {
    if (m.senderId === session.user.userId || m.receiverId === session.user.userId) {
      const otherId = m.senderId === session.user.userId ? m.receiverId : m.senderId;
      const convId = m.conversationId || `CONV-${[session.user.userId, otherId].sort().join('-')}`;
      if (!convMap[convId] || new Date(m.createdAt) > new Date(convMap[convId].lastMessageAt)) {
        const otherUser = users.find((u) => u.userId === otherId);
        convMap[convId] = {
          conversationId: convId,
          otherUserId: otherId,
          otherUserName: m.guestName || otherUser?.fullName || 'Creative Partner',
          otherUserImage: otherUser?.profileImage || '',
          lastMessage: m.message,
          lastMessageAt: m.createdAt,
          unreadCount: m.receiverId === session.user.userId && !m.isRead ? 1 : 0,
          isGuest: Boolean(m.isGuest),
          guestEmail: m.guestEmail,
          guestPhone: m.guestPhone,
        };
      }
    }
  }

  // 2. If current user is a creator, ensure all guest inquiries directed to this creator appear
  if (session.creator || session.user.accountType === 'creator') {
    const creatorId = session.creator?.creatorId;
    const relevantInquiries = guestInquiries.filter(
      (inq) => !creatorId || inq.creatorId === creatorId
    );

    for (const inq of relevantInquiries) {
      const inqMsgs = messages
        .filter((m) => m.conversationId === inq.conversationId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const latestMsg = inqMsgs.length > 0 ? inqMsgs[inqMsgs.length - 1] : null;
      const hasUnread = inqMsgs.some((m) => m.senderId !== session.user.userId && !m.isRead);

      convMap[inq.conversationId] = {
        conversationId: inq.conversationId,
        otherUserId: `guest_${inq.conversationId}`,
        otherUserName: inq.guestName || 'Guest Client',
        otherUserImage: '',
        lastMessage: latestMsg ? latestMsg.message : 'Guest project inquiry',
        lastMessageAt: latestMsg ? latestMsg.createdAt : inq.lastMessageAt || inq.createdAt,
        unreadCount: hasUnread ? 1 : 0,
        isGuest: true,
        guestEmail: inq.guestEmail,
        guestPhone: inq.guestPhone,
      };
    }
  }

  return Object.values(convMap).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const session = getStoredSession();
  if (!session) return [];

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Message[]>('GET', 'getMessages', undefined, { conversationId });
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<Message[]>(STORAGE_KEYS.DEMO_MESSAGES, MOCK_MESSAGES);
  return all
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function sendMessage(data: {
  receiverId: string;
  message: string;
  conversationId?: string;
  bookingId?: string;
  projectId?: string;
  attachmentUrl?: string;
}): Promise<Message> {
  const session = getStoredSession();
  if (!session) throw new Error('Please sign in to send a message');

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Message>('POST', 'sendMessage', data);
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<Message[]>(STORAGE_KEYS.DEMO_MESSAGES, MOCK_MESSAGES);
  const convId = data.conversationId || `CONV-${[session.user.userId, data.receiverId].sort().join('-')}`;
  const isGuestConv = convId.startsWith('GUEST-CONV-');

  const newMsg: Message = {
    messageId: `MSG-${String(all.length + 1).padStart(6, '0')}`,
    conversationId: convId,
    senderId: session.user.userId,
    receiverId: data.receiverId,
    bookingId: data.bookingId,
    projectId: data.projectId,
    message: data.message,
    attachmentUrl: data.attachmentUrl,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  setLocalDemoState(STORAGE_KEYS.DEMO_MESSAGES, [...all, newMsg]);

  // If this was a reply to a guest inquiry, update the guest conversation timestamp
  if (isGuestConv) {
    const guestInquiries = getGuestStoredConversations();
    const targetIdx = guestInquiries.findIndex((c) => c.conversationId === convId);
    if (targetIdx >= 0) {
      guestInquiries[targetIdx].lastMessageAt = newMsg.createdAt;
      try {
        localStorage.setItem(STORAGE_KEYS.GUEST_INQUIRIES, JSON.stringify(guestInquiries));
      } catch (e) {}
    }
  }

  return newMsg;
}

// ----------------------------------------------------
// Reviews
// ----------------------------------------------------
export async function getReviews(creatorId: string): Promise<Review[]> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Review[]>('GET', 'getCreatorReviews', undefined, { creatorId });
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<Review[]>(STORAGE_KEYS.DEMO_REVIEWS, MOCK_REVIEWS);
  return all.filter((r) => r.creatorId === creatorId);
}

export async function submitReview(data: {
  bookingId: string;
  overallRating: number;
  communicationRating?: number;
  qualityRating?: number;
  professionalismRating?: number;
  deliveryRating?: number;
  valueRating?: number;
  reviewText: string;
}): Promise<Review> {
  const session = getStoredSession();
  if (!session) throw new Error('Please sign in to write a review');

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Review>('POST', 'submitReview', data);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || 'Review submission failed');
    } catch (e: any) {
      console.warn('Backend submitReview failed, fallback:', e);
    }
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const targetBooking = bookings.find((b) => b.bookingId === data.bookingId);
  if (!targetBooking) throw new Error('Booking not found');

  const allReviews = getLocalDemoState<Review[]>(STORAGE_KEYS.DEMO_REVIEWS, MOCK_REVIEWS);
  if (allReviews.some((r) => r.bookingId === data.bookingId)) {
    throw new Error('You have already submitted a review for this booking');
  }

  const reviewId = `REV-${String(allReviews.length + 1).padStart(6, '0')}`;
  const newRev: Review = {
    reviewId,
    bookingId: data.bookingId,
    customerId: session.user.userId,
    creatorId: targetBooking.creatorId,
    overallRating: data.overallRating,
    communicationRating: data.communicationRating || data.overallRating,
    qualityRating: data.qualityRating || data.overallRating,
    professionalismRating: data.professionalismRating || data.overallRating,
    deliveryRating: data.deliveryRating || data.overallRating,
    valueRating: data.valueRating || data.overallRating,
    reviewText: data.reviewText,
    createdAt: new Date().toISOString(),
    customerName: session.user.fullName,
    customerAvatar: session.user.profileImage,
  };

  const updatedReviews = [newRev, ...allReviews];
  setLocalDemoState(STORAGE_KEYS.DEMO_REVIEWS, updatedReviews);

  // Recalculate creator rating in demo state
  const creatorReviews = updatedReviews.filter((r) => r.creatorId === targetBooking.creatorId);
  const avg = creatorReviews.reduce((sum, r) => sum + r.overallRating, 0) / creatorReviews.length;
  const rounded = Math.round(avg * 100) / 100;

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const updatedCreators = creators.map((c) =>
    c.creatorId === targetBooking.creatorId
      ? { ...c, rating: rounded, reviewCount: creatorReviews.length }
      : c
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_CREATORS, updatedCreators);

  return newRev;
}

// ----------------------------------------------------
// Notifications
// ----------------------------------------------------
export async function getNotifications(): Promise<NotificationItem[]> {
  const session = getStoredSession();
  if (!session) return [];

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<NotificationItem[]>('GET', 'getNotifications');
      if (res.success && Array.isArray(res.data)) return res.data;
    } catch (e) {}
  }

  const all = getLocalDemoState<NotificationItem[]>(STORAGE_KEYS.DEMO_NOTIFICATIONS, MOCK_NOTIFICATIONS);
  return all.filter((n) => n.userId === session.user.userId);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (isLiveBackendConfigured()) {
    try {
      await callAppsScript('POST', 'markNotificationRead', { notificationId });
      return;
    } catch (e) {}
  }

  const all = getLocalDemoState<NotificationItem[]>(STORAGE_KEYS.DEMO_NOTIFICATIONS, MOCK_NOTIFICATIONS);
  const updated = all.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n));
  setLocalDemoState(STORAGE_KEYS.DEMO_NOTIFICATIONS, updated);
}

// ----------------------------------------------------
// Drive Upload Helper
// ----------------------------------------------------
export async function uploadBase64File(data: {
  creatorId: string;
  uploadType: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
  bookingId?: string;
}): Promise<{ fileId: string; fileUrl: string; thumbnailUrl: string }> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'uploadBase64File', data);
      if (res.success && res.data) {
        const thumbUrl = normalizeGoogleDriveImageUrl(
          res.data.thumbnailUrl || res.data.fileUrl,
          data.uploadType === 'cover' ? 1600 : 800
        );
        const normFileUrl = normalizeGoogleDriveImageUrl(
          res.data.fileUrl,
          data.uploadType === 'cover' ? 1600 : 800
        );
        return {
          fileId: res.data.fileId,
          fileUrl: normFileUrl || thumbUrl,
          thumbnailUrl: thumbUrl || normFileUrl,
        };
      }
      throw new Error(res.message || 'Drive file upload failed');
    } catch (e: any) {
      console.warn('Apps Script upload failed, generating simulated drive URL:', e);
    }
  }

  // Simulated Google Drive response
  const simulatedId = `1drive_${Date.now()}`;
  return {
    fileId: simulatedId,
    fileUrl: data.base64Data.startsWith('data:')
      ? data.base64Data
      : `data:${data.mimeType};base64,${data.base64Data}`,
    thumbnailUrl: data.base64Data.startsWith('data:')
      ? data.base64Data
      : `data:${data.mimeType};base64,${data.base64Data}`,
  };
}

// ----------------------------------------------------
// Admin APIs
// ----------------------------------------------------
export async function adminGetDashboard(): Promise<any> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'adminGetDashboard');
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const users = getLocalDemoState<User[]>(STORAGE_KEYS.DEMO_USERS, MOCK_USERS);
  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const reviews = getLocalDemoState<Review[]>(STORAGE_KEYS.DEMO_REVIEWS, MOCK_REVIEWS);

  return {
    totalCreators: creators.length,
    verifiedCreators: creators.filter((c) => c.verified).length,
    totalUsers: users.length,
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === 'pending').length,
    confirmedBookings: bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length,
    totalReviews: reviews.length,
    totalRevenue: bookings.reduce((sum, b) => sum + (b.paymentStatus !== 'unpaid' ? b.budget : 0), 0),
    recentBookings: bookings.slice(0, 5),
    recentCreators: creators.slice(0, 5),
  };
}

export async function adminVerifyCreator(creatorId: string, verified: boolean): Promise<Creator> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'adminVerifyCreator', { creatorId, verified });
      if (res.success && res.data) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('creatorflow:creators-updated'));
        }
        return res.data;
      }
    } catch (e) {}
  }

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const updated = creators.map((c) => (c.creatorId === creatorId ? { ...c, verified } : c));
  setLocalDemoState(STORAGE_KEYS.DEMO_CREATORS, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('creatorflow:creators-updated'));
  }
  return updated.find((c) => c.creatorId === creatorId)!;
}

export async function adminSetFeaturedCreator(creatorId: string, featured: boolean): Promise<Creator> {
  const session = getStoredSession();
  const isAdminOrStaff =
    session?.user?.accountType === 'admin' ||
    session?.user?.accountType === 'staff' ||
    (session?.user as any)?.role === 'admin' ||
    (session?.user as any)?.role === 'staff';

  if (!session || !isAdminOrStaff) {
    throw new Error('UNAUTHORIZED: Only SpotlightPhotography Mother Admin or authorized staff can manage featured creators.');
  }

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript('POST', 'adminSetFeaturedCreator', { creatorId, featured });
      if (res.success && res.data) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('creatorflow:creators-updated'));
        }
        return res.data;
      }
    } catch (e: any) {
      console.warn('Apps Script adminSetFeaturedCreator failed, fallback to local storage:', e);
    }
  }

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const target = creators.find((c) => c.creatorId === creatorId);
  if (!target) throw new Error('NOT_FOUND: Creator does not exist');

  const updated: Creator = {
    ...target,
    featured,
    updatedAt: new Date().toISOString(),
  };

  const updatedCreators = creators.map((c) => (c.creatorId === creatorId ? updated : c));
  setLocalDemoState(STORAGE_KEYS.DEMO_CREATORS, updatedCreators);

  // If newly featured, trigger system notification for the freelancer
  if (featured) {
    const notifs = getLocalDemoState<NotificationItem[]>(STORAGE_KEYS.DEMO_NOTIFICATIONS, MOCK_NOTIFICATIONS);
    const newNotif: NotificationItem = {
      notificationId: `NOTIF-${Date.now()}`,
      userId: target.userId,
      title: "You’re Featured!",
      message: "Your profile has been selected by SpotlightPhotography to appear in Featured Freelancers.",
      type: 'system',
      isRead: false,
      createdAt: new Date().toISOString(),
      linkUrl: `/creator/${target.username}`,
    };
    setLocalDemoState(STORAGE_KEYS.DEMO_NOTIFICATIONS, [newNotif, ...notifs]);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('creatorflow:creators-updated'));
  }

  return updated;
}

// ----------------------------------------------------
// Google Calendar Synchronization (Per-Freelancer)
// ----------------------------------------------------
export async function connectGoogleCalendar(
  creatorId: string,
  data: { email: string; calendarId?: string }
): Promise<Creator> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Creator>('POST', 'connectGoogleCalendar', { creatorId, ...data });
      if (res.success && res.data) {
        syncLocalSessionWithCreatorUpdate(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Apps Script connectGoogleCalendar failed, fallback');
    }
  }

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const updated = creators.map((c) =>
    c.creatorId === creatorId
      ? {
          ...c,
          calendarConnected: true,
          calendarEmail: data.email,
          calendarId: data.calendarId || data.email,
          calendarConnectedAt: new Date().toISOString(),
          calendarLastSyncAt: new Date().toISOString(),
          calendarSyncStatus: 'connected' as const,
          updatedAt: new Date().toISOString(),
        }
      : c
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_CREATORS, updated);
  const target = updated.find((c) => c.creatorId === creatorId)!;
  syncLocalSessionWithCreatorUpdate(target);
  return target;
}

export async function disconnectGoogleCalendar(creatorId: string): Promise<Creator> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Creator>('POST', 'disconnectGoogleCalendar', { creatorId });
      if (res.success && res.data) {
        syncLocalSessionWithCreatorUpdate(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Apps Script disconnectGoogleCalendar failed, fallback');
    }
  }

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const updated = creators.map((c) =>
    c.creatorId === creatorId
      ? {
          ...c,
          calendarConnected: false,
          calendarEmail: '',
          calendarId: '',
          calendarSyncStatus: 'disconnected' as const,
          updatedAt: new Date().toISOString(),
        }
      : c
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_CREATORS, updated);
  const target = updated.find((c) => c.creatorId === creatorId)!;
  syncLocalSessionWithCreatorUpdate(target);
  return target;
}

export async function syncGoogleCalendarNow(
  creatorId: string
): Promise<{ success: boolean; syncedCount: number; totalConfirmed: number; lastSyncAt: string }> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<{ success: boolean; syncedCount: number; totalConfirmed: number; lastSyncAt: string }>(
        'POST',
        'syncGoogleCalendarNow',
        { creatorId }
      );
      if (res.success && res.data) return res.data;
    } catch (e) {
      console.warn('Apps Script syncGoogleCalendarNow failed, fallback');
    }
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const confirmed = bookings.filter((b) => b.creatorId === creatorId && b.status === 'confirmed' && !b.isArchived);
  const now = new Date().toISOString();

  const updatedBookings = bookings.map((b) => {
    if (b.creatorId === creatorId && b.status === 'confirmed' && !b.isArchived) {
      return {
        ...b,
        calendarEventId: b.calendarEventId || `CAL-EVENT-${b.bookingId}`,
        calendarSyncStatus: 'synced' as const,
        calendarSyncedAt: now,
        calendarSyncError: undefined,
      };
    }
    return b;
  });
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updatedBookings);

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const updatedCreators = creators.map((c) =>
    c.creatorId === creatorId ? { ...c, calendarLastSyncAt: now, calendarSyncStatus: 'connected' as const } : c
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_CREATORS, updatedCreators);
  const target = updatedCreators.find((c) => c.creatorId === creatorId);
  if (target) syncLocalSessionWithCreatorUpdate(target);

  return {
    success: true,
    syncedCount: confirmed.length,
    totalConfirmed: confirmed.length,
    lastSyncAt: now,
  };
}

export async function retryCalendarSync(bookingId: string): Promise<Booking> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking>('POST', 'retryCalendarSync', { bookingId });
      if (res.success && res.data) return res.data;
    } catch (e) {
      console.warn('Apps Script retryCalendarSync failed, fallback');
    }
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const now = new Date().toISOString();
  const updated = bookings.map((b) =>
    b.bookingId === bookingId
      ? {
          ...b,
          calendarEventId: b.calendarEventId || `CAL-EVENT-${b.bookingId}`,
          calendarSyncStatus: 'synced' as const,
          calendarSyncedAt: now,
          calendarSyncError: undefined,
          updatedAt: now,
        }
      : b
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updated);
  return updated.find((b) => b.bookingId === bookingId)!;
}

// ----------------------------------------------------
// Booking Lifecycle (Reschedule, Cancel, Archive, Restore)
// ----------------------------------------------------
export async function rescheduleBooking(
  bookingId: string,
  data: { eventDate: string; startTime?: string; endTime?: string }
): Promise<Booking> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking>('POST', 'rescheduleBooking', { bookingId, ...data });
      if (res.success && res.data) return res.data;
    } catch (e) {
      console.warn('Apps Script rescheduleBooking failed, fallback');
    }
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const now = new Date().toISOString();
  const updated = bookings.map((b) =>
    b.bookingId === bookingId
      ? {
          ...b,
          eventDate: data.eventDate,
          startTime: data.startTime || b.startTime,
          endTime: data.endTime || b.endTime,
          calendarSyncStatus: b.calendarEventId ? ('synced' as const) : b.calendarSyncStatus,
          calendarSyncedAt: b.calendarEventId ? now : b.calendarSyncedAt,
          updatedAt: now,
        }
      : b
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updated);

  // Update availability slot
  const availability = getLocalDemoState<Availability[]>(STORAGE_KEYS.DEMO_AVAILABILITY, MOCK_AVAILABILITY);
  const updatedAvail = availability.map((a) =>
    a.bookingId === bookingId
      ? { ...a, date: data.eventDate, startTime: data.startTime || a.startTime, endTime: data.endTime || a.endTime, updatedAt: now }
      : a
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_AVAILABILITY, updatedAvail);

  return updated.find((b) => b.bookingId === bookingId)!;
}

export async function cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking>('POST', 'cancelBooking', { bookingId, reason });
      if (res.success && res.data) return res.data;
    } catch (e) {
      console.warn('Apps Script cancelBooking failed, fallback');
    }
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const now = new Date().toISOString();
  const updated = bookings.map((b) =>
    b.bookingId === bookingId
      ? {
          ...b,
          status: 'cancelled' as const,
          isCancelled: true,
          cancelledAt: now,
          cancellationReason: reason || 'Cancelled by user',
          updatedAt: now,
        }
      : b
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updated);

  // Remove availability slot so the date is freed
  const availability = getLocalDemoState<Availability[]>(STORAGE_KEYS.DEMO_AVAILABILITY, MOCK_AVAILABILITY);
  setLocalDemoState(
    STORAGE_KEYS.DEMO_AVAILABILITY,
    availability.filter((a) => a.bookingId !== bookingId)
  );

  return updated.find((b) => b.bookingId === bookingId)!;
}

export async function archiveBooking(bookingId: string): Promise<Booking> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking>('POST', 'archiveBooking', { bookingId });
      if (res.success && res.data) return res.data;
    } catch (e) {
      console.warn('Apps Script archiveBooking failed, fallback');
    }
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const now = new Date().toISOString();
  const updated = bookings.map((b) =>
    b.bookingId === bookingId
      ? { ...b, isArchived: true, archivedAt: now, updatedAt: now }
      : b
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updated);
  return updated.find((b) => b.bookingId === bookingId)!;
}

export async function restoreBooking(bookingId: string): Promise<Booking> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Booking>('POST', 'restoreBooking', { bookingId });
      if (res.success && res.data) return res.data;
    } catch (e) {
      console.warn('Apps Script restoreBooking failed, fallback');
    }
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const now = new Date().toISOString();
  const updated = bookings.map((b) =>
    b.bookingId === bookingId
      ? { ...b, isArchived: false, updatedAt: now }
      : b
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updated);
  return updated.find((b) => b.bookingId === bookingId)!;
}

// ----------------------------------------------------
// Messaging Management (Delete & Archive)
// ----------------------------------------------------
export async function deleteConversation(conversationId: string): Promise<void> {
  if (isLiveBackendConfigured()) {
    try {
      await callAppsScript('POST', 'deleteConversation', { conversationId });
      return;
    } catch (e) {
      console.warn('Apps Script deleteConversation failed, fallback');
    }
  }

  const messages = getLocalDemoState<Message[]>(STORAGE_KEYS.DEMO_MESSAGES, MOCK_MESSAGES);
  const now = new Date().toISOString();
  const updated = messages.map((m) =>
    m.conversationId === conversationId || (`CONV-${[m.senderId, m.receiverId].sort().join('-')}` === conversationId)
      ? { ...m, isDeleted: true, deletedAt: now }
      : m
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_MESSAGES, updated);
}

export async function archiveConversation(conversationId: string): Promise<boolean> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<{ success: boolean; isArchived: boolean }>('POST', 'archiveConversation', { conversationId });
      if (res.success) return res.data?.isArchived ?? true;
    } catch (e) {
      console.warn('Apps Script archiveConversation failed, fallback');
    }
  }

  const messages = getLocalDemoState<Message[]>(STORAGE_KEYS.DEMO_MESSAGES, MOCK_MESSAGES);
  const convMsgs = messages.filter(
    (m) => m.conversationId === conversationId || (`CONV-${[m.senderId, m.receiverId].sort().join('-')}` === conversationId)
  );
  const targetArchived = convMsgs.length > 0 && convMsgs[0].isArchived ? false : true;
  const updated = messages.map((m) =>
    m.conversationId === conversationId || (`CONV-${[m.senderId, m.receiverId].sort().join('-')}` === conversationId)
      ? { ...m, isArchived: targetArchived }
      : m
  );
  setLocalDemoState(STORAGE_KEYS.DEMO_MESSAGES, updated);
  return targetArchived;
}

export async function deleteMessage(messageId: string): Promise<void> {
  if (isLiveBackendConfigured()) {
    try {
      await callAppsScript('POST', 'deleteMessage', { messageId });
      return;
    } catch (e) {
      console.warn('Apps Script deleteMessage failed, fallback');
    }
  }

  const messages = getLocalDemoState<Message[]>(STORAGE_KEYS.DEMO_MESSAGES, MOCK_MESSAGES);
  const now = new Date().toISOString();
  const updated = messages.map((m) => (m.messageId === messageId ? { ...m, isDeleted: true, deletedAt: now } : m));
  setLocalDemoState(STORAGE_KEYS.DEMO_MESSAGES, updated);
}

// ----------------------------------------------------
// Photo Management (Facebook-Style Profile & Cover)
// ----------------------------------------------------
export async function updateProfilePhoto(
  creatorId: string,
  urlOrBase64: string,
  fileName?: string,
  zoom?: number
): Promise<Creator> {
  const isBase64 = urlOrBase64.startsWith('data:');
  const payload: any = { creatorId };
  if (isBase64) {
    payload.base64Data = urlOrBase64;
    payload.fileName = fileName || 'profile_avatar.jpg';
    if (zoom !== undefined) payload.zoom = zoom;
  } else {
    payload.url = urlOrBase64;
  }

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Creator>('POST', 'updateProfilePhoto', payload);
      if (res.success && res.data) {
        syncLocalSessionWithCreatorUpdate(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Apps Script updateProfilePhoto failed, fallback');
    }
  }

  return await updateCreatorProfile(creatorId, { profileImageUrl: urlOrBase64 });
}

export async function removeProfilePhoto(creatorId: string): Promise<Creator> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Creator>('POST', 'removeProfilePhoto', { creatorId });
      if (res.success && res.data) {
        syncLocalSessionWithCreatorUpdate(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Apps Script removeProfilePhoto failed, fallback');
    }
  }

  return await updateCreatorProfile(creatorId, { profileImageUrl: '' });
}

export async function updateCoverPhoto(
  creatorId: string,
  urlOrBase64: string,
  fileName?: string,
  position?: 'top' | 'center' | 'bottom'
): Promise<Creator> {
  const isBase64 = urlOrBase64.startsWith('data:');
  const payload: any = { creatorId };
  if (isBase64) {
    payload.base64Data = urlOrBase64;
    payload.fileName = fileName || 'cover_banner.jpg';
    if (position) payload.position = position;
  } else {
    payload.url = urlOrBase64;
  }

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Creator>('POST', 'updateCoverPhoto', payload);
      if (res.success && res.data) {
        syncLocalSessionWithCreatorUpdate(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Apps Script updateCoverPhoto failed, fallback');
    }
  }

  return await updateCreatorProfile(creatorId, { coverImageUrl: urlOrBase64 });
}

export async function removeCoverPhoto(creatorId: string): Promise<Creator> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<Creator>('POST', 'removeCoverPhoto', { creatorId });
      if (res.success && res.data) {
        syncLocalSessionWithCreatorUpdate(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Apps Script removeCoverPhoto failed, fallback');
    }
  }

  return await updateCreatorProfile(creatorId, { coverImageUrl: '' });
}

// ----------------------------------------------------
// Booking Permanent Deletion
// ----------------------------------------------------
export async function deleteBooking(bookingId: string): Promise<boolean> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<{ success: boolean; bookingId: string }>('POST', 'deleteBooking', { bookingId });
      if (res.success) {
        const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
        setLocalDemoState(
          STORAGE_KEYS.DEMO_BOOKINGS,
          bookings.filter((b) => b.bookingId !== bookingId)
        );
        return true;
      }
    } catch (e) {
      console.warn('Apps Script deleteBooking failed, fallback');
    }
  }

  const bookings = getLocalDemoState<Booking[]>(STORAGE_KEYS.DEMO_BOOKINGS, MOCK_BOOKINGS);
  const updated = bookings.filter((b) => b.bookingId !== bookingId);
  setLocalDemoState(STORAGE_KEYS.DEMO_BOOKINGS, updated);
  return true;
}

// ----------------------------------------------------
// Facebook-Style 30-Day Account Deletion Lifecycle
// ----------------------------------------------------
export async function requestAccountDeletion(
  password?: string,
  reason?: string,
  isGoogleReauthConfirmed?: boolean
): Promise<AccountDeletionStatus> {
  const session = getStoredSession();
  if (!session) throw new Error('Authentication required');

  if (isLiveBackendConfigured()) {
    const res = await callAppsScript<any>('POST', 'requestAccountDeletion', {
      password,
      reason,
      isGoogleReauthConfirmed,
      confirmed: true,
    });
    if (res.success && res.data) {
      const updatedUser: User = {
        ...session.user,
        accountStatus: 'PENDING_DELETION',
        deletionRequestedAt: res.data.deletionRequestedAt,
        scheduledDeletionAt: res.data.scheduledDeletionAt,
        deletionReason: reason,
      };
      const updatedCreator: Creator | undefined = session.creator
        ? {
            ...session.creator,
            accountStatus: 'PENDING_DELETION',
            deletionRequestedAt: res.data.deletionRequestedAt,
            scheduledDeletionAt: res.data.scheduledDeletionAt,
            deletionReason: reason,
            availabilityStatus: 'Unavailable',
          }
        : undefined;

      saveSession(session.token, updatedUser, updatedCreator);
      return {
        accountStatus: 'PENDING_DELETION',
        isPendingDeletion: true,
        deletionRequestedAt: res.data.deletionRequestedAt,
        scheduledDeletionAt: res.data.scheduledDeletionAt,
        deletionReason: reason,
        daysRemaining: res.data.daysRemaining || 30,
      };
    }
    throw new Error(res.message || 'Failed to request account deletion');
  }

  // Demo fallback
  const now = new Date();
  const scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const scheduledIso = scheduled.toISOString();

  const users = getLocalDemoState<User[]>(STORAGE_KEYS.DEMO_USERS, MOCK_USERS);
  setLocalDemoState(
    STORAGE_KEYS.DEMO_USERS,
    users.map((u) =>
      u.userId === session.user.userId
        ? {
            ...u,
            accountStatus: 'PENDING_DELETION',
            deletionRequestedAt: nowIso,
            scheduledDeletionAt: scheduledIso,
            deletionReason: reason,
          }
        : u
    )
  );

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  setLocalDemoState(
    STORAGE_KEYS.DEMO_CREATORS,
    creators.map((c) =>
      c.userId === session.user.userId
        ? {
            ...c,
            accountStatus: 'PENDING_DELETION',
            deletionRequestedAt: nowIso,
            scheduledDeletionAt: scheduledIso,
            deletionReason: reason,
            availabilityStatus: 'Unavailable',
          }
        : c
    )
  );

  const updatedUser: User = {
    ...session.user,
    accountStatus: 'PENDING_DELETION',
    deletionRequestedAt: nowIso,
    scheduledDeletionAt: scheduledIso,
    deletionReason: reason,
  };
  const updatedCreator: Creator | undefined = session.creator
    ? {
        ...session.creator,
        accountStatus: 'PENDING_DELETION',
        deletionRequestedAt: nowIso,
        scheduledDeletionAt: scheduledIso,
        deletionReason: reason,
        availabilityStatus: 'Unavailable',
      }
    : undefined;

  saveSession(session.token, updatedUser, updatedCreator);

  return {
    accountStatus: 'PENDING_DELETION',
    isPendingDeletion: true,
    deletionRequestedAt: nowIso,
    scheduledDeletionAt: scheduledIso,
    deletionReason: reason,
    daysRemaining: 30,
  };
}

export async function cancelAccountDeletion(): Promise<{ success: boolean; accountStatus: string }> {
  const session = getStoredSession();
  if (!session) throw new Error('Authentication required');

  if (isLiveBackendConfigured()) {
    const res = await callAppsScript<any>('POST', 'cancelAccountDeletion');
    if (res.success) {
      const now = new Date().toISOString();
      const updatedUser: User = {
        ...session.user,
        accountStatus: 'ACTIVE',
        deletionCancelledAt: now,
      };
      const updatedCreator: Creator | undefined = session.creator
        ? {
            ...session.creator,
            accountStatus: 'ACTIVE',
            deletionCancelledAt: now,
            availabilityStatus: 'Available',
          }
        : undefined;

      saveSession(session.token, updatedUser, updatedCreator);
      return { success: true, accountStatus: 'ACTIVE' };
    }
    throw new Error(res.message || 'Failed to cancel account deletion');
  }

  // Demo fallback
  const now = new Date().toISOString();
  const users = getLocalDemoState<User[]>(STORAGE_KEYS.DEMO_USERS, MOCK_USERS);
  setLocalDemoState(
    STORAGE_KEYS.DEMO_USERS,
    users.map((u) =>
      u.userId === session.user.userId
        ? {
            ...u,
            accountStatus: 'ACTIVE',
            deletionCancelledAt: now,
          }
        : u
    )
  );

  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  setLocalDemoState(
    STORAGE_KEYS.DEMO_CREATORS,
    creators.map((c) =>
      c.userId === session.user.userId
        ? {
            ...c,
            accountStatus: 'ACTIVE',
            deletionCancelledAt: now,
            availabilityStatus: 'Available',
          }
        : c
    )
  );

  const updatedUser: User = {
    ...session.user,
    accountStatus: 'ACTIVE',
    deletionCancelledAt: now,
  };
  const updatedCreator: Creator | undefined = session.creator
    ? {
        ...session.creator,
        accountStatus: 'ACTIVE',
        deletionCancelledAt: now,
        availabilityStatus: 'Available',
      }
    : undefined;

  saveSession(session.token, updatedUser, updatedCreator);
  return { success: true, accountStatus: 'ACTIVE' };
}

export async function getAccountDeletionStatus(): Promise<AccountDeletionStatus> {
  const session = getStoredSession();
  if (!session) {
    return {
      accountStatus: 'ACTIVE',
      isPendingDeletion: false,
      daysRemaining: 0,
    };
  }

  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<AccountDeletionStatus>('POST', 'getAccountDeletionStatus');
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const isPending = session.user.accountStatus === 'PENDING_DELETION';
  let daysRemaining = 0;
  if (isPending && session.user.scheduledDeletionAt) {
    const diff = new Date(session.user.scheduledDeletionAt).getTime() - new Date().getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }

  return {
    accountStatus: session.user.accountStatus || 'ACTIVE',
    isPendingDeletion: isPending,
    deletionRequestedAt: session.user.deletionRequestedAt,
    scheduledDeletionAt: session.user.scheduledDeletionAt,
    deletionReason: session.user.deletionReason,
    daysRemaining,
  };
}

export async function adminGetDeletionRecords(): Promise<{
  metrics: { totalPending: number; totalCancelled: number; totalCompleted: number };
  pendingDeletions: AdminDeletionRecord[];
  cancelledDeletions: AdminDeletionRecord[];
  completedDeletions: AdminDeletionRecord[];
}> {
  if (isLiveBackendConfigured()) {
    try {
      const res = await callAppsScript<any>('POST', 'adminGetDeletionRecords');
      if (res.success && res.data) return res.data;
    } catch (e) {}
  }

  const users = getLocalDemoState<User[]>(STORAGE_KEYS.DEMO_USERS, MOCK_USERS);
  const creators = getLocalDemoState<Creator[]>(STORAGE_KEYS.DEMO_CREATORS, MOCK_CREATORS);
  const creatorMap = new Map(creators.map((c) => [c.userId, c]));

  const pending: AdminDeletionRecord[] = [];
  const cancelled: AdminDeletionRecord[] = [];
  const completed: AdminDeletionRecord[] = [];
  const now = Date.now();

  users.forEach((u) => {
    const c = creatorMap.get(u.userId);
    const item: AdminDeletionRecord = {
      userId: u.userId,
      email: u.email,
      fullName: u.fullName,
      accountType: u.accountType,
      displayName: c ? c.displayName : u.fullName,
      accountStatus: u.accountStatus || 'ACTIVE',
      deletionRequestedAt: u.deletionRequestedAt,
      scheduledDeletionAt: u.scheduledDeletionAt,
      deletionCancelledAt: u.deletionCancelledAt,
      deletionCompletedAt: u.deletionCompletedAt,
      deletionReason: u.deletionReason,
      daysRemaining: 0,
    };

    if (u.accountStatus === 'PENDING_DELETION') {
      if (u.scheduledDeletionAt) {
        const diff = new Date(u.scheduledDeletionAt).getTime() - now;
        item.daysRemaining = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
      }
      pending.push(item);
    } else if (u.deletionCancelledAt && u.accountStatus === 'ACTIVE') {
      cancelled.push(item);
    } else if (u.accountStatus === 'DELETED') {
      completed.push(item);
    }
  });

  return {
    metrics: {
      totalPending: pending.length,
      totalCancelled: cancelled.length,
      totalCompleted: completed.length,
    },
    pendingDeletions: pending,
    cancelledDeletions: cancelled,
    completedDeletions: completed,
  };
}


