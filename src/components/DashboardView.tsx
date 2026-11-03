/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  HardDrive,
  ExternalLink,
  MessageSquare,
  Star,
  Plus,
  Trash2,
  Upload,
  ShieldCheck,
  AlertCircle,
  Layers,
  ChevronRight,
  Filter,
  RefreshCw,
  Send,
  Sparkles,
  ChevronLeft,
  Settings as SettingsIcon,
  User as UserIcon,
  Eye,
  Camera,
  Film,
  MapPin,
  Check,
  Edit2,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Instagram,
  Youtube,
  Linkedin,
  Lock,
  Search,
  Crown,
  AlertTriangle,
  CheckCircle2,
  X,
  Image as ImageIcon,
  Briefcase,
  Tag,
  Save,
  Archive,
  RotateCcw,
  Link,
  Unlink,
  Sliders,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AuthSession,
  Booking,
  Project,
  PortfolioItem,
  Availability,
  Message,
  Creator,
  Review,
  Service,
  PackageItem,
} from '../types';
import {
  getBookings,
  getProjects,
  acceptBooking,
  confirmBooking,
  declineBooking,
  rescheduleBooking,
  cancelBooking,
  archiveBooking,
  restoreBooking,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  syncGoogleCalendarNow,
  retryCalendarSync,
  deleteConversation,
  archiveConversation,
  deleteMessage,
  updateProfilePhoto,
  removeProfilePhoto,
  updateCoverPhoto,
  removeCoverPhoto,
  updateProjectStatus,
  getCreatorPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  getAvailability,
  blockDate,
  unblockDate,
  getConversations,
  getMessages,
  sendMessage,
  submitReview,
  adminGetDashboard,
  adminVerifyCreator,
  adminSetFeaturedCreator,
  getCreators,
  uploadBase64File,
  updateCreatorProfile,
  getCreatorProfile,
  getCreatorServices,
  createService,
  updateService,
  deleteService,
  getCreatorPackages,
  createPackage,
  updatePackage,
  deletePackage,
  deleteBooking,
  requestAccountDeletion,
  cancelAccountDeletion,
  getAccountDeletionStatus,
  adminGetDeletionRecords,
} from '../services/api';
import { BangladeshLocationSelect } from './BangladeshLocationSelect';
import { ALL_BANGLADESH_OPTION, getDivisionForDistrict } from '../utils/bangladeshLocations';
import { AccountDeletionStatus, AdminDeletionRecord } from '../types';
import {
  SafeAvatar,
  SafeCover,
  normalizeGoogleDriveImageUrl,
} from '../utils/imageUtils';

