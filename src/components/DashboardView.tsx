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
} from '../types';
import {
  getBookings,
  getProjects,
  acceptBooking,
  confirmBooking,
  declineBooking,
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
} from '../services/api';
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
    serviceAreas: (currentCreator?.serviceAreas || ['Dhaka']).join(', '),
    skills: (currentCreator?.skills || ['Photography', 'Editing']).join(', '),
    equipment: (currentCreator?.equipment || ['Professional Camera System']).join(', '),
    roles: currentCreator?.roles || ['Photographer'],
    instagram: currentCreator?.instagram || '',
    youtube: currentCreator?.youtube || '',
    facebook: currentCreator?.facebook || '',
    tiktok: currentCreator?.tiktok || '',
    linkedin: currentCreator?.linkedin || '',
    website: currentCreator?.website || '',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessToast, setSettingsSuccessToast] = useState(false);
  const [profileCopiedToast, setProfileCopiedToast] = useState(false);

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

        if (activeTab === 'overview' && session.creator) {
          const [portList, avlList, convList, fullProf] = await Promise.all([
            getCreatorPortfolio(session.creator.creatorId).catch(() => []),
            getAvailability(session.creator.creatorId).catch(() => []),
            getConversations().catch(() => []),
            getCreatorProfile(session.creator.username).catch(() => null),
          ]);
          setPortfolio(portList);
          setAvailability(avlList);
          setConversations(convList);
          if (fullProf && fullProf.reviews) {
            setReviews(fullProf.reviews);
          }
        }
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
    } finally {
      setStatusActionLoading(null);
    }
  };

  const handleDeclineBooking = async (bookingId: string) => {
    const reason = prompt('Optional reason for declining:');
    setStatusActionLoading(bookingId);
    try {
      const updated = await declineBooking(bookingId, reason || undefined);
      setBookings((prev) => prev.map((b) => (b.bookingId === bookingId ? updated : b)));
      if (selectedBookingDetails?.bookingId === bookingId) {
        setSelectedBookingDetails(updated);
      }
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
    } finally {
      setStatusActionLoading(null);
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

  const handleDeletePortfolioItem = async (portfolioId: string) => {
    if (!confirm('Are you sure you want to remove this item from your portfolio?')) return;
    try {
      await deletePortfolioItem(portfolioId);
      setPortfolio((prev) => prev.filter((p) => p.portfolioId !== portfolioId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleBlockSelectedDate = async () => {
    if (!session.creator || !selectedDate) return;
    try {
      const slot = await blockDate(session.creator.creatorId, selectedDate, blockNotesInput || 'Unavailable');
      setAvailability((prev) => [...prev.filter((a) => a.date !== selectedDate), slot]);
      setBlockNotesInput('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnblockDate = async (date: string) => {
    if (!session.creator) return;
    try {
      await unblockDate(session.creator.creatorId, date);
      setAvailability((prev) => prev.filter((a) => a.date !== date));
    } catch (e) {
      console.error(e);
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
        country: settingsForm.country.trim(),
        serviceAreas: settingsForm.serviceAreas.split(',').map((s) => s.trim()).filter(Boolean),
        skills: settingsForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
        equipment: settingsForm.equipment.split(',').map((s) => s.trim()).filter(Boolean),
        roles: settingsForm.roles,
        instagram: settingsForm.instagram.trim(),
        youtube: settingsForm.youtube.trim(),
        facebook: settingsForm.facebook.trim(),
        tiktok: settingsForm.tiktok.trim(),
        linkedin: settingsForm.linkedin.trim(),
        website: settingsForm.website.trim(),
      };

      await updateCreatorProfile(session.creator.creatorId, payload);
      setSettingsSuccessToast(true);
      setTimeout(() => setSettingsSuccessToast(false), 4000);
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
    const matchStatus = bookingFilterStatus === 'all' || b.status === bookingFilterStatus;
    const matchQuery =
      !bookingSearchQuery ||
      b.projectTitle.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
      (b.customerName && b.customerName.toLowerCase().includes(bookingSearchQuery.toLowerCase())) ||
      b.bookingId.toLowerCase().includes(bookingSearchQuery.toLowerCase());
    return matchStatus && matchQuery;
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
          {/* Top 6 KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Total Bookings
              </span>
              <p className="text-2xl font-black text-white font-['Space_Grotesk']">{bookings.length}</p>
              <span className="text-[10px] text-emerald-400 font-medium">All-time clients</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Pending Requests
              </span>
              <p className="text-2xl font-black text-amber-400 font-['Space_Grotesk']">{pendingCount}</p>
              <span className="text-[10px] text-neutral-400 font-medium">Awaiting response</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Active Projects
              </span>
              <p className="text-2xl font-black text-emerald-400 font-['Space_Grotesk']">
                {activeProjectsCount}
              </p>
              <span className="text-[10px] text-neutral-400 font-medium">In production</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Total Reviews
              </span>
              <p className="text-2xl font-black text-white font-['Space_Grotesk']">{reviewsCount}</p>
              <span className="text-[10px] text-neutral-400 font-medium">Client testimonials</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Average Rating
              </span>
              <p className="text-2xl font-black text-amber-400 font-['Space_Grotesk'] flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {averageRating.toFixed(1)}
              </p>
              <span className="text-[10px] text-neutral-400 font-medium">Verified satisfaction</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Portfolio Items
              </span>
              <p className="text-2xl font-black text-white font-['Space_Grotesk']">{portfolio.length}</p>
              <button
                onClick={() => switchTab('portfolio')}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
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
                                onClick={() => handleDeclineBooking(b.bookingId)}
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
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                    Storefront Readiness
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {session.creator?.onboardingCompleted ? '100% Ready' : 'In Progress'}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(40, portfolio.length * 15 + 40))}%` }}
                  />
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Visual Profile &amp; Bio
                    </span>
                    <span className="text-neutral-500 text-[10px]">Complete</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Camera &amp; Gear Specs
                    </span>
                    <span className="text-neutral-500 text-[10px]">Verified</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-2">
                      {portfolio.length > 0 ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-600" />
                      )}
                      Portfolio Works ({portfolio.length})
                    </span>
                    <button
                      onClick={() => switchTab('portfolio')}
                      className="text-rose-400 hover:underline text-[10px]"
                    >
                      Manage
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-2">
                      {availability.length > 0 ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-600" />
                      )}
                      Calendar Availability
                    </span>
                    <button
                      onClick={() => switchTab('availability')}
                      className="text-amber-400 hover:underline text-[10px]"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => switchTab('settings')}
                  className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Edit Creator Settings</span>
                </button>
              </div>

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
              { id: 'all', label: `All (${bookings.length})` },
              { id: 'pending', label: `New Requests (${bookings.filter((b) => b.status === 'pending').length})` },
              { id: 'accepted', label: `Accepted (${bookings.filter((b) => b.status === 'accepted').length})` },
              { id: 'confirmed', label: `Confirmed (${bookings.filter((b) => b.status === 'confirmed').length})` },
              { id: 'completed', label: `Completed (${bookings.filter((b) => b.status === 'completed').length})` },
              { id: 'declined', label: `Declined (${bookings.filter((b) => b.status === 'declined').length})` },
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
                        View Storefront
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
                  className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                          {b.bookingId} • {b.projectType || 'Creative Production'}
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
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {b.status}
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

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openClientMessage(b.customerId, b.customerName)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-sky-400 transition-colors flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message Client</span>
                      </button>

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
                            onClick={() => handleDeclineBooking(b.bookingId)}
                            disabled={statusActionLoading === b.bookingId}
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {b.status === 'accepted' && isCreator && (
                        <button
                          onClick={() => handleConfirmBooking(b.bookingId)}
                          disabled={statusActionLoading === b.bookingId}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                        >
                          Confirm Shoot
                        </button>
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
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      This date is currently marked as <strong>Blocked / Unavailable</strong>.
                    </div>
                    <button
                      onClick={() => handleUnblockDate(selectedDate)}
                      className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors"
                    >
                      Unblock &amp; Mark Available
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-400">
                      This date is open for new bookings. You can block it off for personal time or private shoots.
                    </p>
                    <input
                      type="text"
                      value={blockNotesInput}
                      onChange={(e) => setBlockNotesInput(e.target.value)}
                      placeholder="Reason (e.g. Travel, Commercial shoot)"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      onClick={handleBlockSelectedDate}
                      className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors"
                    >
                      Block Selected Date
                    </button>
                  </div>
                )}
              </div>

              {/* Blocked Dates Management List */}
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                  Blocked Dates ({availability.filter((a) => a.status === 'unavailable').length})
                </h3>

                {availability.filter((a) => a.status === 'unavailable').length === 0 ? (
                  <p className="text-xs text-neutral-500 py-3 text-center">No blackout dates configured</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {availability
                      .filter((a) => a.status === 'unavailable')
                      .map((slot) => (
                        <div
                          key={slot.availabilityId || slot.date}
                          className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-white font-mono">{slot.date}</p>
                            <p className="text-[10px] text-neutral-400">{slot.notes || 'Blocked out'}</p>
                          </div>
                          <button
                            onClick={() => handleUnblockDate(slot.date)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-rose-500/20 hover:text-rose-400 text-[10px] font-semibold text-neutral-300 transition-colors"
                          >
                            Unblock
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
                          className="text-neutral-400 hover:text-white flex items-center gap-1 font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeletePortfolioItem(item.portfolioId)}
                          className="text-neutral-500 hover:text-rose-400 flex items-center gap-1 font-semibold transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
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
                          <div key={m.messageId} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
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

            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
            >
              {isSavingSettings ? 'Saving...' : 'Save Profile Changes'}
            </button>
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

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Primary Equipment &amp; Cameras (comma separated)
                </label>
                <input
                  type="text"
                  value={settingsForm.equipment}
                  onChange={(e) => setSettingsForm({ ...settingsForm, equipment: e.target.value })}
                  placeholder="Sony FX6, Red Komodo, Aputure 600d, DJI Ronin RS3"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Creative Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={settingsForm.skills}
                  onChange={(e) => setSettingsForm({ ...settingsForm, skills: e.target.value })}
                  placeholder="Color Grading, Drone Aerials, Fashion Directing, 4K Raw"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Location & Social Links */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Location &amp; Service Coverage
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.city}
                      onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 mb-1">Country *</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.country}
                      onChange={(e) => setSettingsForm({ ...settingsForm, country: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">
                    Service Areas Covered (comma separated)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.serviceAreas}
                    onChange={(e) => setSettingsForm({ ...settingsForm, serviceAreas: e.target.value })}
                    placeholder="Dhaka, Chittagong, Sylhet, Nationwide"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
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
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isUploading ? 'Saving...' : editingPortfolioItem ? 'Update Work' : 'Save to Studio'}
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
    </div>
  );
};