interface DashboardViewProps {
  session: AuthSession;
  initialTab?: string;
  onOpenSetup: () => void;
  onGoHome: () => void;
  onViewPublicProfile?: (username: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  session,
  initialTab = 'overview',
  onOpenSetup,
  onGoHome,
  onViewPublicProfile,
  onNavigateTab,
}) => {
  // Normalize initial tab ('calendar' -> 'availability')
  const normalizeTab = (t?: string) => (t === 'calendar' ? 'availability' : t || 'overview');

  const [activeTab, setActiveTab] = useState<string>(normalizeTab(initialTab));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [adminStats, setAdminStats] = useState<any>(null);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState<string | null>(null);

  // Filter states
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('all');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [portfolioCategoryFilter, setPortfolioCategoryFilter] = useState<string>('all');
  const [conversationSearch, setConversationSearch] = useState('');

  // Selected booking modal state
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Portfolio upload / edit modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioItem | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'photography' | 'cinematography' | 'editing'>('photography');
  const [uploadFileBase64, setUploadFileBase64] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadCustomUrl, setUploadCustomUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Availability calendar interactive state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [blockNotesInput, setBlockNotesInput] = useState('');
  const [isBlockingDate, setIsBlockingDate] = useState(false);

  // Services & Packages state
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isServicesLoading, setIsServicesLoading] = useState(false);
  const [serviceModal, setServiceModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    service: Service | null;
  }>({
    isOpen: false,
    mode: 'create',
    service: null,
  });
  const [serviceForm, setServiceForm] = useState({
    title: '',
    category: 'Cinematography',
    startingPrice: 15000,
    deliveryTime: '7 Days',
    location: 'On-Location Dhaka',
    description: '',
    deliverables: '',
  });
  const [isSavingService, setIsSavingService] = useState(false);

  // Central Confirmation Modal Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => Promise<void> | void;
    isProcessing?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  // Decline Booking Modal State (replaces browser prompt)
  const [declineBookingModal, setDeclineBookingModal] = useState<{
    isOpen: boolean;
    bookingId: string | null;
    reason: string;
  }>({
    isOpen: false,
    bookingId: null,
    reason: '',
  });

  // Google Calendar Synchronization State
  const [showConnectCalendarModal, setShowConnectCalendarModal] = useState(false);
  const [calendarEmailInput, setCalendarEmailInput] = useState(
    session.creator?.calendarEmail || session.user.email || ''
  );
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [isSyncingCalendarNow, setIsSyncingCalendarNow] = useState(false);
  const [retryingBookingId, setRetryingBookingId] = useState<string | null>(null);

  // Reschedule Booking Modal State
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
    eventDate: string;
    startTime: string;
    endTime: string;
    isSaving: boolean;
  }>({
    isOpen: false,
    booking: null,
    eventDate: '',
    startTime: '10:00',
    endTime: '18:00',
    isSaving: false,
  });

  // Cancel Booking Modal State
  const [cancelBookingModal, setCancelBookingModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
    reason: string;
    isCancelling: boolean;
  }>({
    isOpen: false,
    booking: null,
    reason: '',
    isCancelling: false,
  });

  // Facebook-Style Profile Photo Crop / Zoom Modal State
  const [profileCropModal, setProfileCropModal] = useState<{
    isOpen: boolean;
    previewUrl: string;
    zoom: number;
    rawBase64: string;
    fileName: string;
    isUploading: boolean;
  }>({
    isOpen: false,
    previewUrl: '',
    zoom: 1,
    rawBase64: '',
    fileName: 'avatar.jpg',
    isUploading: false,
  });

  // Facebook-Style Cover Banner Reposition Modal State
  const [coverRepositionModal, setCoverRepositionModal] = useState<{
    isOpen: boolean;
    previewUrl: string;
    position: 'top' | 'center' | 'bottom';
    rawBase64: string;
    fileName: string;
    isUploading: boolean;
  }>({
    isOpen: false,
    previewUrl: '',
    position: 'center',
    rawBase64: '',
    fileName: 'cover.jpg',
    isUploading: false,
  });

  // Availability Status State
  const [creatorAvailabilityStatus, setCreatorAvailabilityStatus] = useState<
    'Available' | 'Limited' | 'Busy' | 'Unavailable'
  >(session.creator?.availabilityStatus || 'Available');
  const [isSavingAvailabilityStatus, setIsSavingAvailabilityStatus] = useState(false);

  // Settings state
  const currentCreator = session.creator;
  const [settingsForm, setSettingsForm] = useState({
    displayName: currentCreator?.displayName || session.user.fullName || '',
    username: currentCreator?.username || '',
    bio: currentCreator?.bio || '',
    startingPrice: currentCreator?.startingPrice || 0,
    experienceYears: currentCreator?.experienceYears || 1,
    city: currentCreator?.city || 'Dhaka',
    district: currentCreator?.district || '',
    country: currentCreator?.country || 'Bangladesh',
    phone: session.user.phone || '',
    roles: currentCreator?.roles || ['Photographer'],
    instagram: currentCreator?.instagram || '',
    youtube: currentCreator?.youtube || '',
    facebook: currentCreator?.facebook || '',
    tiktok: currentCreator?.tiktok || '',
    linkedin: currentCreator?.linkedin || '',
    website: currentCreator?.website || '',
  });

  // Interactive tag lists
  const [skillsList, setSkillsList] = useState<string[]>(
    currentCreator?.skills && currentCreator.skills.length > 0
      ? currentCreator.skills
      : ['Photography', 'Cinematography', 'Color Grading']
  );
  const [newSkillInput, setNewSkillInput] = useState('');

  const [equipmentList, setEquipmentList] = useState<string[]>(
    currentCreator?.equipment && currentCreator.equipment.length > 0
      ? currentCreator.equipment
      : ['Sony FX6 Cinema Line', 'DJI Ronin RS3 Gimbal', 'Aputure 600d Pro']
  );
  const [newEquipmentInput, setNewEquipmentInput] = useState('');

  const [serviceAreasList, setServiceAreasList] = useState<string[]>(
    currentCreator?.serviceAreas && currentCreator.serviceAreas.length > 0
      ? currentCreator.serviceAreas
      : ['Dhaka', 'Chittagong', 'Sylhet']
  );
  const [newAreaInput, setNewAreaInput] = useState('');

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessToast, setSettingsSuccessToast] = useState<string | null>(null);
  const [profileCopiedToast, setProfileCopiedToast] = useState(false);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const [isUploadingCoverPhoto, setIsUploadingCoverPhoto] = useState(false);

  const isCreator = session.user.accountType === 'creator' || Boolean(session.creator);
  const isAdmin =
    session.user.accountType === 'admin' ||
    session.user.accountType === 'staff' ||
    (session.user as any)?.role === 'admin' ||
    (session.user as any)?.role === 'staff';

  // Mother Admin CreatorFlow Management State
  const [adminCreatorSearch, setAdminCreatorSearch] = useState('');
  const [adminCreatorFilter, setAdminCreatorFilter] = useState<'all' | 'featured' | 'verified' | 'pending' | 'suspended'>('all');
  const [featuredConfirmModal, setFeaturedConfirmModal] = useState<{
    isOpen: boolean;
    creator: Creator | null;
    targetFeatured: boolean;
  }>({ isOpen: false, creator: null, targetFeatured: false });
  const [autoVerifyOnFeature, setAutoVerifyOnFeature] = useState(false);
  const [isUpdatingFeatured, setIsUpdatingFeatured] = useState(false);
  const [adminDetailCreator, setAdminDetailCreator] = useState<Creator | null>(null);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Facebook-Style Account Deletion State
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteAccountReason, setDeleteAccountReason] = useState('Taking a temporary break');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false);

  // Admin Deletion Audit State
  const [adminDeletionData, setAdminDeletionData] = useState<{
    metrics: { totalPending: number; totalCancelled: number; totalCompleted: number };
    pendingDeletions: AdminDeletionRecord[];
    cancelledDeletions: AdminDeletionRecord[];
    completedDeletions: AdminDeletionRecord[];
  } | null>(null);
  const [isLoadingAdminDeletions, setIsLoadingAdminDeletions] = useState(false);

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeletingAccount(true);
    try {
      const finalReason =
        deleteAccountReason === 'Other reason' && customDeleteReason.trim()
          ? customDeleteReason.trim()
          : deleteAccountReason;

      await requestAccountDeletion(deleteAccountPassword, finalReason, true);
      setShowDeleteAccountModal(false);
      setDeleteAccountPassword('');
      setCustomDeleteReason('');
      setSettingsSuccessToast('Account scheduled for deletion. 30-day grace period started.');
      setTimeout(() => setSettingsSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to schedule account deletion');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsCancellingDeletion(true);
    try {
      await cancelAccountDeletion();
      setSettingsSuccessToast('Welcome back! Account deletion cancelled. Your profile is active.');
      setTimeout(() => setSettingsSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel deletion request');
    } finally {
      setIsCancellingDeletion(false);
    }
  };

  const handleLoadAdminDeletions = async () => {
    setIsLoadingAdminDeletions(true);
    try {
      const data = await adminGetDeletionRecords();
      setAdminDeletionData(data);
    } catch (err: any) {
      console.warn('Failed to load deletion audit:', err);
    } finally {
      setIsLoadingAdminDeletions(false);
    }
  };

  const handleCopyProfileLink = () => {
    const username = session.creator?.username || (session.user as any)?.username;
    if (!username) return;
    const url = `${window.location.origin}/creator/${username}`;
    navigator.clipboard.writeText(url);
    setProfileCopiedToast(true);
    setTimeout(() => setProfileCopiedToast(false), 3000);
  };

  // Sync tab when prop changes
  useEffect(() => {
    if (initialTab) {
      const normalized = normalizeTab(initialTab);
      // If customer requests overview and is not admin, redirect to bookings
      if (!isCreator && normalized === 'overview' && !isAdmin) {
        setActiveTab('bookings');
      } else {
        setActiveTab(normalized);
      }
    } else if (!isCreator && !isAdmin) {
      setActiveTab('bookings');
    }
  }, [initialTab, isCreator, isAdmin]);

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeTab, session]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'bookings' || activeTab === 'projects') {
        const [bList, pList] = await Promise.all([getBookings(), getProjects()]);
        setBookings(bList);
        setProjects(pList);

        if (session.creator) {
          const [portList, avlList, convList, fullProf, srvList, pkgList] = await Promise.all([
            getCreatorPortfolio(session.creator.creatorId).catch(() => []),
            getAvailability(session.creator.creatorId).catch(() => []),
            getConversations().catch(() => []),
            getCreatorProfile(session.creator.username).catch(() => null),
            getCreatorServices(session.creator.creatorId).catch(() => []),
            getCreatorPackages(session.creator.creatorId).catch(() => []),
          ]);
          setPortfolio(portList);
          setAvailability(avlList);
          setConversations(convList);
          setServices(srvList);
          setPackages(pkgList);
          if (fullProf && fullProf.reviews) {
            setReviews(fullProf.reviews);
          }
        }
      } else if (activeTab === 'services' && session.creator) {
        setIsServicesLoading(true);
        const [srvList, pkgList] = await Promise.all([
          getCreatorServices(session.creator.creatorId),
          getCreatorPackages(session.creator.creatorId),
        ]);
        setServices(srvList);
        setPackages(pkgList);
        setIsServicesLoading(false);
      } else if (activeTab === 'availability' && session.creator) {
        const [aList, bList] = await Promise.all([
          getAvailability(session.creator.creatorId),
          getBookings(),
        ]);
        setAvailability(aList);
        setBookings(bList);
      } else if (activeTab === 'portfolio' && session.creator) {
        const pList = await getCreatorPortfolio(session.creator.creatorId);
        setPortfolio(pList);
      } else if (activeTab === 'messages') {
        const cList = await getConversations();
        setConversations(cList);
        if (cList.length > 0 && !activeConversationId) {
          setActiveConversationId(cList[0].conversationId);
          const mList = await getMessages(cList[0].conversationId);
          setChatMessages(mList);
        }
      } else if (activeTab === 'admin' && isAdmin) {
        const [stats, creators] = await Promise.all([adminGetDashboard(), getCreators()]);
        setAdminStats(stats);
        setAllCreators(creators);
      }
    } catch (e) {
      console.error('Error loading dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    try {
      const msgs = await getMessages(convId);
      setChatMessages(msgs);
    } catch (e) {}
  };

  const handleSendMessage = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (directText || newMessageText).trim();
    if (!textToSend || !activeConversationId) return;

    const currentConv = conversations.find((c) => c.conversationId === activeConversationId);
    if (!currentConv) return;

    setNewMessageText('');

    try {
      const msg = await sendMessage({
        conversationId: activeConversationId,
        receiverId: currentConv.otherUserId,
        message: textToSend,
      });
      setChatMessages((prev) => [...prev, msg]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    setStatusActionLoading(bookingId);
    try {
      const updated = await acceptBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.bookingId === bookingId ? updated : b)));
      if (selectedBookingDetails?.bookingId === bookingId) {
        setSelectedBookingDetails(updated);
      }
      setSettingsSuccessToast('Booking request accepted!');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } finally {
      setStatusActionLoading(null);
    }
  };

  const handleOpenDeclineModal = (bookingId: string) => {
    setDeclineBookingModal({
      isOpen: true,
      bookingId,
      reason: '',
    });
  };

  const handleConfirmDeclineBooking = async () => {
    if (!declineBookingModal.bookingId) return;
    const bookingId = declineBookingModal.bookingId;
    setStatusActionLoading(bookingId);
    try {
      const updated = await declineBooking(bookingId, declineBookingModal.reason || undefined);
      setBookings((prev) => prev.map((b) => (b.bookingId === bookingId ? updated : b)));
      if (selectedBookingDetails?.bookingId === bookingId) {
        setSelectedBookingDetails(updated);
      }
      setDeclineBookingModal({ isOpen: false, bookingId: null, reason: '' });
      setSettingsSuccessToast('Booking inquiry declined.');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } finally {
      setStatusActionLoading(null);
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    setStatusActionLoading(bookingId);
    try {
      const updated = await confirmBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.bookingId === bookingId ? updated : b)));
      if (selectedBookingDetails?.bookingId === bookingId) {
        setSelectedBookingDetails(updated);
      }
      setSettingsSuccessToast('Booking confirmed!');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } finally {
      setStatusActionLoading(null);
    }
  };

  // Google Calendar Integration Handlers
  const handleConnectGoogleCalendar = async () => {
    if (!session.creator) return;
    const emailToUse = calendarEmailInput.trim();
    if (!emailToUse) {
      alert('Please enter your Google Calendar email address.');
      return;
    }
    setIsConnectingCalendar(true);
    try {
      await connectGoogleCalendar(session.creator.creatorId, { email: emailToUse });
      if (session.creator) {
        session.creator.calendarConnected = true;
        session.creator.calendarEmail = emailToUse;
        session.creator.calendarSyncStatus = 'connected';
        session.creator.calendarLastSyncAt = new Date().toISOString();
      }
      setShowConnectCalendarModal(false);
      setSettingsSuccessToast('Google Calendar connected successfully!');
      setTimeout(() => setSettingsSuccessToast(null), 3500);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to connect Google Calendar');
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  const handleDisconnectGoogleCalendarWithConfirm = () => {
    if (!session.creator) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Disconnect Google Calendar?',
      description: 'Future confirmed bookings will no longer automatically sync to your personal Google Calendar.',
      confirmLabel: 'Disconnect Calendar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await disconnectGoogleCalendar(session.creator!.creatorId);
          if (session.creator) {
            session.creator.calendarConnected = false;
            session.creator.calendarSyncStatus = 'disconnected';
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast('Google Calendar disconnected.');
          setTimeout(() => setSettingsSuccessToast(null), 3000);
          loadDashboardData();
        } catch (err: any) {
          alert(err.message || 'Failed to disconnect calendar');
        }
      },
    });
  };

  const handleSyncGoogleCalendarNow = async () => {
    if (!session.creator) return;
    setIsSyncingCalendarNow(true);
    try {
      const res = await syncGoogleCalendarNow(session.creator.creatorId);
      if (session.creator) {
        session.creator.calendarLastSyncAt = new Date().toISOString();
      }
      setSettingsSuccessToast(`Google Calendar synchronized! (${res.syncedCount || 0} shoots synced)`);
      setTimeout(() => setSettingsSuccessToast(null), 3500);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to sync Google Calendar');
    } finally {
      setIsSyncingCalendarNow(false);
    }
  };

  const handleRetryCalendarSync = async (bookingId: string) => {
    setRetryingBookingId(bookingId);
    try {
      const res = await retryCalendarSync(bookingId);
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === bookingId
            ? { ...b, calendarSyncStatus: 'synced', calendarSyncError: undefined }
            : b
        )
      );
      setSettingsSuccessToast('Shoot successfully synchronized to Google Calendar!');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Calendar retry sync failed');
    } finally {
      setRetryingBookingId(null);
    }
  };

  // Reschedule Booking Handlers
  const handleOpenRescheduleModal = (booking: Booking) => {
    setRescheduleModal({
      isOpen: true,
      booking,
      eventDate: booking.eventDate || '',
      startTime: booking.startTime || '10:00',
      endTime: booking.endTime || '18:00',
      isSaving: false,
    });
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleModal.booking) return;
    if (!rescheduleModal.eventDate) {
      alert('Please pick a new shoot date.');
      return;
    }
    setRescheduleModal((prev) => ({ ...prev, isSaving: true }));
    try {
      const updated = await rescheduleBooking(rescheduleModal.booking.bookingId, {
        eventDate: rescheduleModal.eventDate,
        startTime: rescheduleModal.startTime,
        endTime: rescheduleModal.endTime,
      });
      setBookings((prev) =>
        prev.map((b) => (b.bookingId === updated.bookingId ? updated : b))
      );
      if (selectedBookingDetails?.bookingId === updated.bookingId) {
        setSelectedBookingDetails(updated);
      }
      setRescheduleModal({
        isOpen: false,
        booking: null,
        eventDate: '',
        startTime: '10:00',
        endTime: '18:00',
        isSaving: false,
      });
      setSettingsSuccessToast('Booking rescheduled & Google Calendar updated!');
      setTimeout(() => setSettingsSuccessToast(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule booking');
      setRescheduleModal((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // Cancel Booking Handlers
  const handleOpenCancelModal = (booking: Booking) => {
    setCancelBookingModal({
      isOpen: true,
      booking,
      reason: '',
      isCancelling: false,
    });
  };

  const handleConfirmCancelBooking = async () => {
    if (!cancelBookingModal.booking) return;
    setCancelBookingModal((prev) => ({ ...prev, isCancelling: true }));
    try {
      const updated = await cancelBooking(
        cancelBookingModal.booking.bookingId,
        cancelBookingModal.reason.trim() || undefined
      );
      setBookings((prev) =>
        prev.map((b) => (b.bookingId === updated.bookingId ? updated : b))
      );
      if (selectedBookingDetails?.bookingId === updated.bookingId) {
        setSelectedBookingDetails(updated);
      }
      setCancelBookingModal({
        isOpen: false,
        booking: null,
        reason: '',
        isCancelling: false,
      });
      setSettingsSuccessToast('Booking cancelled & calendar event removed.');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
      setCancelBookingModal((prev) => ({ ...prev, isCancelling: false }));
    }
  };

  // Archive & Restore Booking Handlers
  const handleArchiveBooking = (booking: Booking) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Archive Booking?',
      description: `Archive shoot "${booking.projectTitle}"? It will be moved to the Archived tab. Financial history and client records remain completely preserved.`,
      confirmLabel: 'Archive Booking',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const updated = await archiveBooking(booking.bookingId);
          setBookings((prev) =>
            prev.map((b) => (b.bookingId === updated.bookingId ? updated : b))
          );
          if (selectedBookingDetails?.bookingId === updated.bookingId) {
            setSelectedBookingDetails(updated);
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast('Booking moved to archives.');
          setTimeout(() => setSettingsSuccessToast(null), 3000);
        } catch (err: any) {
          alert(err.message || 'Failed to archive booking');
        }
      },
    });
  };

  const handleRestoreBooking = (booking: Booking) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restore Booking?',
      description: `Restore shoot "${booking.projectTitle}" back to your active bookings list?`,
      confirmLabel: 'Restore Booking',
      variant: 'primary',
      onConfirm: async () => {
        try {
          const updated = await restoreBooking(booking.bookingId);
          setBookings((prev) =>
            prev.map((b) => (b.bookingId === updated.bookingId ? updated : b))
          );
          if (selectedBookingDetails?.bookingId === updated.bookingId) {
            setSelectedBookingDetails(updated);
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast('Booking restored to active list.');
          setTimeout(() => setSettingsSuccessToast(null), 3000);
        } catch (err: any) {
          alert(err.message || 'Failed to restore booking');
        }
      },
    });
  };

  const handleDeleteBooking = (booking: Booking) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Delete Booking?',
      description: `Are you sure you want to permanently delete this booking for "${booking.projectTitle}" (${booking.bookingId})? This will permanently remove the record from the Google Sheets database and clean up connected calendar entries. This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteBooking(booking.bookingId);
          setBookings((prev) => prev.filter((b) => b.bookingId !== booking.bookingId));
          if (selectedBookingDetails?.bookingId === booking.bookingId) {
            setSelectedBookingDetails(null);
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast('Booking permanently deleted.');
          setTimeout(() => setSettingsSuccessToast(null), 3000);
        } catch (err: any) {
          alert(err.message || 'Failed to delete booking');
        }
      },
    });
  };

  const handleMarkBookingCompleted = async (bookingId: string) => {
    setStatusActionLoading(bookingId);
    try {
      const updated = await updateProjectStatus(bookingId, 'Completed');
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === bookingId ? { ...b, status: 'completed' } : b
        )
      );
      setSettingsSuccessToast('Shoot marked as Completed!');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to complete shoot');
    } finally {
      setStatusActionLoading(null);
    }
  };

  // Conversation & Messaging Handlers
  const handleDeleteConversation = (convId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Conversation?',
      description: 'Permanently remove this chat history from your inbox?',
      confirmLabel: 'Delete Chat',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteConversation(convId);
          setConversations((prev) => prev.filter((c) => c.conversationId !== convId));
          if (activeConversationId === convId) {
            setActiveConversationId(null);
            setChatMessages([]);
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast('Conversation deleted.');
          setTimeout(() => setSettingsSuccessToast(null), 2500);
        } catch (err: any) {
          alert(err.message || 'Failed to delete conversation');
        }
      },
    });
  };

  const handleArchiveConversation = (convId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Archive Conversation?',
      description: 'Move this discussion out of your active inbox?',
      confirmLabel: 'Archive Chat',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await archiveConversation(convId);
          setConversations((prev) => prev.filter((c) => c.conversationId !== convId));
          if (activeConversationId === convId) {
            setActiveConversationId(null);
            setChatMessages([]);
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast('Conversation archived.');
          setTimeout(() => setSettingsSuccessToast(null), 2500);
        } catch (err: any) {
          alert(err.message || 'Failed to archive conversation');
        }
      },
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Message?',
      description: 'Remove this message from the conversation thread?',
      confirmLabel: 'Delete Message',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteMessage(messageId);
          setChatMessages((prev) => prev.filter((m) => m.messageId !== messageId));
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          alert(err.message || 'Failed to delete message');
        }
      },
    });
  };

  // Facebook-Style Profile Photo Crop / Preview Handlers
  const handleSelectProfilePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session.creator) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfileCropModal({
        isOpen: true,
        previewUrl: reader.result as string,
        zoom: 1,
        rawBase64: reader.result as string,
        fileName: file.name,
        isUploading: false,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCroppedProfilePhoto = async () => {
    if (!session.creator || !profileCropModal.rawBase64) return;
    setProfileCropModal((prev) => ({ ...prev, isUploading: true }));
    try {
      const res = await updateProfilePhoto(
        session.creator.creatorId,
        profileCropModal.rawBase64,
        profileCropModal.fileName,
        profileCropModal.zoom
      );
      if (session.creator) {
        session.creator.profileImageUrl = res.profileImageUrl;
      }
      setProfileCropModal({
        isOpen: false,
        previewUrl: '',
        zoom: 1,
        rawBase64: '',
        fileName: 'avatar.jpg',
        isUploading: false,
      });
      setSettingsSuccessToast('Profile avatar updated successfully!');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save profile photo');
      setProfileCropModal((prev) => ({ ...prev, isUploading: false }));
    }
  };

  // Facebook-Style Cover Reposition Handlers
  const handleSelectCoverPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session.creator) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCoverRepositionModal({
        isOpen: true,
        previewUrl: reader.result as string,
        position: 'center',
        rawBase64: reader.result as string,
        fileName: file.name,
        isUploading: false,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveRepositionedCoverPhoto = async () => {
    if (!session.creator || !coverRepositionModal.rawBase64) return;
    setCoverRepositionModal((prev) => ({ ...prev, isUploading: true }));
    try {
      const res = await updateCoverPhoto(
        session.creator.creatorId,
        coverRepositionModal.rawBase64,
        coverRepositionModal.fileName,
        coverRepositionModal.position
      );
      if (session.creator) {
        session.creator.coverImageUrl = res.coverImageUrl;
      }
      setCoverRepositionModal({
        isOpen: false,
        previewUrl: '',
        position: 'center',
        rawBase64: '',
        fileName: 'cover.jpg',
        isUploading: false,
      });
      setSettingsSuccessToast('Cover banner updated successfully!');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save cover banner');
      setCoverRepositionModal((prev) => ({ ...prev, isUploading: false }));
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: Project['status']) => {
    try {
      const updated = await updateProjectStatus(projectId, newStatus);
      setProjects((prev) => prev.map((p) => (p.projectId === projectId ? updated : p)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    try {
      await submitReview({
        bookingId: reviewBooking.bookingId,
        overallRating: reviewRating,
        reviewText: reviewComment,
      });
      setReviewBooking(null);
      setReviewComment('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Error submitting review');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePortfolioUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.creator) return;

    if (!editingPortfolioItem && !uploadFileBase64) {
      alert('Please select an image file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      let finalUrl = uploadFileBase64;
      if (uploadFileBase64) {
        try {
          const driveRes = await uploadBase64File({
            creatorId: session.creator.creatorId,
            uploadType: uploadCategory === 'photography' ? 'portfolioPhotography' : 'portfolioCinematography',
            fileName: uploadFileName || 'portfolio_upload.jpg',
            mimeType: 'image/jpeg',
            base64Data: uploadFileBase64,
          });
          finalUrl = driveRes.fileUrl;
        } catch (err) {
          console.warn('Drive upload fallback to direct data url', err);
        }
      }

      if (editingPortfolioItem) {
        await updatePortfolioItem(editingPortfolioItem.portfolioId, {
          title: uploadTitle,
          category: uploadCategory,
          fileUrl: finalUrl || editingPortfolioItem.fileUrl,
          thumbnailUrl: finalUrl || editingPortfolioItem.thumbnailUrl,
        });
      } else {
        await createPortfolioItem(session.creator.creatorId, {
          title: uploadTitle,
          category: uploadCategory,
          fileUrl: finalUrl || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=1200&q=80',
          thumbnailUrl: finalUrl || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=600&q=80',
          tags: ['Showcase', uploadCategory],
          featured: true,
        });
      }

      setShowUploadModal(false);
      setEditingPortfolioItem(null);
      setUploadTitle('');
      setUploadFileBase64('');
      setUploadCustomUrl('');
      loadDashboardData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleFeatured = async (item: PortfolioItem) => {
    try {
      const updated = await updatePortfolioItem(item.portfolioId, {
        featured: !item.featured,
      });
      setPortfolio((prev) => prev.map((p) => (p.portfolioId === item.portfolioId ? updated : p)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePortfolioItemWithConfirm = (item: PortfolioItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Portfolio Item?',
      description: `Are you sure you want to permanently delete "${item.title}"? This will remove this work from your studio showcase and public profile.`,
      confirmLabel: 'Delete Work',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deletePortfolioItem(item.portfolioId);
          setPortfolio((prev) => prev.filter((p) => p.portfolioId !== item.portfolioId));
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast('Portfolio item removed from your studio.');
          setTimeout(() => setSettingsSuccessToast(null), 3000);
        } catch (e: any) {
          alert(e.message || 'Failed to delete portfolio item');
        }
      },
    });
  };

  const handleBlockSelectedDate = async () => {
    if (!session.creator || !selectedDate) return;
    setIsBlockingDate(true);
    try {
      const slot = await blockDate(
        session.creator.creatorId,
        selectedDate,
        blockNotesInput.trim() || 'Unavailable'
      );
      setAvailability((prev) => [...prev.filter((a) => a.date !== selectedDate), slot]);
      setBlockNotesInput('');
      setSettingsSuccessToast(`Date ${selectedDate} blocked on your calendar.`);
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to block date');
    } finally {
      setIsBlockingDate(false);
    }
  };

  const handleUnblockDateWithConfirm = (slotDate: string) => {
    if (!session.creator) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Blackout Date?',
      description: `Reopen ${slotDate} for client bookings on your production calendar?`,
      confirmLabel: 'Remove Date',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await unblockDate(session.creator!.creatorId, slotDate);
          setAvailability((prev) => prev.filter((a) => a.date !== slotDate));
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast(`Date ${slotDate} is now open for bookings.`);
          setTimeout(() => setSettingsSuccessToast(null), 3000);
        } catch (e: any) {
          alert(e.message || 'Failed to unblock date');
        }
      },
    });
  };

  const handleSaveAvailabilityStatus = async (
    targetStatus: 'Available' | 'Limited' | 'Busy' | 'Unavailable'
  ) => {
    if (!session.creator) return;
    setIsSavingAvailabilityStatus(true);
    try {
      setCreatorAvailabilityStatus(targetStatus);
      await updateCreatorProfile(session.creator.creatorId, {
        availabilityStatus: targetStatus,
      });
      setSettingsSuccessToast(`Availability status updated to "${targetStatus.toUpperCase()}".`);
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to update availability status');
    } finally {
      setIsSavingAvailabilityStatus(false);
    }
  };

  // Services CRUD handlers
  const handleOpenAddService = () => {
    setServiceForm({
      title: '',
      category: 'Cinematography',
      startingPrice: 15000,
      deliveryTime: '7 Days',
      location: 'On-Location Dhaka',
      description: '',
      deliverables: '',
    });
    setServiceModal({
      isOpen: true,
      mode: 'create',
      service: null,
    });
  };

  const handleOpenEditService = (service: Service) => {
    setServiceForm({
      title: service.title,
      category: service.category || 'Cinematography',
      startingPrice: service.startingPrice || 15000,
      deliveryTime: service.deliveryTime || '7 Days',
      location: service.location || 'On-Location Dhaka',
      description: service.description || '',
      deliverables: Array.isArray(service.deliverables) ? service.deliverables.join(', ') : '',
    });
    setServiceModal({
      isOpen: true,
      mode: 'edit',
      service,
    });
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.creator) return;
    if (!serviceForm.title.trim()) {
      alert('Please enter a service title.');
      return;
    }

    setIsSavingService(true);
    try {
      if (serviceModal.mode === 'create') {
        const created = await createService(session.creator.creatorId, {
          title: serviceForm.title.trim(),
          category: serviceForm.category,
          startingPrice: Number(serviceForm.startingPrice) || 0,
          deliveryTime: serviceForm.deliveryTime.trim(),
          location: serviceForm.location.trim(),
          description: serviceForm.description.trim(),
        });
        setServices((prev) => [...prev, created]);
        setSettingsSuccessToast(`Service "${created.title}" published successfully!`);
      } else if (serviceModal.service) {
        const updated = await updateService(serviceModal.service.serviceId, {
          title: serviceForm.title.trim(),
          category: serviceForm.category,
          startingPrice: Number(serviceForm.startingPrice) || 0,
          deliveryTime: serviceForm.deliveryTime.trim(),
          location: serviceForm.location.trim(),
          description: serviceForm.description.trim(),
        });
        setServices((prev) =>
          prev.map((s) => (s.serviceId === updated.serviceId ? updated : s))
        );
        setSettingsSuccessToast(`Service "${updated.title}" updated successfully!`);
      }
      setTimeout(() => setSettingsSuccessToast(null), 3000);
      setServiceModal({ isOpen: false, mode: 'create', service: null });
    } catch (e: any) {
      alert(e.message || 'Failed to save service');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteServiceWithConfirm = (service: Service) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Service Offering?',
      description: `Are you sure you want to permanently delete "${service.title}"? Clients will no longer see this package in your public profile.`,
      confirmLabel: 'Delete Service',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteService(service.serviceId);
          setServices((prev) => prev.filter((s) => s.serviceId !== service.serviceId));
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast(`Service "${service.title}" was deleted.`);
          setTimeout(() => setSettingsSuccessToast(null), 3000);
        } catch (e: any) {
          alert(e.message || 'Failed to delete service');
        }
      },
    });
  };

  // Photo removal handlers with confirmation
  const handleRemoveProfilePhotoWithConfirm = () => {
    if (!session.creator) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Profile Photo?',
      description: 'Your public avatar will be cleared and replaced with your default initials.',
      confirmLabel: 'Remove Photo',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await updateCreatorProfile(session.creator!.creatorId, { profileImageUrl: '' });
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast('Profile avatar removed.');
          setTimeout(() => setSettingsSuccessToast(null), 3000);
        } catch (e: any) {
          alert(e.message || 'Failed to remove photo');
        }
      },
    });
  };

  const handleRemoveCoverPhotoWithConfirm = () => {
    if (!session.creator) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Cover Banner?',
      description: 'Your storefront header banner will be cleared and replaced with the default aesthetic gradient.',
      confirmLabel: 'Remove Cover',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await updateCreatorProfile(session.creator!.creatorId, { coverImageUrl: '' });
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setSettingsSuccessToast('Cover banner removed.');
          setTimeout(() => setSettingsSuccessToast(null), 3000);
        } catch (e: any) {
          alert(e.message || 'Failed to remove cover');
        }
      },
    });
  };

  const handleUploadProfilePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session.creator) return;
    setIsUploadingProfilePhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        let finalUrl = base64Data;
        try {
          const driveRes = await uploadBase64File({
            creatorId: session.creator!.creatorId,
            uploadType: 'profile',
            fileName: file.name,
            mimeType: file.type || 'image/jpeg',
            base64Data,
          });
          finalUrl = driveRes.fileUrl;
        } catch (err) {
          console.warn('Fallback direct image for profile photo');
        }
        await updateCreatorProfile(session.creator!.creatorId, { profileImageUrl: finalUrl });
        setSettingsSuccessToast('Profile avatar updated successfully!');
        setTimeout(() => setSettingsSuccessToast(null), 3000);
      } catch (err: any) {
        alert(err.message || 'Failed to upload profile photo');
      } finally {
        setIsUploadingProfilePhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCoverPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session.creator) return;
    setIsUploadingCoverPhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        let finalUrl = base64Data;
        try {
          const driveRes = await uploadBase64File({
            creatorId: session.creator!.creatorId,
            uploadType: 'cover',
            fileName: file.name,
            mimeType: file.type || 'image/jpeg',
            base64Data,
          });
          finalUrl = driveRes.fileUrl;
        } catch (err) {
          console.warn('Fallback direct image for cover photo');
        }
        await updateCreatorProfile(session.creator!.creatorId, { coverImageUrl: finalUrl });
        setSettingsSuccessToast('Cover banner updated successfully!');
        setTimeout(() => setSettingsSuccessToast(null), 3000);
      } catch (err: any) {
        alert(err.message || 'Failed to upload cover banner');
      } finally {
        setIsUploadingCoverPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Tag list managers
  const handleAddSkill = () => {
    const val = newSkillInput.trim();
    if (!val || skillsList.includes(val)) return;
    setSkillsList([...skillsList, val]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (indexToRemove: number) => {
    setSkillsList(skillsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveSkills = async () => {
    if (!session.creator) return;
    try {
      await updateCreatorProfile(session.creator.creatorId, { skills: skillsList });
      setSettingsSuccessToast('Skills updated successfully!');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to update skills');
    }
  };

  const handleAddEquipment = () => {
    const val = newEquipmentInput.trim();
    if (!val || equipmentList.includes(val)) return;
    setEquipmentList([...equipmentList, val]);
    setNewEquipmentInput('');
  };

  const handleRemoveEquipment = (indexToRemove: number) => {
    setEquipmentList(equipmentList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveEquipment = async () => {
    if (!session.creator) return;
    try {
      await updateCreatorProfile(session.creator.creatorId, { equipment: equipmentList });
      setSettingsSuccessToast('Camera gear & equipment updated!');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to update equipment');
    }
  };

  const handleAddServiceArea = () => {
    const val = newAreaInput.trim();
    if (!val || serviceAreasList.includes(val)) return;
    setServiceAreasList([...serviceAreasList, val]);
    setNewAreaInput('');
  };

  const handleRemoveServiceArea = (indexToRemove: number) => {
    setServiceAreasList(serviceAreasList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveServiceAreas = async () => {
    if (!session.creator) return;
    try {
      await updateCreatorProfile(session.creator.creatorId, { serviceAreas: serviceAreasList });
      setSettingsSuccessToast('Coverage locations updated!');
      setTimeout(() => setSettingsSuccessToast(null), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to update locations');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.creator) return;
    setIsSavingSettings(true);

    try {
      const payload: Partial<Creator> = {
        displayName: settingsForm.displayName.trim(),
        username: settingsForm.username.trim().toLowerCase(),
        bio: settingsForm.bio.trim(),
        startingPrice: Number(settingsForm.startingPrice) || 0,
        experienceYears: Number(settingsForm.experienceYears) || 1,
        city: settingsForm.city.trim(),
        district: settingsForm.district.trim(),
        division: getDivisionForDistrict(settingsForm.district.trim()) || '',
        country: settingsForm.country.trim(),
        serviceAreas: serviceAreasList,
        skills: skillsList,
        equipment: equipmentList,
        roles: settingsForm.roles,
        instagram: settingsForm.instagram.trim(),
        youtube: settingsForm.youtube.trim(),
        facebook: settingsForm.facebook.trim(),
        tiktok: settingsForm.tiktok.trim(),
        linkedin: settingsForm.linkedin.trim(),
        website: settingsForm.website.trim(),
      };

      await updateCreatorProfile(session.creator.creatorId, payload);
      setSettingsSuccessToast('Creator profile settings saved successfully!');
      setTimeout(() => setSettingsSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleVerifyCreator = async (creatorId: string, verified: boolean) => {
    try {
      const updated = await adminVerifyCreator(creatorId, verified);
      setAllCreators((prev) => prev.map((c) => (c.creatorId === creatorId ? updated : c)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenFeaturedModal = (creator: Creator, targetFeatured: boolean) => {
    setFeaturedConfirmModal({
      isOpen: true,
      creator,
      targetFeatured,
    });
    setAutoVerifyOnFeature(false);
  };

  const handleToggleFeaturedConfirm = async () => {
    if (!featuredConfirmModal.creator) return;
    const target = featuredConfirmModal.creator;
    const targetFeatured = featuredConfirmModal.targetFeatured;
    setIsUpdatingFeatured(true);

    try {
      if (targetFeatured && !target.verified && autoVerifyOnFeature) {
        await adminVerifyCreator(target.creatorId, true);
      }

      const updated = await adminSetFeaturedCreator(target.creatorId, targetFeatured);
      setAllCreators((prev) =>
        prev.map((c) =>
          c.creatorId === target.creatorId
            ? {
                ...c,
                featured: targetFeatured,
                verified: targetFeatured && autoVerifyOnFeature ? true : c.verified,
              }
            : c
        )
      );

      if (adminDetailCreator && adminDetailCreator.creatorId === target.creatorId) {
        setAdminDetailCreator({
          ...adminDetailCreator,
          featured: targetFeatured,
          verified: targetFeatured && autoVerifyOnFeature ? true : adminDetailCreator.verified,
        });
      }

      setAdminToast(
        targetFeatured
          ? `${target.displayName} is now featured in the SpotlightPhotography marketplace!`
          : `${target.displayName} was removed from Featured Freelancers.`
      );
      setTimeout(() => setAdminToast(null), 3500);

      setFeaturedConfirmModal({ isOpen: false, creator: null, targetFeatured: false });
      setAutoVerifyOnFeature(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update featured status');
    } finally {
      setIsUpdatingFeatured(false);
    }
  };

  const handleVerifyCreatorToggle = async (creatorId: string, verified: boolean) => {
    try {
      const updated = await adminVerifyCreator(creatorId, verified);
      setAllCreators((prev) => prev.map((c) => (c.creatorId === creatorId ? updated : c)));
      if (adminDetailCreator && adminDetailCreator.creatorId === creatorId) {
        setAdminDetailCreator({ ...adminDetailCreator, verified });
      }
      setAdminToast(
        verified
          ? `Freelancer marked as Verified with SpotlightPhotography badge.`
          : `Verification badge removed.`
      );
      setTimeout(() => setAdminToast(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const openClientMessage = (customerId: string, clientName?: string) => {
    switchTab('messages');
    const existing = conversations.find((c) => c.otherUserId === customerId);
    if (existing) {
      handleSelectConversation(existing.conversationId);
    } else {
      setActiveConversationId(`CONV-${session.user.userId}-${customerId}`);
      setChatMessages([]);
    }
  };

  // Helper stats for overview
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const activeProjectsCount = projects.filter(
    (p) => p.status === 'Active' || p.status === 'Editing' || p.status === 'Review'
  ).length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const averageRating = session.creator?.rating || 5.0;
  const reviewsCount = reviews.length || session.creator?.reviewCount || 0;

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilterStatus === 'archived') {
      if (!b.isArchived) return false;
    } else if (bookingFilterStatus === 'cancelled') {
      if (b.isArchived) return false;
      if (b.status !== 'cancelled' && !b.isCancelled) return false;
    } else {
      if (b.isArchived) return false;
      if (bookingFilterStatus !== 'all' && b.status !== bookingFilterStatus) return false;
    }
    const matchQuery =
      !bookingSearchQuery ||
      b.projectTitle.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
      (b.customerName && b.customerName.toLowerCase().includes(bookingSearchQuery.toLowerCase())) ||
      b.bookingId.toLowerCase().includes(bookingSearchQuery.toLowerCase());
    return matchQuery;
  });

  // Calendar rendering helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    return { daysInMonth, firstDayIndex, year, month };
  };

  const { daysInMonth, firstDayIndex, year, month } = getDaysInMonth(calendarMonth);
  const monthName = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      {/* Settings Saved Toast Notification */}
      {settingsSuccessToast && (
        <div className="fixed top-20 right-5 z-50 p-4 rounded-2xl bg-neutral-900 border border-emerald-500/50 text-emerald-300 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white">Profile settings updated successfully!</span>
        </div>
      )}

      {/* Profile Link Copied Toast */}
      {profileCopiedToast && (
        <div className="fixed top-20 right-5 z-50 p-4 rounded-2xl bg-neutral-900 border border-amber-500/50 text-amber-300 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-white">Creator profile link copied to clipboard!</span>
        </div>
      )}

      {/* 30-Day Account Deletion Grace Period Active Banner */}
      {(session.user.accountStatus === 'PENDING_DELETION' || session.creator?.accountStatus === 'PENDING_DELETION') && (() => {
        const scheduledTime = session.user.scheduledDeletionAt
          ? new Date(session.user.scheduledDeletionAt).getTime()
          : session.creator?.scheduledDeletionAt
          ? new Date(session.creator.scheduledDeletionAt).getTime()
          : 0;
        const daysRemaining = scheduledTime
          ? Math.max(0, Math.ceil((scheduledTime - Date.now()) / (24 * 60 * 60 * 1000)))
          : 30;

        return (
          <div className="p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                    Account Scheduled for Permanent Deletion
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                    {daysRemaining} Days Left in Grace Period
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed max-w-2xl">
                  Your profile and storefront are currently hidden from public search. Your data is safely held. You can cancel this deletion request and immediately reactivate your profile anytime before the 30-day window closes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancelDeletion}
              disabled={isCancellingDeletion}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-lg shadow-amber-500/20 shrink-0 disabled:opacity-50 flex items-center gap-2 justify-center"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isCancellingDeletion ? 'animate-spin' : ''}`} />
              <span>{isCancellingDeletion ? 'Restoring...' : 'Cancel Deletion & Restore'}</span>
            </button>
          </div>
        );
      })()}

      {/* Top Profile Header Bar */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <SafeAvatar
              src={session.creator?.profileImageUrl || session.user.profileImage}
              name={session.creator?.displayName || session.user.fullName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ring-2 ring-neutral-700 shadow-xl shrink-0"
              size={600}
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white font-['Space_Grotesk']">
                  {isCreator ? (session.creator?.displayName || session.user.fullName) : 'My Projects & Bookings'}
                </h1>
                {isCreator && session.creator?.username && (
                  <span className="text-xs font-mono font-semibold text-neutral-400 bg-neutral-950/80 px-2 py-0.5 rounded-lg border border-neutral-800">
                    @{session.creator.username}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {isCreator ? 'Creator Studio' : 'Client Account'}
                </span>
              </div>

              {isCreator ? (
                <>
                  <p className="text-xs text-neutral-400">
                    Manage your bookings, portfolio, availability, messages and profile.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-neutral-400">
                    {reviewsCount > 0 ? (
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {averageRating.toFixed(1)} ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                        New
                      </span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                      {session.creator?.city || 'Dhaka'}, {session.creator?.country || 'Bangladesh'}
                    </span>
                    <span>•</span>
                    <span className="text-neutral-300 font-medium">
                      {(session.creator?.startingPrice || 0) > 0 ? (
                        <>From <strong className="text-white">৳{(session.creator?.startingPrice || 0).toLocaleString()} BDT</strong></>
                      ) : (
                        <strong className="text-neutral-300">Contact for Pricing</strong>
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-neutral-400">
                  Track your creator bookings, project deliverables and messages
                </p>
              )}
            </div>
          </div>

          {/* Quick Header CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isCreator && (
              <>
                <button
                  type="button"
                  onClick={handleCopyProfileLink}
                  className="px-3.5 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-xs font-bold text-neutral-300 hover:text-white transition-colors border border-neutral-800 flex items-center gap-2"
                  title="Copy direct link to your creator portfolio"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Profile Link</span>
                </button>

                <button
                  onClick={() => {
                    const uname = session.creator?.username || (session.user as any)?.username;
                    if (onViewPublicProfile && uname) {
                      onViewPublicProfile(uname);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-all flex items-center gap-2 shadow-sm border border-neutral-700/60"
                >
                  <Eye className="w-4 h-4 text-rose-400" />
                  <span>View Public Profile</span>
                </button>
              </>
            )}

            <button
              onClick={onGoHome}
              className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 transition-colors border border-neutral-800"
            >
              Explore Talent
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Customer vs Creator) */}
      <div className="flex gap-1.5 border-b border-neutral-800 pb-2 overflow-x-auto text-xs font-bold no-scrollbar">
        {!isCreator ? (
          <>
            <button
              onClick={() => switchTab('bookings')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'bookings' || activeTab === 'overview'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>My Bookings ({bookings.length})</span>
            </button>

            <button
              onClick={() => switchTab('projects')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'projects'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Active Projects ({projects.length})</span>
            </button>

            <button
              onClick={() => switchTab('messages')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'messages'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Messages ({conversations.length})</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => switchTab('overview')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => switchTab('bookings')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'bookings'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Bookings ({bookings.length})</span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => switchTab('services')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'services'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Services &amp; Rates ({services.length})</span>
            </button>

            <button
              onClick={() => switchTab('availability')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'availability'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Calendar &amp; Availability</span>
            </button>

            <button
              onClick={() => switchTab('portfolio')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'portfolio'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Portfolio Studio ({portfolio.length})</span>
            </button>

            <button
              onClick={() => switchTab('messages')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'messages'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Messages ({conversations.length})</span>
            </button>

            <button
              onClick={() => switchTab('settings')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Profile Settings</span>
            </button>
          </>
        )}

        {isAdmin && (
          <button
            onClick={() => switchTab('admin')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25 font-bold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900 font-medium'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeTab === 'admin' ? 'text-black' : 'text-amber-400'}`} />
            <span>Admin Control</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & METRICS HUB                                             */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top 6 Actionable KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Total Bookings
                </span>
                <p className="text-2xl font-black text-white font-['Space_Grotesk'] mt-0.5">{bookings.length}</p>
                <span className="text-[10px] text-emerald-400 font-medium">All-time clients</span>
              </div>
              <button
                type="button"
                onClick={() => switchTab('bookings')}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 pt-1"
              >
                <span>View Bookings</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Pending Requests
                </span>
                <p className="text-2xl font-black text-amber-400 font-['Space_Grotesk'] mt-0.5">{pendingCount}</p>
                <span className="text-[10px] text-neutral-400 font-medium">Awaiting response</span>
              </div>
              <button
                type="button"
                onClick={() => switchTab('bookings')}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 pt-1"
              >
                <span>Review Requests</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Active Projects
                </span>
                <p className="text-2xl font-black text-emerald-400 font-['Space_Grotesk'] mt-0.5">
                  {activeProjectsCount}
                </p>
                <span className="text-[10px] text-neutral-400 font-medium">In production</span>
              </div>
              <button
                type="button"
                onClick={() => switchTab('projects')}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 pt-1"
              >
                <span>Track Shoots</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Services Offered
                </span>
                <p className="text-2xl font-black text-white font-['Space_Grotesk'] mt-0.5">{services.length}</p>
                <span className="text-[10px] text-sky-400 font-medium">Packages live</span>
              </div>
              <button
                type="button"
                onClick={() => switchTab('services')}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 pt-1"
              >
                <span>Manage Rates</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Calendar Schedule
                </span>
                <p className="text-2xl font-black text-white font-['Space_Grotesk'] mt-0.5">
                  {availability.length}
                </p>
                <span className="text-[10px] text-neutral-400 font-medium">Booked / Blocked</span>
              </div>
              <button
                type="button"
                onClick={() => switchTab('availability')}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 pt-1"
              >
                <span>Set Dates</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Portfolio Works
                </span>
                <p className="text-2xl font-black text-white font-['Space_Grotesk'] mt-0.5">{portfolio.length}</p>
                <span className="text-[10px] text-neutral-400 font-medium">Showcase items</span>
              </div>
              <button
                type="button"
                onClick={() => switchTab('portfolio')}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 pt-1"
              >
                <span>Manage Studio</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Main 2-Column Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Upcoming Bookings & Recent Works (2 cols) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Bookings Section */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-rose-400" />
                      Upcoming Booking Schedule
                    </h3>
                    <p className="text-xs text-neutral-400">Direct booking inquiries and confirmed shoots</p>
                  </div>
                  <button
                    onClick={() => switchTab('bookings')}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <span>View All ({bookings.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {bookings.length === 0 ? (
                  <div className="text-center py-10 bg-neutral-950/60 rounded-2xl border border-neutral-800/80 p-6 space-y-3">
                    <CalendarIcon className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-sm font-semibold text-white">No Bookings Yet</p>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      Your schedule is clear. Make sure your portfolio is up to date and your availability is set to attract clients.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.slice(0, 4).map((b) => (
                      <div
                        key={b.bookingId}
                        className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{b.projectTitle}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                b.status === 'confirmed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : b.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : b.status === 'accepted'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400">
                            Client: <span className="text-neutral-200">{b.customerName || 'Direct Client'}</span> •{' '}
                            {b.eventDate} ({b.startTime || '10:00'} - {b.endTime || '18:00'})
                          </p>
                          <p className="text-xs font-semibold text-amber-400 font-mono">
                            Budget: ৳{b.budget.toLocaleString()} BDT
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {b.status === 'pending' && isCreator && (
                            <>
                              <button
                                onClick={() => handleAcceptBooking(b.bookingId)}
                                disabled={statusActionLoading === b.bookingId}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleOpenDeclineModal(b.bookingId)}
                                disabled={statusActionLoading === b.bookingId}
                                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedBookingDetails(b)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Portfolio Studio Highlights */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-amber-400" />
                      Portfolio Studio Showcase
                    </h3>
                    <p className="text-xs text-neutral-400">High-resolution plates and visual work</p>
                  </div>
                  <button
                    onClick={() => switchTab('portfolio')}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <span>Manage Studio ({portfolio.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {portfolio.length === 0 ? (
                  <div className="text-center py-10 bg-neutral-950/60 rounded-2xl border border-neutral-800/80 p-6 space-y-3">
                    <HardDrive className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-sm font-semibold text-white">No Portfolio Works Added</p>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      Upload photos, video showreels, and grading stills to showcase your creative caliber to potential clients.
                    </p>
                    <button
                      onClick={() => {
                        setShowUploadModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload First Work</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {portfolio.slice(0, 4).map((item) => (
                      <div
                        key={item.portfolioId}
                        className="group relative rounded-2xl overflow-hidden bg-neutral-950 aspect-video border border-neutral-800"
                      >
                        <img
                          src={normalizeGoogleDriveImageUrl(item.thumbnailUrl || item.fileUrl, 600)}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.opacity = '0.5';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
                          <p className="text-[11px] font-bold text-white truncate">{item.title}</p>
                          <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Quick Management & Status Feeds (1 col) */}
            <div className="space-y-6">
              {/* Profile Completion Checklist Card */}
              {(() => {
                const checklistItems = [
                  {
                    id: 'avatar',
                    label: 'Profile Avatar',
                    isDone: Boolean(session.creator?.profileImageUrl || session.user.profileImage),
                    actionLabel: session.creator?.profileImageUrl ? 'Update' : 'Add Photo',
                    tab: 'settings',
                  },
                  {
                    id: 'cover',
                    label: 'Cover Banner',
                    isDone: Boolean(session.creator?.coverImageUrl),
                    actionLabel: session.creator?.coverImageUrl ? 'Update' : 'Add Cover',
                    tab: 'settings',
                  },
                  {
                    id: 'bio',
                    label: 'Bio & Creative Vision',
                    isDone: Boolean(session.creator?.bio && session.creator.bio.trim().length > 10),
                    actionLabel: 'Edit Bio',
                    tab: 'settings',
                  },
                  {
                    id: 'price',
                    label: 'Base Rate (৳ BDT)',
                    isDone: Boolean((session.creator?.startingPrice || 0) > 0),
                    actionLabel: 'Set Pricing',
                    tab: 'settings',
                  },
                  {
                    id: 'gear',
                    label: 'Camera & Gear Specs',
                    isDone: Boolean(equipmentList && equipmentList.length > 0),
                    actionLabel: 'Edit Gear',
                    tab: 'settings',
                  },
                  {
                    id: 'services',
                    label: `Services & Packages (${services.length})`,
                    isDone: Boolean(services.length > 0),
                    actionLabel: services.length > 0 ? 'Manage' : 'Add Service',
                    tab: 'services',
                  },
                  {
                    id: 'portfolio',
                    label: `Portfolio Showcase (${portfolio.length})`,
                    isDone: Boolean(portfolio.length > 0),
                    actionLabel: portfolio.length > 0 ? 'Studio' : 'Upload Work',
                    tab: 'portfolio',
                  },
                  {
                    id: 'availability',
                    label: 'Production Calendar',
                    isDone: Boolean(availability.length > 0 || creatorAvailabilityStatus !== 'Unavailable'),
                    actionLabel: 'Set Dates',
                    tab: 'availability',
                  },
                ];

                const completedCount = checklistItems.filter((i) => i.isDone).length;
                const readinessPercentage = Math.round((completedCount / checklistItems.length) * 100);

                return (
                  <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Storefront Readiness
                      </h3>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {readinessPercentage}% Ready
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(12, readinessPercentage)}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-neutral-400">
                      {completedCount} of {checklistItems.length} storefront items ready for client discovery.
                    </p>

                    <div className="space-y-2 pt-1">
                      {checklistItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700/80 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.isDone ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-neutral-600 shrink-0" />
                            )}
                            <span className={`truncate font-medium ${item.isDone ? 'text-neutral-200' : 'text-neutral-400'}`}>
                              {item.label}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (item.id === 'portfolio' && portfolio.length === 0) {
                                switchTab('portfolio');
                                setShowUploadModal(true);
                              } else if (item.id === 'services' && services.length === 0) {
                                switchTab('services');
                                handleOpenAddService();
                              } else {
                                switchTab(item.tab);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors shrink-0 ${
                              item.isDone
                                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {item.actionLabel}
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => switchTab('settings')}
                      className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Edit Creator Settings</span>
                    </button>
                  </div>
                );
              })()}

              {/* Quick Actions Panel */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">Quick Studio Controls</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      switchTab('portfolio');
                      setShowUploadModal(true);
                    }}
                    className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-left transition-colors"
                  >
                    <Plus className="w-4 h-4 text-rose-400 mb-1" />
                    <p className="font-bold text-white">Add Work</p>
                    <p className="text-[10px] text-neutral-500">Upload to studio</p>
                  </button>

                  <button
                    onClick={() => switchTab('availability')}
                    className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-left transition-colors"
                  >
                    <Clock className="w-4 h-4 text-amber-400 mb-1" />
                    <p className="font-bold text-white">Block Date</p>
                    <p className="text-[10px] text-neutral-500">Set offline time</p>
                  </button>

                  <button
                    onClick={() => switchTab('messages')}
                    className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-left transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-sky-400 mb-1" />
                    <p className="font-bold text-white">Inbox</p>
                    <p className="text-[10px] text-neutral-500">{conversations.length} chats</p>
                  </button>

                  <button
                    onClick={() => {
                      const uname = session.creator?.username;
                      if (onViewPublicProfile && uname) {
                        onViewPublicProfile(uname);
                      }
                    }}
                    className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-left transition-colors"
                  >
                    <Eye className="w-4 h-4 text-emerald-400 mb-1" />
                    <p className="font-bold text-white">Storefront</p>
                    <p className="text-[10px] text-neutral-500">Live preview</p>
                  </button>
                </div>
              </div>

              {/* Recent Messages Preview */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">Recent Inquiries</h3>
                  <button
                    onClick={() => switchTab('messages')}
                    className="text-xs font-semibold text-rose-400 hover:underline"
                  >
                    Open Messages
                  </button>
                </div>

                {conversations.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-3 text-center">No active client conversations</p>
                ) : (
                  <div className="space-y-2">
                    {conversations.slice(0, 3).map((conv) => (
                      <div
                        key={conv.conversationId}
                        onClick={() => {
                          switchTab('messages');
                          handleSelectConversation(conv.conversationId);
                        }}
                        className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800/60 cursor-pointer transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs text-white shrink-0">
                          {conv.otherUserName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{conv.otherUserName}</p>
                          <p className="text-[11px] text-neutral-400 truncate">{conv.lastMessage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BOOKINGS MANAGEMENT                                                */}
      {/* ========================================================================= */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Production Bookings</h2>
              <p className="text-xs text-neutral-400">Review requests, accept calendar dates, and manage shoots</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={bookingSearchQuery}
                onChange={(e) => setBookingSearchQuery(e.target.value)}
                placeholder="Search bookings..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: `All (${bookings.filter((b) => !b.isArchived).length})` },
              { id: 'pending', label: `New Requests (${bookings.filter((b) => !b.isArchived && b.status === 'pending').length})` },
              { id: 'accepted', label: `Accepted (${bookings.filter((b) => !b.isArchived && b.status === 'accepted').length})` },
              { id: 'confirmed', label: `Confirmed (${bookings.filter((b) => !b.isArchived && b.status === 'confirmed').length})` },
              { id: 'completed', label: `Completed (${bookings.filter((b) => !b.isArchived && b.status === 'completed').length})` },
              { id: 'declined', label: `Declined (${bookings.filter((b) => !b.isArchived && b.status === 'declined').length})` },
              { id: 'cancelled', label: `Cancelled (${bookings.filter((b) => !b.isArchived && (b.status === 'cancelled' || b.isCancelled)).length})` },
              { id: 'archived', label: `Archived (${bookings.filter((b) => b.isArchived).length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setBookingFilterStatus(f.id)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
                  bookingFilterStatus === f.id
                    ? 'bg-rose-500 text-white'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Booking Cards List */}
          {bookings.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/60 rounded-3xl border border-neutral-800 p-8 space-y-4">
              <CalendarIcon className="w-12 h-12 text-neutral-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {isCreator ? 'No Bookings Yet' : 'You Have No Bookings Yet'}
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {isCreator
                    ? 'Share your creator profile to start receiving booking requests and inquiries from clients across Bangladesh.'
                    : 'Discover vetted photographers, cinematographers, and editors to book for your weddings, events, or brand shoots.'}
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {isCreator ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyProfileLink}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Copy Profile Link</span>
                    </button>
                    {session.creator?.username && onViewPublicProfile && (
                      <button
                        type="button"
                        onClick={() => onViewPublicProfile(session.creator!.username)}
                        className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white"
                      >
                        Preview Storefront
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onGoHome}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 inline-flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Explore Creators</span>
                  </button>
                )}
              </div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/60 rounded-3xl border border-neutral-800 p-8 space-y-3">
              <CalendarIcon className="w-10 h-10 text-neutral-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Bookings Matching Filter</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                No bookings found with status "{bookingFilterStatus}". Clear filters to see all production entries.
              </p>
              {bookingFilterStatus !== 'all' && (
                <button
                  onClick={() => setBookingFilterStatus('all')}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-bold"
                >
                  Show All Bookings
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBookings.map((b) => (
                <div
                  key={b.bookingId}
                  className={`p-5 rounded-3xl bg-neutral-900 border transition-all space-y-4 flex flex-col justify-between ${
                    b.isArchived
                      ? 'border-neutral-800/60 opacity-80 bg-neutral-900/40'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase flex items-center gap-1.5">
                          <span>{b.bookingId} • {b.projectType || 'Creative Production'}</span>
                          {b.isArchived && (
                            <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 text-[9px] uppercase font-bold">
                              Archived
                            </span>
                          )}
                        </span>
                        <h4 className="text-base font-bold text-white mt-0.5">{b.projectTitle}</h4>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                          b.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : b.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : b.status === 'accepted'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : b.status === 'completed'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : b.status === 'cancelled' || b.isCancelled
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {b.status === 'cancelled' || b.isCancelled ? 'Cancelled' : b.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-neutral-300 bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800/80">
                      <p>
                        <strong className="text-neutral-400 font-normal">Client:</strong>{' '}
                        <span className="text-white font-medium">{b.customerName || 'Direct Client'}</span>
                      </p>
                      <p>
                        <strong className="text-neutral-400 font-normal">Date &amp; Time:</strong>{' '}
                        {b.eventDate} ({b.startTime || '10:00'} - {b.endTime || '18:00'})
                      </p>
                      <p>
                        <strong className="text-neutral-400 font-normal">Location:</strong> {b.location || 'On-Location'}
                      </p>
                      <p>
                        <strong className="text-neutral-400 font-normal">Budget:</strong>{' '}
                        <span className="text-amber-400 font-bold font-mono">৳{b.budget.toLocaleString()} BDT</span>
                      </p>
                      {b.message && (
                        <p className="text-neutral-400 italic text-[11px] pt-1 border-t border-neutral-800/80">
                          "{b.message}"
                        </p>
                      )}

                      {/* Google Calendar Sync Status on Confirmed Shoot */}
                      {b.status === 'confirmed' && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                          {b.calendarSyncStatus === 'synced' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Google Calendar Synced</span>
                            </span>
                          ) : b.calendarSyncStatus === 'failed' ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>Calendar Sync Failed</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRetryCalendarSync(b.bookingId)}
                                disabled={retryingBookingId === b.bookingId}
                                className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center gap-1 transition disabled:opacity-50"
                              >
                                <RotateCcw className={`w-3 h-3 ${retryingBookingId === b.bookingId ? 'animate-spin' : ''}`} />
                                <span>Retry Sync</span>
                              </button>
                            </div>
                          ) : session.creator?.calendarConnected ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1.5">
                              <CalendarIcon className="w-3 h-3 text-neutral-400" />
                              <span>Syncing to Google Calendar...</span>
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                    <button
                      onClick={() => setSelectedBookingDetails(b)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors"
                    >
                      View Details
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openClientMessage(b.customerId, b.customerName)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-sky-400 transition-colors flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message Client</span>
                      </button>

                      {/* Pending Lifecycle Actions */}
                      {b.status === 'pending' && isCreator && !b.isArchived && (
                        <>
                          <button
                            onClick={() => handleAcceptBooking(b.bookingId)}
                            disabled={statusActionLoading === b.bookingId}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleOpenDeclineModal(b.bookingId)}
                            disabled={statusActionLoading === b.bookingId}
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {/* Accepted Lifecycle Actions */}
                      {b.status === 'accepted' && isCreator && !b.isArchived && (
                        <>
                          <button
                            onClick={() => handleConfirmBooking(b.bookingId)}
                            disabled={statusActionLoading === b.bookingId}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                          >
                            Confirm Shoot
                          </button>
                          <button
                            onClick={() => handleOpenCancelModal(b)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-300 text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {/* Confirmed Lifecycle Actions */}
                      {b.status === 'confirmed' && isCreator && !b.isArchived && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenRescheduleModal(b)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>Reschedule</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkBookingCompleted(b.bookingId)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(b)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-300 text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {/* Archive / Restore / Delete Button */}
                      {b.isArchived ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRestoreBooking(b)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBooking(b)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
                            title="Delete booking permanently from database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {(b.status === 'completed' || b.status === 'declined' || b.status === 'cancelled' || b.isCancelled) && (
                            <button
                              type="button"
                              onClick={() => handleArchiveBooking(b)}
                              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>Archive</span>
                            </button>
                          )}
                          {(b.status === 'cancelled' || b.isCancelled || b.status === 'declined') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(b)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
                              title="Delete booking permanently from database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: SERVICES & PACKAGES MANAGEMENT                                       */}
      {/* ========================================================================= */}
      {activeTab === 'services' && isCreator && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Services &amp; Rates
                </span>
                <span className="text-xs text-neutral-400">Bangladeshi Taka (৳ BDT)</span>
              </div>
              <h2 className="text-xl font-black text-white font-['Space_Grotesk']">
                Creative Services &amp; Packages
              </h2>
              <p className="text-xs text-neutral-400 max-w-2xl">
                Define the shoot tiers, deliverables, turnaround schedules, and base rates clients can book directly.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddService}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Service</span>
            </button>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/60 rounded-3xl border border-neutral-800 p-8 space-y-4">
              <Briefcase className="w-12 h-12 text-neutral-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Services Published Yet</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Publish packages like "Full Day Wedding Cinematography", "Commercial Lookbook Shoot", or "Color Grading & Master Delivery" so clients can book you with transparent pricing.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenAddService}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 inline-flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Service</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div
                  key={service.serviceId}
                  className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-neutral-950 text-neutral-300 border border-neutral-800">
                        {service.category || 'Production'}
                      </span>
                      <span className="text-base font-black text-amber-400 font-mono">
                        ৳{(service.startingPrice || 0).toLocaleString()} BDT
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white font-['Space_Grotesk']">
                      {service.title}
                    </h4>

                    {service.description && (
                      <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/80 p-3 rounded-2xl border border-neutral-800/80">
                        {service.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800/80 space-y-0.5">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold block">Turnaround</span>
                        <span className="text-neutral-200 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {service.deliveryTime || '14 Days'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800/80 space-y-0.5">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold block">Coverage</span>
                        <span className="text-neutral-200 font-medium truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          {service.location || 'On-Location'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenEditService(service)}
                      className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Service</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteServiceWithConfirm(service)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 font-bold transition flex items-center gap-1.5 border border-rose-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ACTIVE PROJECTS (CUSTOMER & PRODUCTION WORKSPACE)                   */}
      {/* ========================================================================= */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Active Projects &amp; Deliverables</h2>
            <p className="text-xs text-neutral-400">Track production milestones, review drafts, and access Google Drive project folders</p>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/60 rounded-3xl border border-neutral-800 p-8 space-y-4">
              <HardDrive className="w-12 h-12 text-neutral-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Active Projects Yet</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  When a creator confirms your booking request, your dedicated project workspace and deliverable links will appear here.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onGoHome}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 inline-flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Explore Creators</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.projectId}
                  className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                          {proj.projectId}
                        </span>
                        <h4 className="text-base font-bold text-white mt-0.5">{proj.title}</h4>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {proj.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-neutral-300 bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800/80">
                      <p>
                        <strong className="text-neutral-400 font-normal">Creator:</strong>{' '}
                        <span className="text-white font-medium">{proj.creatorName || 'Professional Creator'}</span>
                      </p>
                      {proj.startDate && (
                        <p>
                          <strong className="text-neutral-400 font-normal">Start Date:</strong> {proj.startDate}
                        </p>
                      )}
                      {proj.deliveryDate && (
                        <p>
                          <strong className="text-neutral-400 font-normal">Estimated Delivery:</strong> {proj.deliveryDate}
                        </p>
                      )}
                      {proj.notes && (
                        <p className="text-neutral-400 text-[11px] pt-1 border-t border-neutral-800/80">
                          {proj.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                    {proj.driveFolderId ? (
                      <a
                        href={`https://drive.google.com/drive/folders/${proj.driveFolderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors inline-flex items-center gap-1.5"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Deliverables Folder</span>
                        <ExternalLink className="w-3 h-3 text-neutral-400" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-neutral-500">Workspace initializing</span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openClientMessage(proj.creatorId, proj.creatorName)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-sky-400 transition-colors flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CALENDAR & AVAILABILITY                                            */}
      {/* ========================================================================= */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Production Calendar &amp; Availability
              </h2>
              <p className="text-xs text-neutral-400">
                Manage your booking schedule, block blackout dates, and avoid shoot conflicts
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-400">Selected Date:</span>
              <span className="px-3 py-1 rounded-xl bg-neutral-950 text-xs font-mono font-bold text-white border border-neutral-800">
                {selectedDate}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* INDIVIDUAL GOOGLE CALENDAR SYNCHRONIZATION CARD                            */}
          {/* ========================================================================= */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                      Personal Google Calendar Integration
                    </h3>
                    {session.creator?.calendarConnected ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Connected &amp; Active</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Individual calendar sync for confirmed production shoots, schedules &amp; time blocks
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {session.creator?.calendarConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSyncGoogleCalendarNow}
                      disabled={isSyncingCalendarNow}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 text-blue-400 ${isSyncingCalendarNow ? 'animate-spin' : ''}`} />
                      <span>{isSyncingCalendarNow ? 'Syncing...' : 'Sync Now'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnectGoogleCalendarWithConfirm}
                      className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-neutral-800 transition"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarEmailInput(session.creator?.calendarEmail || session.user.email || '');
                      setShowConnectCalendarModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-blue-500/20"
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>Connect Google Calendar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Calendar details or setup nudge */}
            {session.creator?.calendarConnected ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 space-y-0.5">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                    Syncing Target Email
                  </span>
                  <span className="text-white font-mono font-medium truncate block">
                    {session.creator?.calendarEmail || session.user.email}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 space-y-0.5">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                    Last Full Synchronization
                  </span>
                  <span className="text-neutral-300 font-medium block">
                    {session.creator?.calendarLastSyncAt
                      ? new Date(session.creator.calendarLastSyncAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Active & Real-Time'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 space-y-0.5">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                    Sync Features Active
                  </span>
                  <span className="text-emerald-400 font-medium block">
                    Auto-Events, Conflict Block &amp; Reschedule
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-neutral-200">
                    Why synchronize your Google Calendar?
                  </p>
                  <p className="text-neutral-400 text-[11px] leading-relaxed max-w-2xl">
                    Whenever you confirm a shoot on CreatorFlow, an event is automatically scheduled in your Google Calendar with client contacts, shoot location, budget (৳ BDT), and brief notes. Rescheduling or cancelling updates your Google Calendar instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarEmailInput(session.creator?.calendarEmail || session.user.email || '');
                    setShowConnectCalendarModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition shrink-0 self-start sm:self-auto"
                >
                  Setup Calendar Sync
                </button>
              </div>
            )}
          </div>

          {/* Quick Availability Status Selector */}
          <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-400" />
                  Storefront Availability Status
                </h3>
                <p className="text-xs text-neutral-400">
                  Clients browsing your profile see this live badge on your cards and calendar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSaveAvailabilityStatus(creatorAvailabilityStatus)}
                disabled={isSavingAvailabilityStatus}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-rose-500/20 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingAvailabilityStatus ? 'Saving...' : 'Save Availability Status'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                { id: 'Available', label: 'Available for Shoots', desc: 'Accepting new bookings', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-300' },
                { id: 'Limited', label: 'Limited Availability', desc: 'Few dates remaining', color: 'border-amber-500 bg-amber-500/10 text-amber-300' },
                { id: 'Busy', label: 'Busy / In Production', desc: 'Heavy shooting schedule', color: 'border-purple-500 bg-purple-500/10 text-purple-300' },
                { id: 'Unavailable', label: 'Unavailable / Offline', desc: 'Not taking inquiries', color: 'border-rose-500 bg-rose-500/10 text-rose-300' },
              ].map((st) => (
                <div
                  key={st.id}
                  onClick={() => setCreatorAvailabilityStatus(st.id as any)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    creatorAvailabilityStatus === st.id
                      ? `${st.color} shadow-lg ring-1 ring-white/10`
                      : 'border-neutral-800 bg-neutral-950/80 hover:border-neutral-700 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{st.label}</span>
                    {creatorAvailabilityStatus === st.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-current shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Interactive Month Grid (2 cols) */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">{monthName}</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const prev = new Date(calendarMonth);
                      prev.setMonth(prev.getMonth() - 1);
                      setCalendarMonth(prev);
                    }}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCalendarMonth(new Date())}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const next = new Date(calendarMonth);
                      next.setMonth(next.getMonth() + 1);
                      setCalendarMonth(next);
                    }}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-neutral-500 py-1">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1.5 text-xs">
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-20 rounded-xl bg-neutral-950/20" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const isBlocked = availability.some(
                    (a) => a.date === dateStr && a.status === 'unavailable'
                  );
                  const hasBooking = bookings.some(
                    (b) => b.eventDate === dateStr && b.status === 'confirmed'
                  );
                  const hasPending = bookings.some(
                    (b) => b.eventDate === dateStr && b.status === 'pending'
                  );

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`h-20 p-2 rounded-2xl cursor-pointer transition-all flex flex-col justify-between border ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                          : isBlocked
                          ? 'border-rose-900/60 bg-rose-950/20 text-rose-300'
                          : hasBooking
                          ? 'border-emerald-800/80 bg-emerald-950/20 text-emerald-300'
                          : hasPending
                          ? 'border-amber-800/80 bg-amber-950/20 text-amber-300'
                          : 'border-neutral-800/80 bg-neutral-950 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                          {dayNum}
                        </span>
                        {isBlocked && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" title="Blocked" />
                        )}
                        {hasBooking && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" title="Confirmed Shoot" />
                        )}
                        {hasPending && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" title="Pending Request" />
                        )}
                      </div>

                      <div className="text-[10px] leading-tight truncate">
                        {isBlocked && <span className="text-rose-400 font-semibold">Blocked</span>}
                        {hasBooking && <span className="text-emerald-400 font-semibold">Shoot</span>}
                        {!isBlocked && !hasBooking && hasPending && (
                          <span className="text-amber-400 font-semibold">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Confirmed Booking
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Pending Inquiry
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Blocked Out
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-neutral-700" />
                  Available
                </span>
              </div>
            </div>

            {/* Sidebar Controls for Selected Date */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Date Details: {selectedDate}
                </h3>

                {availability.some((a) => a.date === selectedDate && a.status === 'unavailable') ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Date Currently Blocked / Unavailable</span>
                      </p>
                      <p className="text-[11px] text-rose-300/80">
                        Clients browsing your profile see this date marked as unavailable for shoots.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockDateWithConfirm(selectedDate)}
                      className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Remove Blackout Date</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-400">
                      This date is open for new bookings. You can block it off for personal time or private shoots.
                    </p>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        Blackout Reason / Notes
                      </label>
                      <input
                        type="text"
                        value={blockNotesInput}
                        onChange={(e) => setBlockNotesInput(e.target.value)}
                        placeholder="Reason (e.g. Travel, Commercial shoot)"
                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleBlockSelectedDate}
                      disabled={isBlockingDate}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 disabled:opacity-50"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isBlockingDate ? 'Saving...' : 'Save Blackout Date'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Blocked Dates Management List */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                    Blocked Dates ({availability.filter((a) => a.status === 'unavailable').length})
                  </h3>
                  <span className="text-[10px] text-neutral-500 font-medium">Production blackout</span>
                </div>

                {availability.filter((a) => a.status === 'unavailable').length === 0 ? (
                  <div className="text-center py-6 bg-neutral-950/40 rounded-2xl border border-neutral-800/80 p-4">
                    <Clock className="w-6 h-6 text-neutral-600 mx-auto mb-1.5" />
                    <p className="text-xs text-neutral-400">No blackout dates configured</p>
                    <p className="text-[10px] text-neutral-600">All calendar dates are open for shoot inquiries</p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                    {availability
                      .filter((a) => a.status === 'unavailable')
                      .map((slot) => (
                        <div
                          key={slot.availabilityId || slot.date}
                          className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between text-xs hover:border-neutral-700 transition"
                        >
                          <div>
                            <p className="font-bold text-white font-mono">{slot.date}</p>
                            <p className="text-[10px] text-neutral-400">{slot.notes || 'Blocked out'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnblockDateWithConfirm(slot.date)}
                            className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 text-[10px] font-bold transition flex items-center gap-1 border border-neutral-800"
                            title="Remove blackout date"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove Date</span>
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PORTFOLIO STUDIO                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Portfolio Studio Showcase
              </h2>
              <p className="text-xs text-neutral-400">
                Curate your public photography, cinematography, and grading showcases
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPortfolioItem(null);
                setUploadTitle('');
                setUploadFileBase64('');
                setUploadFileName('');
                setShowUploadModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Work</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {['all', 'photography', 'cinematography', 'editing'].map((cat) => (
              <button
                key={cat}
                onClick={() => setPortfolioCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold capitalize transition-colors shrink-0 ${
                  portfolioCategoryFilter === cat
                    ? 'bg-rose-500 text-white'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {cat === 'all' ? `All Works (${portfolio.length})` : cat}
              </button>
            ))}
          </div>

          {/* Portfolio Grid */}
          {portfolio.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/60 rounded-3xl border border-neutral-800 p-8 space-y-4">
              <HardDrive className="w-12 h-12 text-neutral-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Upload Your First Work</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Add high-resolution image sets, cinema stills, or project deliverables to build your showcase and impress clients.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setEditingPortfolioItem(null);
                    setUploadTitle('');
                    setUploadFileBase64('');
                    setUploadFileName('');
                    setShowUploadModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 inline-flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload First Work</span>
                </button>
              </div>
            </div>
          ) : portfolio.filter(
            (p) => portfolioCategoryFilter === 'all' || p.category === portfolioCategoryFilter
          ).length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/60 rounded-3xl border border-neutral-800 p-8 space-y-3">
              <HardDrive className="w-10 h-10 text-neutral-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Items in this Category</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                No items found for category "{portfolioCategoryFilter}".
              </p>
              <button
                onClick={() => setPortfolioCategoryFilter('all')}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-bold"
              >
                Show All Works
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio
                .filter(
                  (p) => portfolioCategoryFilter === 'all' || p.category === portfolioCategoryFilter
                )
                .map((item) => (
                  <div
                    key={item.portfolioId}
                    className="group relative rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all shadow-xl flex flex-col justify-between"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
                      <img
                        src={normalizeGoogleDriveImageUrl(item.thumbnailUrl || item.fileUrl, 800)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = '0.5';
                        }}
                      />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md text-[10px] font-bold text-neutral-200 uppercase border border-neutral-800">
                        {item.category}
                      </div>

                      <button
                        onClick={() => handleToggleFeatured(item)}
                        className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md transition-colors ${
                          item.featured
                            ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                            : 'bg-neutral-950/80 text-neutral-400 hover:text-white'
                        }`}
                        title={item.featured ? 'Featured on Profile' : 'Mark as Featured'}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.featured ? 'fill-black' : ''}`} />
                      </button>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-rose-400 transition-colors">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                        <button
                          onClick={() => {
                            setEditingPortfolioItem(item);
                            setUploadTitle(item.title);
                            setUploadCategory(item.category);
                            setUploadCustomUrl(item.fileUrl);
                            setShowUploadModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white flex items-center gap-1.5 font-semibold text-xs transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Edit Work</span>
                        </button>

                        <button
                          onClick={() => handleDeletePortfolioItemWithConfirm(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 flex items-center gap-1.5 font-semibold text-xs transition-colors border border-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Work</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MESSAGES                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Client Messages</h2>
              <p className="text-xs text-neutral-400">Direct inquiries, project coordination, and scheduling</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[550px]">
            {/* Conversation List */}
            <div className="border border-neutral-800 rounded-2xl bg-neutral-950 p-3 flex flex-col space-y-3 overflow-hidden">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {conversations.length === 0 ? (
                  <div className="text-center py-12 px-3 space-y-2 text-neutral-400">
                    <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-xs font-semibold text-neutral-300">
                      {isCreator
                        ? 'Clients will message you here when interested in your services.'
                        : 'Your conversations with creative talent will appear here.'}
                    </p>
                    <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                      Direct production inquiries and project requests will appear here once initiated.
                    </p>
                  </div>
                ) : (
                  conversations
                    .filter(
                      (c) =>
                        !conversationSearch ||
                        c.otherUserName?.toLowerCase().includes(conversationSearch.toLowerCase())
                    )
                    .map((conv) => (
                      <div
                        key={conv.conversationId}
                        onClick={() => handleSelectConversation(conv.conversationId)}
                        className={`p-3 rounded-xl cursor-pointer transition-colors flex items-center gap-3 ${
                          activeConversationId === conv.conversationId
                            ? 'bg-rose-500/15 border border-rose-500/30'
                            : 'hover:bg-neutral-900 border border-transparent'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs text-white shrink-0">
                          {conv.otherUserName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{conv.otherUserName}</p>
                              {conv.isGuest && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                  Guest Inquiry
                                </span>
                              )}
                            </div>
                            {conv.unreadCount > 0 && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">{conv.lastMessage}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Chat Messages Panel */}
            <div className="md:col-span-2 border border-neutral-800 rounded-2xl bg-neutral-950 flex flex-col overflow-hidden">
              {activeConversationId ? (
                <>
                  {/* Chat header */}
                  <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-bold text-xs text-white">
                        {conversations.find((c) => c.conversationId === activeConversationId)?.otherUserName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">
                            {conversations.find((c) => c.conversationId === activeConversationId)?.otherUserName || 'Client'}
                          </p>
                          {conversations.find((c) => c.conversationId === activeConversationId)?.isGuest && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Guest Inquiry
                            </span>
                          )}
                        </div>
                        {conversations.find((c) => c.conversationId === activeConversationId)?.isGuest ? (
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                            <span>
                              Email: <strong className="text-neutral-200">{conversations.find((c) => c.conversationId === activeConversationId)?.guestEmail}</strong>
                            </span>
                            {conversations.find((c) => c.conversationId === activeConversationId)?.guestPhone && (
                              <span>
                                • Phone: <strong className="text-neutral-200">{conversations.find((c) => c.conversationId === activeConversationId)?.guestPhone}</strong>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400">Direct production chat</span>
                        )}
                      </div>
                    </div>

                    {/* Conversation Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleArchiveConversation(activeConversationId)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
                        title="Archive Conversation"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(activeConversationId)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 transition"
                        title="Delete Conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages bubble stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.length === 0 ? (
                      <p className="text-xs text-neutral-500 text-center py-16">
                        No messages yet. Send a message to start this discussion.
                      </p>
                    ) : (
                      chatMessages.map((m) => {
                        const isMe = m.senderId === session.user.userId;
                        return (
                          <div key={m.messageId} className={`flex items-end gap-1.5 group ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {isMe && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(m.messageId)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-500 hover:text-rose-400 transition"
                                title="Delete Message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <div
                              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs space-y-1 ${
                                isMe
                                  ? 'bg-rose-600 text-white rounded-br-none'
                                  : 'bg-neutral-800 text-neutral-200 rounded-bl-none'
                              }`}
                            >
                              <p className="leading-relaxed">{m.message}</p>
                              <span className="text-[9px] opacity-70 block text-right font-mono">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Quick message suggestions */}
                  <div className="px-4 py-2 border-t border-neutral-900 bg-neutral-950 flex gap-2 overflow-x-auto text-[11px] no-scrollbar">
                    <button
                      type="button"
                      onClick={() => handleSendMessage(undefined, 'Hi! I am available for that date.')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white shrink-0 border border-neutral-800"
                    >
                      "Hi! I am available for that date."
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage(undefined, 'Could you share the shoot location details?')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white shrink-0 border border-neutral-800"
                    >
                      "Could you share location details?"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage(undefined, 'Confirmed! Looking forward to the production.')}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white shrink-0 border border-neutral-800"
                    >
                      "Confirmed! Looking forward to it."
                    </button>
                  </div>

                  {/* Input bar */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-800 flex gap-2">
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={!newMessageText.trim()}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500 space-y-2">
                  <MessageSquare className="w-8 h-8 text-neutral-700" />
                  <p className="text-xs">Select a conversation from the left to view messages</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SETTINGS                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && isCreator && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Creator Settings</h2>
              <p className="text-xs text-neutral-400">
                Update storefront details, pricing in ৳ BDT, gear lists, and contact info
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (session.creator) {
                    setSettingsForm({
                      displayName: session.creator.displayName || session.user.fullName || '',
                      username: session.creator.username || '',
                      bio: session.creator.bio || '',
                      startingPrice: session.creator.startingPrice || 0,
                      experienceYears: session.creator.experienceYears || 1,
                      city: session.creator.city || 'Dhaka',
                      district: session.creator.district || '',
                      country: session.creator.country || 'Bangladesh',
                      phone: session.user.phone || '',
                      roles: session.creator.roles || ['Photographer'],
                      instagram: session.creator.instagram || '',
                      youtube: session.creator.youtube || '',
                      facebook: session.creator.facebook || '',
                      tiktok: session.creator.tiktok || '',
                      linkedin: session.creator.linkedin || '',
                      website: session.creator.website || '',
                    });
                    setSkillsList(session.creator.skills || []);
                    setEquipmentList(session.creator.equipment || []);
                    setServiceAreasList(session.creator.serviceAreas || []);
                    setSettingsSuccessToast('Reverted unsaved profile changes.');
                    setTimeout(() => setSettingsSuccessToast(null), 2500);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
              >
                Discard
              </button>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>

          {/* Visual Assets & Photos Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Avatar Card */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-rose-400" />
                    Profile Avatar
                  </h3>
                  <p className="text-xs text-neutral-400">Square photo recommended (min 400x400)</p>
                </div>
                {session.creator?.profileImageUrl && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Custom Photo Active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-5 pt-2">
                <SafeAvatar
                  src={session.creator?.profileImageUrl || session.user.profileImage}
                  name={session.creator?.displayName || session.user.fullName}
                  className="w-20 h-20 rounded-2xl ring-2 ring-neutral-700 shadow-xl shrink-0"
                  size={600}
                />
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload &amp; Adjust Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSelectProfilePhotoFile}
                        className="hidden"
                      />
                    </label>

                    {(session.creator?.profileImageUrl || session.user.profileImage) && (
                      <button
                        type="button"
                        onClick={handleRemoveProfilePhotoWithConfirm}
                        className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-neutral-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    JPG, PNG or WebP. Interactive crop &amp; zoom preview included.
                  </p>
                </div>
              </div>
            </div>

            {/* Cover Banner Card */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    Cover Banner
                  </h3>
                  <p className="text-xs text-neutral-400">Storefront header background (16:9 or 3:1)</p>
                </div>
                {session.creator?.coverImageUrl && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Custom Banner Active
                  </span>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <div className="h-20 w-full rounded-2xl overflow-hidden bg-neutral-950 relative border border-neutral-800">
                  <SafeCover
                    src={session.creator?.coverImageUrl}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 transition border border-neutral-700">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload &amp; Reposition Banner</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSelectCoverPhotoFile}
                      className="hidden"
                    />
                  </label>

                  {session.creator?.coverImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveCoverPhotoWithConfirm}
                      className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-neutral-800 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Banner</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Storefront Info */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
              <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-rose-400" />
                Storefront Information
              </h3>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  value={settingsForm.displayName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Username Handle (@) *</label>
                <input
                  type="text"
                  required
                  value={settingsForm.username}
                  onChange={(e) => setSettingsForm({ ...settingsForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Bio / Creative Summary</label>
                <textarea
                  rows={3}
                  value={settingsForm.bio}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bio: e.target.value })}
                  placeholder="Introduce your cinematic vision, directing philosophy, or shooting style..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Starting Price (৳ BDT)</label>
                  <input
                    type="number"
                    value={settingsForm.startingPrice}
                    onChange={(e) => setSettingsForm({ ...settingsForm, startingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Years Experience</label>
                  <input
                    type="number"
                    value={settingsForm.experienceYears}
                    onChange={(e) => setSettingsForm({ ...settingsForm, experienceYears: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Skills Interactive Tag Manager */}
              <div className="pt-2 border-t border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-300">
                    Creative Skills ({skillsList.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleSaveSkills}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Save Skills</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  {skillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 flex items-center gap-1.5"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(idx)}
                        className="text-neutral-500 hover:text-rose-400"
                        title="Delete skill"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {skillsList.length === 0 && (
                    <span className="text-neutral-500 text-xs italic">No skills added yet</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Add skill (e.g. Color Grading, RAW 4K, Drone)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Equipment Interactive Tag Manager */}
              <div className="pt-2 border-t border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-300">
                    Cameras &amp; Equipment Specs ({equipmentList.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleSaveEquipment}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Save Equipment</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  {equipmentList.map((eq, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 flex items-center gap-1.5"
                    >
                      <span>{eq}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipment(idx)}
                        className="text-neutral-500 hover:text-rose-400"
                        title="Delete equipment item"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {equipmentList.length === 0 && (
                    <span className="text-neutral-500 text-xs italic">No equipment listed</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEquipmentInput}
                    onChange={(e) => setNewEquipmentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEquipment();
                      }
                    }}
                    placeholder="Add gear (e.g. Sony FX3, Aputure 600d, DJI RS3)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddEquipment}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Location & Social Links */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Location &amp; Service Coverage
                </h3>

                {/* Primary District Selection */}
                <div className="space-y-4">
                  <BangladeshLocationSelect
                    mode="single"
                    value={settingsForm.district || settingsForm.city}
                    onChange={(val) => {
                      const dist = val as string;
                      setSettingsForm({ ...settingsForm, district: dist, city: dist });
                    }}
                    label="Primary District / Base City *"
                    placeholder="Search all 64 districts (e.g. Dhaka, Chittagong, Sylhet)..."
                  />

                  {/* Service Coverage Locations across 8 Divisions / All Bangladesh */}
                  <div className="pt-2 border-t border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400">
                        Select individual districts or choose Nationwide Coverage
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveServiceAreas}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save Coverage</span>
                      </button>
                    </div>

                    <BangladeshLocationSelect
                      mode="multiple"
                      value={serviceAreasList}
                      onChange={(areas) => setServiceAreasList(areas as string[])}
                      label={`Service Coverage Locations (${serviceAreasList.length})`}
                      placeholder="Search 64 districts or pick entire division..."
                    />
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  Social &amp; Portfolio Links
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-neutral-400 mb-1">Instagram (@)</label>
                    <input
                      type="text"
                      value={settingsForm.instagram}
                      onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                      placeholder="handle"
                      className="w-full px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">YouTube URL</label>
                    <input
                      type="text"
                      value={settingsForm.youtube}
                      onChange={(e) => setSettingsForm({ ...settingsForm, youtube: e.target.value })}
                      placeholder="youtube.com/@channel"
                      className="w-full px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={settingsForm.website}
                      onChange={(e) => setSettingsForm({ ...settingsForm, website: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Facebook URL</label>
                    <input
                      type="text"
                      value={settingsForm.facebook}
                      onChange={(e) => setSettingsForm({ ...settingsForm, facebook: e.target.value })}
                      placeholder="facebook.com/..."
                      className="w-full px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-4">
                <span className="text-xs text-neutral-400 font-medium">
                  Review and save all profile information
                </span>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>

              {/* Account & Security (Facebook-Style Deletion Lifecycle) */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                      <Lock className="w-4 h-4 text-rose-400" />
                      Account &amp; Security
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Manage account status, privacy settings, and data lifecycle
                    </p>
                  </div>
                  {session.user.accountStatus === 'PENDING_DELETION' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      Deletion Pending
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      Active Account
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <h4 className="text-xs font-bold text-neutral-200">
                      {session.user.accountStatus === 'PENDING_DELETION' ? 'Account Scheduled for Deletion' : 'Delete Account (Facebook-Style 30-Day Grace Period)'}
                    </h4>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {session.user.accountStatus === 'PENDING_DELETION'
                        ? 'Your account deletion request is active. You can cancel this request at any time within the 30-day window to reactivate your storefront.'
                        : 'Schedule your account for permanent removal. Your storefront and services will be hidden immediately, with a 30-day window to cancel and restore your profile anytime.'}
                    </p>
                  </div>

                  {session.user.accountStatus === 'PENDING_DELETION' ? (
                    <button
                      type="button"
                      onClick={handleCancelDeletion}
                      disabled={isCancellingDeletion}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shrink-0 flex items-center gap-1.5"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isCancellingDeletion ? 'animate-spin' : ''}`} />
                      <span>{isCancellingDeletion ? 'Restoring...' : 'Cancel Deletion'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteAccountModal(true)}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-bold transition shrink-0 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Account</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ADMIN CONTROL (SPOTLIGHTPHOTOGRAPHY MOTHER ADMIN)                   */}
      {/* ========================================================================= */}
      {activeTab === 'admin' && isAdmin && (
        <div className="space-y-6">
          {/* Admin Header & Cloud Config Bar */}
          <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Mother Admin
                </span>
                <span className="text-xs text-neutral-400 font-medium">SpotlightPhotography • CreatorFlow</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Space_Grotesk'] tracking-tight">
                Freelancers &amp; Placement Directory
              </h2>
              <p className="text-xs text-neutral-400 max-w-2xl">
                Curate verified creative talent and manage Featured Freelancer carousel placements across the marketplace.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const [stats, creatorsList] = await Promise.all([adminGetDashboard(), getCreators()]);
                    setAdminStats(stats);
                    setAllCreators(creatorsList);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Refresh directory data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={onOpenSetup}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>System Cloud Config</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {adminToast && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium">{adminToast}</span>
              </div>
              <button onClick={() => setAdminToast(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 4 Stat Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Total Freelancers
              </span>
              <p className="text-2xl font-black text-white font-['Space_Grotesk'] mt-1">
                {allCreators.length}
              </p>
              <span className="text-[10px] text-neutral-400">Registered creators</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 fill-amber-400" />
                Featured Talent
              </span>
              <p className="text-2xl font-black text-amber-400 font-['Space_Grotesk'] mt-1">
                {allCreators.filter((c) => c.featured).length}
              </p>
              <span className="text-[10px] text-amber-400/80">Active in homepage carousel</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified Creatives
              </span>
              <p className="text-2xl font-black text-white font-['Space_Grotesk'] mt-1">
                {allCreators.filter((c) => c.verified).length}
              </p>
              <span className="text-[10px] text-neutral-400">Spotlight vetted</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Pending Verification
              </span>
              <p className="text-2xl font-black text-neutral-300 font-['Space_Grotesk'] mt-1">
                {allCreators.filter((c) => !c.verified).length}
              </p>
              <span className="text-[10px] text-neutral-400">Awaiting vetting</span>
            </div>
          </div>

          {/* Search Bar & Filter Tabs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setAdminCreatorFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    adminCreatorFilter === 'all'
                      ? 'bg-white text-black shadow'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  All ({allCreators.length})
                </button>

                <button
                  onClick={() => setAdminCreatorFilter('featured')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                    adminCreatorFilter === 'featured'
                      ? 'bg-amber-500 text-black shadow'
                      : 'bg-neutral-900 text-neutral-400 hover:text-amber-300 border border-neutral-800'
                  }`}
                >
                  <Crown className="w-3 h-3" />
                  Featured ({allCreators.filter((c) => c.featured).length})
                </button>

                <button
                  onClick={() => setAdminCreatorFilter('verified')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                    adminCreatorFilter === 'verified'
                      ? 'bg-sky-500 text-black shadow'
                      : 'bg-neutral-900 text-neutral-400 hover:text-sky-300 border border-neutral-800'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  Verified ({allCreators.filter((c) => c.verified).length})
                </button>

                <button
                  onClick={() => setAdminCreatorFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    adminCreatorFilter === 'pending'
                      ? 'bg-rose-500 text-white shadow'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  Pending ({allCreators.filter((c) => !c.verified).length})
                </button>

                <button
                  onClick={() => setAdminCreatorFilter('suspended')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    adminCreatorFilter === 'suspended'
                      ? 'bg-neutral-700 text-white shadow'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  Suspended ({allCreators.filter((c) => (c as any).status === 'suspended').length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={adminCreatorSearch}
                  onChange={(e) => setAdminCreatorSearch(e.target.value)}
                  placeholder="Search by name, @handle, role, city..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                />
                {adminCreatorSearch && (
                  <button
                    onClick={() => setAdminCreatorSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 11-COLUMN ADMIN CREATOR MANAGEMENT TABLE */}
          {(() => {
            const filtered = allCreators.filter((c) => {
              if (adminCreatorFilter === 'featured' && !c.featured) return false;
              if (adminCreatorFilter === 'verified' && !c.verified) return false;
              if (adminCreatorFilter === 'pending' && c.verified) return false;
              if (adminCreatorFilter === 'suspended' && (c as any).status !== 'suspended') return false;

              if (adminCreatorSearch.trim()) {
                const q = adminCreatorSearch.toLowerCase().trim();
                const matchName = (c.displayName || '').toLowerCase().includes(q);
                const matchUsername = (c.username || '').toLowerCase().includes(q);
                const matchCity = (c.city || '').toLowerCase().includes(q);
                const matchRoles = (c.roles || []).some((r) => r.toLowerCase().includes(q));
                if (!matchName && !matchUsername && !matchCity && !matchRoles) return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-12 text-center rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
                  <UserIcon className="w-10 h-10 text-neutral-600 mx-auto" />
                  <p className="text-sm font-bold text-white">No freelancers match your filter</p>
                  <p className="text-xs text-neutral-400">Try adjusting your search query or switching tabs.</p>
                  <button
                    onClick={() => {
                      setAdminCreatorFilter('all');
                      setAdminCreatorSearch('');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-semibold"
                  >
                    Reset Filters
                  </button>
                </div>
              );
            }

            return (
              <div className="rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="bg-neutral-950/80 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                      <tr>
                        <th className="py-3.5 px-4 w-12">Profile</th>
                        <th className="py-3.5 px-4">Name</th>
                        <th className="py-3.5 px-4">Primary Role</th>
                        <th className="py-3.5 px-4">Location</th>
                        <th className="py-3.5 px-3">Rating</th>
                        <th className="py-3.5 px-3">Reviews</th>
                        <th className="py-3.5 px-4">Verification</th>
                        <th className="py-3.5 px-3">Account</th>
                        <th className="py-3.5 px-4">Featured</th>
                        <th className="py-3.5 px-3">Joined</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-medium">
                      {filtered.map((c) => {
                        const isSuspended = (c as any).status === 'suspended';
                        const joinedStr = c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent';

                        return (
                          <tr
                            key={c.creatorId}
                            className={`hover:bg-neutral-800/40 transition-colors ${
                              c.featured ? 'bg-amber-500/[0.02]' : ''
                            }`}
                          >
                            {/* 1. Profile Avatar */}
                            <td className="py-3.5 px-4">
                              <SafeAvatar
                                src={c.profileImageUrl}
                                name={c.displayName}
                                className="w-10 h-10 rounded-xl border border-neutral-800"
                                size={400}
                              />
                            </td>

                            {/* 2. Name & Username */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  {c.displayName}
                                  {c.verified && (
                                    <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                  )}
                                </span>
                                <span className="text-[11px] text-neutral-500 font-mono">
                                  @{c.username}
                                </span>
                              </div>
                            </td>

                            {/* 3. Primary Role */}
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 font-medium text-[11px] inline-block whitespace-nowrap">
                                {c.roles?.[0] || 'Creative'}
                              </span>
                            </td>

                            {/* 4. Location */}
                            <td className="py-3.5 px-4">
                              <span className="flex items-center gap-1 text-neutral-300 whitespace-nowrap">
                                <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                                {c.city || 'Dhaka'}
                              </span>
                            </td>

                            {/* 5. Rating */}
                            <td className="py-3.5 px-3">
                              <span className="flex items-center gap-1 text-amber-400 font-bold">
                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                {(c.rating || 5.0).toFixed(1)}
                              </span>
                            </td>

                            {/* 6. Review Count */}
                            <td className="py-3.5 px-3">
                              <span className="text-neutral-400 whitespace-nowrap">
                                {c.reviewCount || 0} reviews
                              </span>
                            </td>

                            {/* 7. Verification Status */}
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => handleVerifyCreatorToggle(c.creatorId, !c.verified)}
                                title={c.verified ? 'Revoke verified badge' : 'Grant verified badge'}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
                                  c.verified
                                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25'
                                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700/60 hover:text-white hover:border-neutral-500'
                                }`}
                              >
                                {c.verified ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 text-sky-400" />
                                    <span>Verified</span>
                                  </>
                                ) : (
                                  <span>Unverified</span>
                                )}
                              </button>
                            </td>

                            {/* 8. Account Status */}
                            <td className="py-3.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                  isSuspended
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSuspended ? 'bg-rose-400' : 'bg-emerald-400'
                                  }`}
                                />
                                {isSuspended ? 'Suspended' : 'Active'}
                              </span>
                            </td>

                            {/* 9. Featured Status */}
                            <td className="py-3.5 px-4">
                              {c.featured ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10">
                                  <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  Featured
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-neutral-500 bg-neutral-800/60 border border-neutral-800">
                                  Not Featured
                                </span>
                              )}
                            </td>

                            {/* 10. Joined Date */}
                            <td className="py-3.5 px-3 text-neutral-400 text-[11px] whitespace-nowrap">
                              {joinedStr}
                            </td>

                            {/* 11. Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {c.featured ? (
                                  <button
                                    onClick={() => handleOpenFeaturedModal(c, false)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition"
                                    title="Remove from homepage carousel"
                                  >
                                    Remove Featured
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenFeaturedModal(c, true)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-sm shadow-amber-500/20 transition flex items-center gap-1.5"
                                    title="Feature in homepage carousel"
                                  >
                                    <Crown className="w-3.5 h-3.5 fill-black" />
                                    <span>Mark Featured</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setAdminDetailCreator(c)}
                                  className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
                                  title="Inspect full creator details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    if (onViewPublicProfile) {
                                      onViewPublicProfile(c.username);
                                    } else {
                                      window.location.href = `/creator/${c.username}`;
                                    }
                                  }}
                                  className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
                                  title="View live public profile"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-neutral-950/70 border-t border-neutral-800 text-[11px] text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span>
                    Showing {filtered.length} of {allCreators.length} creative professionals
                  </span>
                  <span className="text-neutral-500">
                    Featured status is strictly managed by SpotlightPhotography Mother Admin.
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BOOKING DETAILS DRAWER                                            */}
      {/* ========================================================================= */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                  {selectedBookingDetails.bookingId}
                </span>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  {selectedBookingDetails.projectTitle}
                </h3>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  selectedBookingDetails.status === 'confirmed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : selectedBookingDetails.status === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {selectedBookingDetails.status}
              </span>
            </div>

            <div className="space-y-2.5 text-xs bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
              <div className="flex justify-between">
                <span className="text-neutral-400">Client Name:</span>
                <span className="text-white font-semibold">
                  {selectedBookingDetails.customerName || 'Direct Client'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Shoot Date:</span>
                <span className="text-white font-semibold">{selectedBookingDetails.eventDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Hours:</span>
                <span className="text-white font-semibold">
                  {selectedBookingDetails.startTime || '10:00'} - {selectedBookingDetails.endTime || '18:00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Location:</span>
                <span className="text-white font-semibold">
                  {selectedBookingDetails.location || 'On-Location'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Total Budget:</span>
                <span className="text-amber-400 font-bold font-mono">
                  ৳{selectedBookingDetails.budget.toLocaleString()} BDT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Payment Status:</span>
                <span className="text-neutral-200 capitalize">
                  {selectedBookingDetails.paymentStatus.replace('_', ' ')}
                </span>
              </div>
              {selectedBookingDetails.message && (
                <div className="pt-2 border-t border-neutral-800">
                  <span className="text-neutral-400 block mb-1">Client Message:</span>
                  <p className="text-neutral-300 italic">"{selectedBookingDetails.message}"</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingDetails(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const custId = selectedBookingDetails.customerId;
                    const custName = selectedBookingDetails.customerName;
                    setSelectedBookingDetails(null);
                    openClientMessage(custId, custName);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-sky-400 flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message Client</span>
                </button>

                {selectedBookingDetails.status === 'pending' && isCreator && (
                  <button
                    type="button"
                    onClick={() => handleAcceptBooking(selectedBookingDetails.bookingId)}
                    disabled={statusActionLoading === selectedBookingDetails.bookingId}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    Accept Booking
                  </button>
                )}

                {selectedBookingDetails.status === 'accepted' && isCreator && (
                  <button
                    type="button"
                    onClick={() => handleConfirmBooking(selectedBookingDetails.bookingId)}
                    disabled={statusActionLoading === selectedBookingDetails.bookingId}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    Confirm Schedule
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PORTFOLIO UPLOAD & EDIT                                            */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
              {editingPortfolioItem ? 'Edit Portfolio Work' : 'Upload Work to Portfolio'}
            </h3>
            <p className="text-xs text-neutral-400">
              Present your finest commercial, wedding, and cinema captures in your public showcase.
            </p>

            <form onSubmit={handleSavePortfolioUpload} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Work Title *</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Sunset Drone Panoramas"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Category *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="photography">Photography</option>
                  <option value="cinematography">Cinematography</option>
                  <option value="editing">Editing &amp; Color Grading</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Upload Image File {!editingPortfolioItem && '*'}
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700"
                />
                {uploadFileName && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                    <span>Selected: {uploadFileName}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setEditingPortfolioItem(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-800 text-xs text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {isUploading ? 'Saving...' : editingPortfolioItem ? 'Save Portfolio Changes' : 'Save Portfolio Item'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUBMIT REVIEW                                                      */}
      {/* ========================================================================= */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
              Review {reviewBooking.creatorName || 'Creator'}
            </h3>
            <p className="text-xs text-neutral-400">
              Your feedback rewards excellence and helps other clients hire with confidence.
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Overall Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setReviewRating(num)}
                      className="p-1"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          num <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">Your Review</label>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about punctuality, creativity, and deliverable quality..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewBooking(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-800 text-xs text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOTHER ADMIN: FEATURE / UNFEATURE CONFIRMATION MODAL                      */}
      {/* ========================================================================= */}
      {featuredConfirmModal.isOpen && featuredConfirmModal.creator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  featuredConfirmModal.targetFeatured
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}
              >
                {featuredConfirmModal.targetFeatured ? (
                  <Crown className="w-6 h-6 fill-amber-400 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono">
                  SpotlightPhotography Mother Admin
                </span>
                <h3 className="text-lg font-black text-white font-['Space_Grotesk']">
                  {featuredConfirmModal.targetFeatured
                    ? 'Feature this freelancer?'
                    : 'Remove from Featured?'}
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {featuredConfirmModal.targetFeatured
                    ? 'This freelancer will appear in the Featured Freelancers section of CreatorFlow.'
                    : 'The freelancer will remain active in the marketplace but will no longer appear in the Featured section.'}
                </p>
              </div>
            </div>

            {/* Freelancer Preview Card */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
              <SafeAvatar
                src={featuredConfirmModal.creator.profileImageUrl}
                name={featuredConfirmModal.creator.displayName}
                className="w-12 h-12 rounded-xl border border-neutral-800 shrink-0"
                size={400}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white truncate">
                    {featuredConfirmModal.creator.displayName}
                  </span>
                  {featuredConfirmModal.creator.verified && (
                    <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-neutral-400 truncate">
                  @{featuredConfirmModal.creator.username} • {featuredConfirmModal.creator.roles?.[0] || 'Creative'}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {(featuredConfirmModal.creator.rating || 5.0).toFixed(1)}
                  </span>
                  <span>•</span>
                  <span>{featuredConfirmModal.creator.city || 'Dhaka'}</span>
                </div>
              </div>
            </div>

            {/* Verification Advisory (if attempting to feature unverified talent) */}
            {featuredConfirmModal.targetFeatured && !featuredConfirmModal.creator.verified && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-start gap-2 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong className="font-bold">Advisory:</strong> This freelancer is not yet verified. SpotlightPhotography recommends vetting and verifying talent before featuring them in public curations.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-white pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoVerifyOnFeature}
                    onChange={(e) => setAutoVerifyOnFeature(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
                  />
                  <span>Also mark freelancer as Verified with SpotlightPhotography badge</span>
                </label>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setFeaturedConfirmModal({ isOpen: false, creator: null, targetFeatured: false });
                  setAutoVerifyOnFeature(false);
                }}
                disabled={isUpdatingFeatured}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleToggleFeaturedConfirm}
                disabled={isUpdatingFeatured}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  featuredConfirmModal.targetFeatured
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/25'
                    : 'bg-neutral-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 border border-neutral-700 text-neutral-200'
                } disabled:opacity-50`}
              >
                {isUpdatingFeatured ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : featuredConfirmModal.targetFeatured ? (
                  <Crown className="w-3.5 h-3.5 fill-black" />
                ) : null}
                <span>
                  {isUpdatingFeatured
                    ? 'Updating...'
                    : featuredConfirmModal.targetFeatured
                    ? 'Mark Featured'
                    : 'Remove Featured'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOTHER ADMIN: CREATOR DETAIL INSPECTION DRAWER / MODAL                     */}
      {/* ========================================================================= */}
      {adminDetailCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header & Close */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <SafeAvatar
                  src={adminDetailCreator.profileImageUrl}
                  name={adminDetailCreator.displayName}
                  className="w-14 h-14 rounded-2xl border border-neutral-800 shrink-0"
                  size={400}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-black text-white font-['Space_Grotesk']">
                      {adminDetailCreator.displayName}
                    </h3>
                    {adminDetailCreator.verified && (
                      <CheckCircle className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 font-mono">
                    @{adminDetailCreator.username}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {adminDetailCreator.roles?.join(' • ') || 'Creative Talent'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAdminDetailCreator(null)}
                className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Featured Status
                  </span>
                  <span className="text-xs font-bold text-white mt-0.5 block">
                    {adminDetailCreator.featured ? 'Featured on Marketplace' : 'Standard Directory'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleOpenFeaturedModal(adminDetailCreator, !adminDetailCreator.featured);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    adminDetailCreator.featured
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                  }`}
                >
                  <Crown className="w-3 h-3" />
                  {adminDetailCreator.featured ? 'Featured' : 'Make Featured'}
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Spotlight Vetting
                  </span>
                  <span className="text-xs font-bold text-white mt-0.5 block">
                    {adminDetailCreator.verified ? 'Verified Talent' : 'Unverified'}
                  </span>
                </div>
                <button
                  onClick={() => handleVerifyCreatorToggle(adminDetailCreator.creatorId, !adminDetailCreator.verified)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    adminDetailCreator.verified
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  {adminDetailCreator.verified ? 'Verified' : 'Verify'}
                </button>
              </div>
            </div>

            {/* Profile Overview Stats */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                  Rating
                </span>
                <span className="text-base font-black text-amber-400 mt-1 flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {(adminDetailCreator.rating || 5.0).toFixed(1)}
                </span>
                <span className="text-[10px] text-neutral-400">{adminDetailCreator.reviewCount || 0} reviews</span>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                  Starting At
                </span>
                <span className="text-base font-black text-white mt-1 block">
                  ৳{(adminDetailCreator.startingPrice || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-neutral-400">BDT base rate</span>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                  Experience
                </span>
                <span className="text-base font-black text-white mt-1 block">
                  {adminDetailCreator.experienceYears || 1} Years
                </span>
                <span className="text-[10px] text-neutral-400">Industry track</span>
              </div>
            </div>

            {/* Bio */}
            {adminDetailCreator.bio && (
              <div className="space-y-1 text-xs">
                <span className="font-bold text-neutral-400 block uppercase tracking-wider text-[10px]">
                  About
                </span>
                <p className="text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
                  {adminDetailCreator.bio}
                </p>
              </div>
            )}

            {/* Location & Coverage */}
            <div className="space-y-1 text-xs">
              <span className="font-bold text-neutral-400 block uppercase tracking-wider text-[10px]">
                Location &amp; Service Coverage
              </span>
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-neutral-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                  <span>
                    {adminDetailCreator.city || 'Dhaka'}, {adminDetailCreator.district || 'Dhaka'}, {adminDetailCreator.country || 'Bangladesh'}
                  </span>
                </div>
                {adminDetailCreator.serviceAreas && adminDetailCreator.serviceAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {adminDetailCreator.serviceAreas.map((area, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Skills & Equipment */}
            {adminDetailCreator.skills && adminDetailCreator.skills.length > 0 && (
              <div className="space-y-1 text-xs">
                <span className="font-bold text-neutral-400 block uppercase tracking-wider text-[10px]">
                  Skills &amp; Specialties
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {adminDetailCreator.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Action: Open Public Profile */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setAdminDetailCreator(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold"
              >
                Close Drawer
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onViewPublicProfile) {
                    onViewPublicProfile(adminDetailCreator.username);
                  } else {
                    window.location.href = `/creator/${adminDetailCreator.username}`;
                  }
                  setAdminDetailCreator(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>View Public Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOG (CENTRAL FOR ALL DESTRUCTIVE ACTIONS)                  */}
      {/* ========================================================================= */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white font-['Space_Grotesk']">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DECLINE BOOKING REQUEST MODAL                                             */}
      {/* ========================================================================= */}
      {declineBookingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Decline Booking Request
                </h3>
                <p className="text-xs text-neutral-400">
                  Are you sure you want to decline booking <span className="font-mono text-neutral-200">#{declineBookingModal.bookingId}</span>? Let the client know the reason so they can adjust dates or project requirements.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-300">
                Reason for Declining (Optional)
              </label>
              <textarea
                rows={3}
                value={declineBookingModal.reason}
                onChange={(e) =>
                  setDeclineBookingModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="e.g. Already booked for a shoot on this date, or location is outside my current service area..."
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() =>
                  setDeclineBookingModal({ isOpen: false, bookingId: '', reason: '' })
                }
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmDeclineBooking}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition"
              >
                Decline Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT CREATIVE SERVICE MODAL                                         */}
      {/* ========================================================================= */}
      {serviceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  {serviceModal.mode === 'create' ? 'Add Creative Service' : 'Edit Service Offering'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setServiceModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  placeholder="e.g. Cinematic Wedding Highlights & 4K Teaser"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Cinematography">Cinematography</option>
                    <option value="Photography">Photography</option>
                    <option value="Editing">Editing &amp; Color Grading</option>
                    <option value="Commercial">Commercial &amp; Ad Shoot</option>
                    <option value="Aerial Drone">Aerial Drone Footage</option>
                    <option value="Fashion">Fashion &amp; Lookbook</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Starting Price (৳ BDT) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                      ৳
                    </span>
                    <input
                      type="number"
                      min={0}
                      required
                      value={serviceForm.startingPrice}
                      onChange={(e) =>
                        setServiceForm({ ...serviceForm, startingPrice: Number(e.target.value) })
                      }
                      placeholder="25000"
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Delivery Turnaround
                  </label>
                  <input
                    type="text"
                    value={serviceForm.deliveryTime}
                    onChange={(e) => setServiceForm({ ...serviceForm, deliveryTime: e.target.value })}
                    placeholder="e.g. 7 Days or 48 Hours Express"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Coverage Location
                  </label>
                  <input
                    type="text"
                    value={serviceForm.location}
                    onChange={(e) => setServiceForm({ ...serviceForm, location: e.target.value })}
                    placeholder="e.g. Dhaka Studio / On-Location"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Service Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Detail your creative workflow, direction style, and gear brought to the production..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Key Deliverables (comma separated)
                </label>
                <input
                  type="text"
                  value={serviceForm.deliverables}
                  onChange={(e) => setServiceForm({ ...serviceForm, deliverables: e.target.value })}
                  placeholder="e.g. 1x 4K Master Video, 10x 60s Reels, Full Color Grade, Raw Footage Backup"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Separate each item with a comma so clients see an organized bullet list.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setServiceModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingService || !serviceForm.title.trim()}
                onClick={handleSaveService}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {isSavingService
                    ? 'Saving...'
                    : serviceModal.mode === 'create'
                    ? 'Save Service'
                    : 'Save Changes'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONNECT GOOGLE CALENDAR MODAL                                             */}
      {/* ========================================================================= */}
      {showConnectCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                    Connect Google Calendar
                  </h3>
                  <p className="text-[11px] text-neutral-400">Personal schedule synchronization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectCalendarModal(false)}
                className="p-1 rounded-lg text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
                Enter your Google account email address. Once linked, any booking confirmed by you will automatically appear on your Google Calendar with client info, production location, and shoot timings.
              </p>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Google Account Email *
                </label>
                <input
                  type="email"
                  required
                  value={calendarEmailInput}
                  onChange={(e) => setCalendarEmailInput(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200 space-y-1">
                <p className="font-bold flex items-center gap-1 text-blue-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Automatic Synchronization Features:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-300/80 pl-1">
                  <li>Instant calendar event on booking confirmation</li>
                  <li>Shoot date, hours &amp; venue details pre-filled</li>
                  <li>Auto-updates on shoot reschedule or cancellation</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowConnectCalendarModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConnectingCalendar || !calendarEmailInput.trim()}
                onClick={handleConnectGoogleCalendar}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Link className="w-3.5 h-3.5" />
                <span>{isConnectingCalendar ? 'Connecting...' : 'Authorize & Connect'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESCHEDULE BOOKING MODAL                                                  */}
      {/* ========================================================================= */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Reschedule Shoot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-neutral-400">
                Updating shoot schedule for: <strong className="text-white">{rescheduleModal.booking?.projectTitle}</strong>
              </p>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  New Shoot Date *
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleModal.eventDate}
                  onChange={(e) =>
                    setRescheduleModal((prev) => ({ ...prev, eventDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={rescheduleModal.startTime}
                    onChange={(e) =>
                      setRescheduleModal((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={rescheduleModal.endTime}
                    onChange={(e) =>
                      setRescheduleModal((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 italic">
                The linked Google Calendar event will automatically move to this new time.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setRescheduleModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rescheduleModal.isSaving || !rescheduleModal.eventDate}
                onClick={handleSaveReschedule}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-black" />
                <span>{rescheduleModal.isSaving ? 'Rescheduling...' : 'Save New Schedule'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANCEL BOOKING MODAL                                                      */}
      {/* ========================================================================= */}
      {cancelBookingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Cancel Booking
                </h3>
                <p className="text-xs text-neutral-400">
                  Cancel shoot <strong className="text-white">{cancelBookingModal.booking?.projectTitle}</strong>. The linked Google Calendar event will be removed and client records preserved.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-300">
                Cancellation Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={cancelBookingModal.reason}
                onChange={(e) =>
                  setCancelBookingModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Reason for cancellation (e.g. client requested change, production conflict)..."
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setCancelBookingModal({ isOpen: false, booking: null, reason: '', isCancelling: false })}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelBookingModal.isCancelling}
                onClick={handleConfirmCancelBooking}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition disabled:opacity-50"
              >
                {cancelBookingModal.isCancelling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FACEBOOK-STYLE PROFILE PHOTO CROP & ZOOM MODAL                            */}
      {/* ========================================================================= */}
      {profileCropModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Adjust Profile Photo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProfileCropModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Circular Preview Container */}
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-rose-500/50 shadow-2xl bg-neutral-950 relative flex items-center justify-center">
                <img
                  src={profileCropModal.previewUrl}
                  alt="Avatar preview"
                  className="w-full h-full object-cover transition-transform duration-200"
                  style={{ transform: `scale(${profileCropModal.zoom})` }}
                />
              </div>

              {/* Zoom Slider */}
              <div className="w-full max-w-xs space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span>Zoom</span>
                  </span>
                  <span className="font-mono font-bold text-white">
                    {Math.round(profileCropModal.zoom * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={profileCropModal.zoom}
                  onChange={(e) =>
                    setProfileCropModal((prev) => ({ ...prev, zoom: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setProfileCropModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={profileCropModal.isUploading}
                onClick={handleSaveCroppedProfilePhoto}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{profileCropModal.isUploading ? 'Saving...' : 'Save Profile Photo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FACEBOOK-STYLE COVER BANNER REPOSITION MODAL                               */}
      {/* ========================================================================= */}
      {coverRepositionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Reposition Cover Banner
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCoverRepositionModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner 16:9 Widescreen Preview with Alignment */}
            <div className="space-y-3">
              <div className="w-full h-44 rounded-2xl overflow-hidden border-2 border-neutral-700 bg-neutral-950 relative shadow-xl">
                <img
                  src={coverRepositionModal.previewUrl}
                  alt="Cover preview"
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    coverRepositionModal.position === 'top'
                      ? 'object-top'
                      : coverRepositionModal.position === 'bottom'
                      ? 'object-bottom'
                      : 'object-center'
                  }`}
                />
              </div>

              {/* Alignment Selector */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="text-xs text-neutral-400 font-semibold mr-2 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Alignment:</span>
                </span>
                {(['top', 'center', 'bottom'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setCoverRepositionModal((prev) => ({ ...prev, position: pos }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                      coverRepositionModal.position === pos
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setCoverRepositionModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={coverRepositionModal.isUploading}
                onClick={handleSaveRepositionedCoverPhoto}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-black" />
                <span>{coverRepositionModal.isUploading ? 'Saving...' : 'Save Cover Banner'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
