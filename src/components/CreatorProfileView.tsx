/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Star,
  MapPin,
  CheckCircle,
  Calendar as CalendarIcon,
  HardDrive,
  MessageSquare,
  Share2,
  Camera,
  Film,
  Award,
  Clock,
  Layers,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Edit2,
  Edit3,
  Plus,
  Trash2,
  Globe,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  X,
  Bookmark,
  LayoutDashboard,
  Upload,
  ZoomIn,
  Sliders,
  DollarSign,
  Phone,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import {
  Creator,
  PortfolioItem,
  Service,
  PackageItem,
  Review,
  Availability,
  AuthSession,
} from '../types';
import {
  updateCreatorProfile,
  uploadBase64File,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
} from '../services/api';
import {
  normalizeGoogleDriveImageUrl,
  SafeAvatar,
  SafeCover,
} from '../utils/imageUtils';

interface CreatorProfileViewProps {
  creator: Creator;
  portfolios: PortfolioItem[];
  services: Service[];
  packages: PackageItem[];
  reviews: Review[];
  availability: Availability[];
  session: AuthSession | null;
  onBack: () => void;
  onBook: (creator: Creator, pkg?: PackageItem) => void;
  onMessage: (creator: Creator) => void;
  onOpenDashboard?: (tab?: string) => void;
  onProfileUpdate?: (updatedCreator: Creator) => void;
  onPortfolioUpdate?: (newPortfolios: PortfolioItem[]) => void;
}

type ProfileTab = 'overview' | 'portfolio' | 'services' | 'reviews' | 'about';

export const CreatorProfileView: React.FC<CreatorProfileViewProps> = ({
  creator: initialCreator,
  portfolios: initialPortfolios,
  services,
  packages,
  reviews,
  availability,
  session,
  onBack,
  onBook,
  onMessage,
  onOpenDashboard,
  onProfileUpdate,
  onPortfolioUpdate,
}) => {
  // Local state for instant updates without page reload
  const [creator, setCreator] = useState<Creator>(initialCreator);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>(initialPortfolios);

  useEffect(() => {
    setCreator(initialCreator);
  }, [initialCreator]);

  useEffect(() => {
    setPortfolios(initialPortfolios);
  }, [initialPortfolios]);

  // Authenticated Owner Check
  const isOwner = Boolean(
    session?.user?.userId &&
      (creator.userId === session.user.userId ||
        (session.creator && session.creator.creatorId === creator.creatorId))
  );

  // Active Profile Navigation Tab
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [portfolioCategory, setPortfolioCategory] = useState<
    'all' | 'photography' | 'cinematography' | 'editing'
  >('all');
  const [selectedLightboxItem, setSelectedLightboxItem] = useState<PortfolioItem | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // COVER PHOTO EDITING STATE (FACEBOOK-STYLE)
  // ---------------------------------------------------------------------------
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [coverCropModalOpen, setCoverCropModalOpen] = useState(false);
  const [coverPendingDataUrl, setCoverPendingDataUrl] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState('');
  const [coverMimeType, setCoverMimeType] = useState('image/jpeg');
  const [coverZoom, setCoverZoom] = useState(1);
  const [coverPositionY, setCoverPositionY] = useState(50); // 0 to 100%
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Cover photo must be under 10MB.');
      return;
    }
    setCoverFileName(file.name);
    setCoverMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverPendingDataUrl(event.target?.result as string);
      setCoverZoom(1);
      setCoverPositionY(50);
      setCoverCropModalOpen(true);
      setShowCoverMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCoverPhoto = async () => {
    if (!coverPendingDataUrl) return;
    setIsUploadingCover(true);
    try {
      const uploadRes = await uploadBase64File({
        creatorId: creator.creatorId,
        uploadType: 'cover',
        fileName: coverFileName || 'cover.jpg',
        mimeType: coverMimeType,
        base64Data: coverPendingDataUrl,
      });

      const targetCoverUrl =
        uploadRes.thumbnailUrl || normalizeGoogleDriveImageUrl(uploadRes.fileUrl, 1600);

      const updated = await updateCreatorProfile(creator.creatorId, {
        coverImageUrl: targetCoverUrl,
      });

      setCreator(updated);
      if (onProfileUpdate) onProfileUpdate(updated);
      setCoverCropModalOpen(false);
      setCoverPendingDataUrl(null);
      showToast('Cover photo updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update cover photo');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCoverPhoto = async () => {
    setShowCoverMenu(false);
    if (!confirm('Remove cover photo and revert to standard dark gradient?')) return;
    try {
      const updated = await updateCreatorProfile(creator.creatorId, {
        coverImageUrl: '',
      });
      setCreator(updated);
      if (onProfileUpdate) onProfileUpdate(updated);
      showToast('Cover photo removed.');
    } catch (err: any) {
      alert(err.message || 'Failed to remove cover photo');
    }
  };

  // ---------------------------------------------------------------------------
  // PROFILE PHOTO EDITING STATE (FACEBOOK-STYLE)
  // ---------------------------------------------------------------------------
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [avatarCropModalOpen, setAvatarCropModalOpen] = useState(false);
  const [avatarPendingDataUrl, setAvatarPendingDataUrl] = useState<string | null>(null);
  const [avatarFileName, setAvatarFileName] = useState('');
  const [avatarMimeType, setAvatarMimeType] = useState('image/jpeg');
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Profile photo must be under 10MB.');
      return;
    }
    setAvatarFileName(file.name);
    setAvatarMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPendingDataUrl(event.target?.result as string);
      setAvatarZoom(1);
      setAvatarCropModalOpen(true);
      setShowAvatarMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveAvatarPhoto = async () => {
    if (!avatarPendingDataUrl) return;
    setIsUploadingAvatar(true);
    try {
      const uploadRes = await uploadBase64File({
        creatorId: creator.creatorId,
        uploadType: 'profile',
        fileName: avatarFileName || 'profile.jpg',
        mimeType: avatarMimeType,
        base64Data: avatarPendingDataUrl,
      });

      const targetAvatarUrl =
        uploadRes.thumbnailUrl || normalizeGoogleDriveImageUrl(uploadRes.fileUrl, 800);

      const updated = await updateCreatorProfile(creator.creatorId, {
        profileImageUrl: targetAvatarUrl,
      });

      setCreator(updated);
      if (onProfileUpdate) onProfileUpdate(updated);
      setAvatarCropModalOpen(false);
      setAvatarPendingDataUrl(null);
      showToast('Profile photo updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatarPhoto = async () => {
    setShowAvatarMenu(false);
    if (!confirm('Remove profile photo and use default avatar?')) return;
    try {
      const updated = await updateCreatorProfile(creator.creatorId, {
        profileImageUrl: '',
      });
      setCreator(updated);
      if (onProfileUpdate) onProfileUpdate(updated);
      showToast('Profile photo removed.');
    } catch (err: any) {
      alert(err.message || 'Failed to remove profile photo');
    }
  };

  // ---------------------------------------------------------------------------
  // INLINE EDIT PROFILE MODAL STATE
  // ---------------------------------------------------------------------------
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [editProfileSection, setEditProfileSection] = useState<
    'basic' | 'location' | 'gear' | 'social'
  >('basic');
  const [editForm, setEditForm] = useState({
    displayName: creator.displayName,
    username: creator.username,
    bio: creator.bio,
    startingPrice: creator.startingPrice,
    experienceYears: creator.experienceYears,
    city: creator.city,
    district: creator.district || '',
    country: creator.country,
    serviceAreas: creator.serviceAreas.join(', '),
    roles: creator.roles,
    skills: creator.skills.join(', '),
    equipment: creator.equipment.join('\n'),
    languages: creator.languages.join(', '),
    facebook: creator.facebook || '',
    instagram: creator.instagram || '',
    youtube: creator.youtube || '',
    tiktok: creator.tiktok || '',
    linkedin: creator.linkedin || '',
    website: creator.website || '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const openEditModalAt = (section: 'basic' | 'location' | 'gear' | 'social' = 'basic') => {
    setEditForm({
      displayName: creator.displayName,
      username: creator.username,
      bio: creator.bio,
      startingPrice: creator.startingPrice,
      experienceYears: creator.experienceYears,
      city: creator.city,
      district: creator.district || '',
      country: creator.country,
      serviceAreas: creator.serviceAreas.join(', '),
      roles: creator.roles,
      skills: creator.skills.join(', '),
      equipment: creator.equipment.join('\n'),
      languages: creator.languages.join(', '),
      facebook: creator.facebook || '',
      instagram: creator.instagram || '',
      youtube: creator.youtube || '',
      tiktok: creator.tiktok || '',
      linkedin: creator.linkedin || '',
      website: creator.website || '',
    });
    setEditProfileSection(section);
    setEditProfileModalOpen(true);
  };

  const handleSaveProfileChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const payload: Partial<Creator> = {
        displayName: editForm.displayName.trim(),
        username: editForm.username.trim().toLowerCase(),
        bio: editForm.bio.trim(),
        startingPrice: Number(editForm.startingPrice) || 0,
        experienceYears: Number(editForm.experienceYears) || 1,
        city: editForm.city.trim(),
        district: editForm.district.trim(),
        country: editForm.country.trim(),
        serviceAreas: editForm.serviceAreas
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        roles: editForm.roles,
        skills: editForm.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        equipment: editForm.equipment
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        languages: editForm.languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        facebook: editForm.facebook.trim(),
        instagram: editForm.instagram.trim(),
        youtube: editForm.youtube.trim(),
        tiktok: editForm.tiktok.trim(),
        linkedin: editForm.linkedin.trim(),
        website: editForm.website.trim(),
      };

      const updated = await updateCreatorProfile(creator.creatorId, payload);
      setCreator(updated);
      if (onProfileUpdate) onProfileUpdate(updated);
      setEditProfileModalOpen(false);
      showToast('Profile information saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save profile changes');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PORTFOLIO ADD & EDIT MODAL (FACEBOOK PHOTOS STYLE)
  // ---------------------------------------------------------------------------
  const [addPortfolioModalOpen, setAddPortfolioModalOpen] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioCategoryInput, setPortfolioCategoryInput] = useState<
    'photography' | 'cinematography' | 'editing'
  >('photography');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [portfolioFileDataUrl, setPortfolioFileDataUrl] = useState<string | null>(null);
  const [portfolioFileName, setPortfolioFileName] = useState('');
  const [portfolioMimeType, setPortfolioMimeType] = useState('image/jpeg');
  const [portfolioFeatured, setPortfolioFeatured] = useState(true);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);
  const portfolioFileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPortfolioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('File must be under 20MB.');
      return;
    }
    setPortfolioFileName(file.name);
    setPortfolioMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (event) => {
      setPortfolioFileDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddPortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioFileDataUrl) {
      alert('Please choose an image or video file to upload.');
      return;
    }
    setIsUploadingPortfolio(true);
    try {
      const uploadRes = await uploadBase64File({
        creatorId: creator.creatorId,
        uploadType:
          portfolioCategoryInput === 'cinematography'
            ? 'portfolioCinematography'
            : portfolioCategoryInput === 'editing'
            ? 'portfolioEditing'
            : 'portfolioPhotography',
        fileName: portfolioFileName || 'portfolio.jpg',
        mimeType: portfolioMimeType,
        base64Data: portfolioFileDataUrl,
      });

      const newItem = await createPortfolioItem(creator.creatorId, {
        title: portfolioTitle.trim() || 'Untitled Shoot',
        description: portfolioDesc.trim(),
        category: portfolioCategoryInput,
        fileUrl: uploadRes.fileUrl,
        thumbnailUrl: uploadRes.thumbnailUrl || uploadRes.fileUrl,
        featured: portfolioFeatured,
        tags: ['Portfolio', portfolioCategoryInput],
      });

      const nextPortfolios = [newItem, ...portfolios];
      setPortfolios(nextPortfolios);
      if (onPortfolioUpdate) onPortfolioUpdate(nextPortfolios);
      setAddPortfolioModalOpen(false);
      setPortfolioTitle('');
      setPortfolioDesc('');
      setPortfolioFileDataUrl(null);
      showToast('New work added to your portfolio!');
    } catch (err: any) {
      alert(err.message || 'Failed to add portfolio item');
    } finally {
      setIsUploadingPortfolio(false);
    }
  };

  const handleToggleFeatured = async (item: PortfolioItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await updatePortfolioItem(item.portfolioId, {
        featured: !item.featured,
      });
      const nextPortfolios = portfolios.map((p) =>
        p.portfolioId === item.portfolioId ? updated : p
      );
      setPortfolios(nextPortfolios);
      if (onPortfolioUpdate) onPortfolioUpdate(nextPortfolios);
      showToast(updated.featured ? 'Marked as featured' : 'Removed from featured');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePortfolioItem = async (portfolioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this portfolio work?')) return;
    try {
      await deletePortfolioItem(portfolioId);
      const nextPortfolios = portfolios.filter((p) => p.portfolioId !== portfolioId);
      setPortfolios(nextPortfolios);
      if (onPortfolioUpdate) onPortfolioUpdate(nextPortfolios);
      showToast('Item deleted from portfolio.');
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered portfolio by category
  const filteredPortfolio = portfolios.filter((item) => {
    if (portfolioCategory === 'all') return true;
    return item.category === portfolioCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Hidden File Inputs for Owner */}
      {isOwner && (
        <>
          <input
            type="file"
            ref={coverFileInputRef}
            onChange={handleSelectCoverFile}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
          <input
            type="file"
            ref={avatarFileInputRef}
            onChange={handleSelectAvatarFile}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
        </>
      )}

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 p-4 rounded-2xl bg-neutral-900 border border-emerald-500/50 text-emerald-300 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-white">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Navigation Bar (Back + Breadcrumb) */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors bg-neutral-900 px-3.5 py-2 rounded-xl border border-neutral-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Explore Talent</span>
        </button>

        {isOwner && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>You are viewing your own profile (Owner Mode)</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. FACEBOOK-LIKE PROFILE HEADER CARD                                      */}
      {/* ========================================================================= */}
      <div className="rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl">
        {/* Cover Photo Area */}
        <div className="relative h-56 sm:h-80 md:h-96 w-full bg-gradient-to-r from-neutral-900 via-zinc-900 to-neutral-950 overflow-hidden group">
          <SafeCover
            src={creator.coverImageUrl}
            alt={creator.displayName}
            className="w-full h-full object-cover"
            size={1600}
            placeholderText={isOwner ? 'Add a high-resolution cover photo to showcase your visual brand' : ''}
          />

          {/* Dark gradient overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/90 via-transparent to-black/20 pointer-events-none" />

          {/* OWNER: Edit Cover Photo Button (Facebook-Style in bottom-right of cover) */}
          {isOwner && (
            <div className="absolute bottom-4 right-4 z-20">
              <div className="relative">
                <button
                  onClick={() => setShowCoverMenu(!showCoverMenu)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 backdrop-blur-md text-white text-xs font-bold shadow-xl border border-neutral-700/80 flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <Camera className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Edit Cover Photo</span>
                  <span className="sm:hidden">Edit Cover</span>
                </button>

                {showCoverMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-1.5 z-30 animate-in fade-in">
                    <button
                      onClick={() => {
                        setShowCoverMenu(false);
                        coverFileInputRef.current?.click();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5 font-medium"
                    >
                      <Upload className="w-3.5 h-3.5 text-rose-400" />
                      Upload New Cover
                    </button>
                    {creator.coverImageUrl && (
                      <button
                        onClick={handleRemoveCoverPhoto}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        Remove Cover
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Info Bar (Avatar overlapping cover + Details + Actions) */}
        <div className="relative px-6 sm:px-8 pb-6 pt-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20 relative z-10">
            {/* Left: Avatar overlapping cover + Names */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              {/* Profile Photo (Circular Facebook Style with Camera Overlay for Owner) */}
              <div className="relative group shrink-0">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full ring-4 ring-neutral-900 bg-neutral-950 overflow-hidden shadow-2xl flex items-center justify-center">
                  <SafeAvatar
                    src={creator.profileImageUrl}
                    name={creator.displayName}
                    alt={creator.displayName}
                    className="w-full h-full text-3xl sm:text-4xl rounded-full"
                    size={1000}
                  />
                </div>

                {/* OWNER: Profile Photo Camera Icon Overlay */}
                {isOwner && (
                  <div className="absolute bottom-1 right-1 z-20">
                    <button
                      onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white border-2 border-neutral-900 shadow-xl flex items-center justify-center transition-transform hover:scale-110"
                      title="Update profile photo"
                    >
                      <Camera className="w-4 h-4 text-amber-400" />
                    </button>

                    {showAvatarMenu && (
                      <div className="absolute left-0 sm:left-full top-0 ml-2 w-48 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-1.5 z-30 animate-in fade-in">
                        <button
                          onClick={() => {
                            setShowAvatarMenu(false);
                            avatarFileInputRef.current?.click();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-neutral-800 flex items-center gap-2.5 font-medium"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          Upload New Photo
                        </button>
                        {creator.profileImageUrl && (
                          <button
                            onClick={handleRemoveAvatarPhoto}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            Remove Photo
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Identity Details */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
                    {creator.displayName}
                  </h1>
                  {creator.verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      <CheckCircle className="w-3.5 h-3.5 fill-sky-400/20" />
                      Verified Talent
                    </span>
                  )}
                  {creator.featured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Featured
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-neutral-400">
                  <span className="font-mono text-neutral-300">@{creator.username}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-neutral-300">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    {creator.city}, {creator.country}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {creator.rating.toFixed(1)} ({creator.reviewCount} reviews)
                  </span>
                </div>

                {/* Primary Roles */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                  {creator.roles.map((role, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 text-xs font-semibold text-neutral-300 border border-neutral-700/60"
                    >
                      {role}
                    </span>
                  ))}
                  <span className="text-xs text-neutral-400 font-medium pl-1">
                    • From <strong className="text-white">৳{creator.startingPrice.toLocaleString()} BDT</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Owner Action Bar vs Visitor Action Bar */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 pt-2 md:pt-0">
              {isOwner ? (
                /* OWNER CONTROLS (NO BOOK PROJECT OR MESSAGE SELF) */
                <>
                  <button
                    onClick={() => openEditModalAt('basic')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('portfolio');
                      setAddPortfolioModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-700/80 flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Add Portfolio</span>
                  </button>

                  {onOpenDashboard && (
                    <button
                      onClick={() => onOpenDashboard('overview')}
                      className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-bold border border-neutral-800 flex items-center gap-2 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-neutral-400" />
                      <span>Studio Dashboard</span>
                    </button>
                  )}
                </>
              ) : (
                /* VISITOR / CUSTOMER CONTROLS */
                <>
                  <button
                    onClick={() => onMessage(creator)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-2 transition-colors border border-neutral-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>

                  <button
                    onClick={() => onBook(creator)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>Book Project (৳{creator.startingPrice.toLocaleString()} BDT)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsSaved(!isSaved);
                      showToast(isSaved ? 'Removed from saved creators' : 'Saved to your creator shortlist!');
                    }}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isSaved
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border-neutral-700'
                    }`}
                    title={isSaved ? 'Saved' : 'Save Creator'}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-rose-400' : ''}`} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Facebook-like Tab Navigation Strip */}
          <div className="border-t border-neutral-800/80 mt-6 -mx-6 sm:-mx-8 px-6 sm:px-8 flex items-center justify-between overflow-x-auto bg-neutral-950/40 no-scrollbar">
            <div className="flex gap-2 sm:gap-6 text-xs font-bold">
              {[
                { id: 'overview', label: 'Overview', icon: Sparkles },
                { id: 'portfolio', label: `Portfolio (${portfolios.length})`, icon: Film },
                { id: 'services', label: `Services & Packages (${packages.length})`, icon: Layers },
                { id: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
                { id: 'about', label: 'About', icon: UserIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ProfileTab)}
                    className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-rose-500 text-white'
                        : 'border-transparent text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {isOwner && activeTab === 'portfolio' && (
              <button
                onClick={() => setAddPortfolioModalOpen(true)}
                className="my-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photos/Films</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB CONTENT: OVERVIEW (FACEBOOK PROFILE 2-COLUMN LAYOUT)               */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Intro & About Card (Facebook Style) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Intro Card */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                <h3 className="text-base font-extrabold text-white font-['Space_Grotesk']">
                  Intro
                </h3>
                {isOwner && (
                  <button
                    onClick={() => openEditModalAt('basic')}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    title="Edit Intro"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Bio */}
              <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                {creator.bio || 'Professional visual artist dedicated to high-end storytelling.'}
              </p>

              {/* Quick Details List */}
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-start gap-3 text-neutral-300">
                  <Film className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">
                      {creator.roles.join(' & ')}
                    </span>
                    <p className="text-[11px] text-neutral-400">Primary Specialization</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-neutral-300">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">
                      Lives in {creator.city}, {creator.country}
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Services: {creator.serviceAreas.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-neutral-300">
                  <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">
                      {creator.experienceYears} Years Industry Experience
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Languages: {creator.languages.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-neutral-300">
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">
                      Starting at ৳{creator.startingPrice.toLocaleString()} BDT
                    </span>
                    <p className="text-[11px] text-neutral-400">Direct booking milestone protection</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="pt-3 border-t border-neutral-800 flex flex-wrap gap-2">
                {creator.instagram && (
                  <a
                    href={creator.instagram.startsWith('http') ? creator.instagram : `https://instagram.com/${creator.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-400 transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {creator.youtube && (
                  <a
                    href={creator.youtube.startsWith('http') ? creator.youtube : `https://youtube.com/${creator.youtube}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-red-400 transition-colors"
                    title="YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {creator.facebook && (
                  <a
                    href={creator.facebook.startsWith('http') ? creator.facebook : `https://facebook.com/${creator.facebook}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sky-400 transition-colors"
                    title="Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {creator.linkedin && (
                  <a
                    href={creator.linkedin.startsWith('http') ? creator.linkedin : `https://linkedin.com/in/${creator.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-blue-400 transition-colors"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {creator.website && (
                  <a
                    href={creator.website.startsWith('http') ? creator.website : `https://${creator.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-400 transition-colors"
                    title="Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>

              {isOwner && (
                <button
                  onClick={() => openEditModalAt('basic')}
                  className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors border border-neutral-700"
                >
                  Edit Details
                </button>
              )}
            </div>

            {/* Gear & Equipment Preview Card */}
            <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                <h3 className="text-base font-extrabold text-white font-['Space_Grotesk']">
                  Production Gear
                </h3>
                {isOwner && (
                  <button
                    onClick={() => openEditModalAt('gear')}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    title="Edit Gear"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {creator.equipment.slice(0, 4).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs text-neutral-300"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
                {creator.equipment.length > 4 && (
                  <button
                    onClick={() => setActiveTab('about')}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold pt-1 block"
                  >
                    + {creator.equipment.length - 4} more gear items in About
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Featured Works (Facebook Photos Grid) + Popular Packages */}
          <div className="lg:col-span-7 space-y-6">
            {/* Featured Portfolio Gallery Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
                <div>
                  <h3 className="text-base font-extrabold text-white font-['Space_Grotesk']">
                    Featured Portfolio
                  </h3>
                  <p className="text-xs text-neutral-400">Recent productions &amp; master captures</p>
                </div>

                <div className="flex items-center gap-2">
                  {isOwner && (
                    <button
                      onClick={() => setAddPortfolioModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Work</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('portfolio')}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1"
                  >
                    See all
                  </button>
                </div>
              </div>

              {portfolios.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-neutral-950 border border-neutral-800">
                  <Film className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">No portfolio works uploaded yet</p>
                  {isOwner && (
                    <button
                      onClick={() => setAddPortfolioModalOpen(true)}
                      className="mt-3 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold"
                    >
                      Upload your first project
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {portfolios.slice(0, 6).map((item) => (
                    <div
                      key={item.portfolioId}
                      onClick={() => setSelectedLightboxItem(item)}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-black border border-neutral-800 hover:border-neutral-700 cursor-pointer shadow-md transition-all"
                    >
                      <img
                        src={normalizeGoogleDriveImageUrl(item.thumbnailUrl || item.fileUrl, 600)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = '0.5';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                        <span className="text-[10px] uppercase font-bold text-amber-400">
                          {item.category}
                        </span>
                        <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Packages Preview */}
            <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
                <div>
                  <h3 className="text-base font-extrabold text-white font-['Space_Grotesk']">
                    Services &amp; Packages
                  </h3>
                  <p className="text-xs text-neutral-400">Transparent rates in ৳ BDT</p>
                </div>
                <button
                  onClick={() => setActiveTab('services')}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                >
                  View all ({packages.length})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.slice(0, 2).map((pkg) => (
                  <div
                    key={pkg.packageId}
                    className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                          {pkg.duration}
                        </span>
                        <span className="text-lg font-extrabold text-white font-['Space_Grotesk']">
                          ৳{pkg.price.toLocaleString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white">{pkg.name}</h4>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{pkg.description}</p>
                    </div>

                    {!isOwner && (
                      <button
                        onClick={() => onBook(creator, pkg)}
                        className="mt-4 w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                      >
                        Book Package
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB CONTENT: PORTFOLIO (FACEBOOK PHOTOS GRID STYLE)                    */}
      {/* ========================================================================= */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {/* Controls Bar: Category Pills + Owner Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Photos & Films' },
                { id: 'photography', label: 'Photography' },
                { id: 'cinematography', label: 'Cinematography' },
                { id: 'editing', label: 'Video Editing' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setPortfolioCategory(cat.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    portfolioCategory === cat.id
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {isOwner && (
              <button
                onClick={() => setAddPortfolioModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center gap-2 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Portfolio</span>
              </button>
            )}
          </div>

          {/* Grid */}
          {filteredPortfolio.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-neutral-900 border border-neutral-800">
              <Film className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white font-['Space_Grotesk']">
                No items in this category
              </h4>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                {isOwner
                  ? 'Click "+ Add to Portfolio" above to upload photos or videos directly to your Google Drive.'
                  : 'This creator has not published any items in this category yet.'}
              </p>
              {isOwner && (
                <button
                  onClick={() => setAddPortfolioModalOpen(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Work</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPortfolio.map((item) => (
                <div
                  key={item.portfolioId}
                  onClick={() => setSelectedLightboxItem(item)}
                  className="group relative rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-700 cursor-pointer shadow-lg transition-all"
                >
                  <div className="relative h-64 w-full overflow-hidden bg-black">
                    <img
                      src={normalizeGoogleDriveImageUrl(item.thumbnailUrl || item.fileUrl, 1000)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = '0.5';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/30 opacity-80 group-hover:opacity-90 transition-opacity" />

                    {/* Category Badge */}
                    <div className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-lg bg-neutral-950/80 backdrop-blur-md text-[10px] uppercase font-bold text-neutral-200 border border-neutral-800">
                      {item.category}
                    </div>

                    {/* OWNER: Quick Actions on Hover (Star Featured / Delete) */}
                    {isOwner && (
                      <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleToggleFeatured(item, e)}
                          className={`p-2 rounded-xl backdrop-blur-md transition-colors ${
                            item.featured
                              ? 'bg-amber-500 text-black shadow-lg'
                              : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300'
                          }`}
                          title={item.featured ? 'Featured Work' : 'Mark as Featured'}
                        >
                          <Star className={`w-3.5 h-3.5 ${item.featured ? 'fill-black' : ''}`} />
                        </button>

                        <button
                          onClick={(e) => handleDeletePortfolioItem(item.portfolioId, e)}
                          className="p-2 rounded-xl bg-neutral-900/80 hover:bg-rose-600 text-neutral-300 hover:text-white backdrop-blur-md transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Bottom Metadata */}
                    <div className="absolute bottom-3.5 left-3.5 right-3.5">
                      <div className="flex items-center gap-1.5">
                        {item.featured && (
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                        <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                          {item.title}
                        </h4>
                      </div>
                      {item.description && (
                        <p className="text-xs text-neutral-300 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
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
      {/* 4. TAB CONTENT: SERVICES & PACKAGES                                       */}
      {/* ========================================================================= */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Production Services &amp; Packages
              </h2>
              <p className="text-xs text-neutral-400">
                Transparent rates in ৳ BDT with master resolution deliverables included
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.packageId}
                className="rounded-3xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col justify-between hover:border-neutral-700 transition-all hover:shadow-xl relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                      {pkg.duration}
                    </span>
                    <span className="text-2xl font-extrabold text-white font-['Space_Grotesk']">
                      ৳{pkg.price.toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{pkg.name}</h3>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">{pkg.description}</p>

                  <div className="my-5 border-t border-neutral-800 pt-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-neutral-500">Crew / Team:</span>
                      <span className="font-semibold text-white">{pkg.teamSize} Person Crew</span>
                    </div>

                    {pkg.photoCount > 0 && (
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="text-neutral-500">Photos:</span>
                        <span className="font-semibold text-white">
                          {pkg.photoCount} Total ({pkg.editedPhotoCount} Retouched)
                        </span>
                      </div>
                    )}

                    {pkg.videoDuration && (
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="text-neutral-500">Video Master:</span>
                        <span className="font-semibold text-white">{pkg.videoDuration}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-neutral-500">Delivery Speed:</span>
                      <span className="font-semibold text-white">{pkg.deliveryTime}</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-neutral-500">Revisions:</span>
                      <span className="font-semibold text-white">{pkg.revisions} Rounds</span>
                    </div>
                  </div>
                </div>

                {!isOwner ? (
                  <button
                    onClick={() => onBook(creator, pkg)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20"
                  >
                    Book This Package
                  </button>
                ) : (
                  <div className="pt-2 text-center text-xs text-neutral-500 font-medium">
                    Owner mode (Manage rates in Studio Dashboard)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB CONTENT: REVIEWS                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'reviews' && (
        <div className="space-y-6 max-w-4xl">
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Client Reviews &amp; Ratings
              </h2>
              <p className="text-xs text-neutral-400">
                Verified client feedback from delivered CreatorFlow projects
              </p>
            </div>

            <div className="flex items-center gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
              <div className="text-3xl font-extrabold text-amber-400 font-['Space_Grotesk']">
                {creator.rating.toFixed(1)}
              </div>
              <div>
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Based on {creator.reviewCount} client reviews
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-neutral-900 border border-neutral-800">
                <Star className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">No client reviews submitted yet</p>
              </div>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.reviewId}
                  className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SafeAvatar
                        src={rev.customerAvatar}
                        name={rev.customerName || 'Client'}
                        className="w-10 h-10 rounded-xl"
                        size={400}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {rev.customerName || 'Verified Client'}
                        </h4>
                        <p className="text-[11px] text-neutral-500 font-mono">
                          {new Date(rev.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{rev.overallRating.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                    {rev.reviewText}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB CONTENT: ABOUT (FACEBOOK-STYLE ABOUT WITH INLINE EDIT PENCILS)     */}
      {/* ========================================================================= */}
      {activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section: Biography & Details */}
          <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Creative Biography
              </h3>
              {isOwner && (
                <button
                  onClick={() => openEditModalAt('basic')}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  title="Edit Biography"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed font-normal">{creator.bio}</p>

            <div className="pt-3 border-t border-neutral-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-800/40">
                <span className="text-neutral-500">Experience:</span>
                <span className="text-white font-semibold">{creator.experienceYears} Years</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-800/40">
                <span className="text-neutral-500">Spoken Languages:</span>
                <span className="text-white font-semibold">{creator.languages.join(', ')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-800/40">
                <span className="text-neutral-500">Primary City:</span>
                <span className="text-white font-semibold">
                  {creator.city}, {creator.country}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-500">Service Coverage:</span>
                <span className="text-white font-semibold">{creator.serviceAreas.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Section: Equipment & Skills */}
          <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Production Gear &amp; Equipment
              </h3>
              {isOwner && (
                <button
                  onClick={() => openEditModalAt('gear')}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  title="Edit Equipment"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {creator.equipment.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300"
                >
                  <Camera className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Specialized Skills
                </h4>
                {isOwner && (
                  <button
                    onClick={() => openEditModalAt('gear')}
                    className="p-1 rounded text-neutral-400 hover:text-white"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {creator.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 text-xs text-neutral-300 border border-neutral-700/60"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: EDIT COVER PHOTO PREVIEW & REPOSITION (FACEBOOK STYLE)          */}
      {/* ========================================================================= */}
      {coverCropModalOpen && coverPendingDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white font-['Space_Grotesk']">
                  Adjust Cover Photo
                </h3>
                <p className="text-xs text-neutral-400">
                  Preview how your cover will appear on your public profile
                </p>
              </div>
              <button
                onClick={() => setCoverCropModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Wide Cover Preview Box */}
            <div className="relative h-52 sm:h-64 w-full rounded-2xl overflow-hidden bg-black border border-neutral-800">
              <img
                src={coverPendingDataUrl}
                alt="Cover Preview"
                style={{
                  transform: `scale(${coverZoom}) translateY(${(coverPositionY - 50) * 0.4}%)`,
                  objectPosition: `center ${coverPositionY}%`,
                }}
                className="w-full h-full object-cover transition-transform duration-100"
              />
              <div className="absolute inset-0 border-2 border-white/20 pointer-events-none rounded-2xl" />
            </div>

            {/* Slider Controls */}
            <div className="space-y-3 bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                  <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Zoom
                </span>
                <span>{coverZoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.05"
                value={coverZoom}
                onChange={(e) => setCoverZoom(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />

              <div className="flex items-center justify-between text-xs text-neutral-400 pt-2">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                  <Sliders className="w-3.5 h-3.5 text-rose-400" /> Vertical Position
                </span>
                <span>{coverPositionY}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={coverPositionY}
                onChange={(e) => setCoverPositionY(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCoverCropModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploadingCover}
                onClick={handleSaveCoverPhoto}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-xs font-bold text-white shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isUploadingCover ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading to Drive...</span>
                  </>
                ) : (
                  <span>Save Cover Photo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: EDIT PROFILE PHOTO PREVIEW & CIRCLE CROP (FACEBOOK STYLE)       */}
      {/* ========================================================================= */}
      {avatarCropModalOpen && avatarPendingDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white font-['Space_Grotesk']">
                  Adjust Profile Photo
                </h3>
                <p className="text-xs text-neutral-400">
                  Rendered as a circular profile avatar across CreatorFlow
                </p>
              </div>
              <button
                onClick={() => setAvatarCropModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Circular Preview Container */}
            <div className="flex items-center justify-center py-4">
              <div className="relative w-48 h-48 rounded-full overflow-hidden ring-4 ring-neutral-800 bg-black shadow-2xl">
                <img
                  src={avatarPendingDataUrl}
                  alt="Avatar Preview"
                  style={{
                    transform: `scale(${avatarZoom})`,
                  }}
                  className="w-full h-full object-cover transition-transform duration-100"
                />
                <div className="absolute inset-0 border-2 border-white/20 rounded-full pointer-events-none" />
              </div>
            </div>

            {/* Slider Control */}
            <div className="space-y-2 bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                  <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Zoom
                </span>
                <span>{avatarZoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.05"
                value={avatarZoom}
                onChange={(e) => setAvatarZoom(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAvatarCropModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={handleSaveAvatarPhoto}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-xs font-bold text-white shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isUploadingAvatar ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Save Profile Photo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: INLINE EDIT PROFILE (CLEAN TABBED MODAL)                        */}
      {/* ========================================================================= */}
      {editProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-2xl w-full max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-white font-['Space_Grotesk']">
                  Edit Creator Profile
                </h3>
                <p className="text-xs text-neutral-400">
                  Update your storefront info without leaving this page
                </p>
              </div>
              <button
                onClick={() => setEditProfileModalOpen(false)}
                className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Strip */}
            <div className="flex border-b border-neutral-800/80 px-6 gap-3 overflow-x-auto bg-neutral-950/60 text-xs font-bold no-scrollbar">
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'location', label: 'Location & Areas' },
                { id: 'gear', label: 'Gear & Skills' },
                { id: 'social', label: 'Social & Web' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setEditProfileSection(s.id as any)}
                  className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
                    editProfileSection === s.id
                      ? 'border-rose-500 text-white'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveProfileChanges} className="p-6 overflow-y-auto space-y-4 flex-1">
              {editProfileSection === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Handle / Username
                      </label>
                      <div className="flex rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                        <span className="px-3 py-2.5 text-xs text-neutral-500 bg-neutral-900 border-r border-neutral-800">
                          @
                        </span>
                        <input
                          type="text"
                          required
                          value={editForm.username}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                            })
                          }
                          className="w-full px-3 py-2.5 bg-transparent text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      Creative Biography
                    </label>
                    <textarea
                      rows={3}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Tell potential clients about your style, narrative approach, and career..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500 leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Starting Price (৳ BDT)
                      </label>
                      <div className="flex rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                        <span className="px-3 py-2.5 text-xs text-amber-400 bg-neutral-900 border-r border-neutral-800 font-bold">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={editForm.startingPrice}
                          onChange={(e) =>
                            setEditForm({ ...editForm, startingPrice: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2.5 bg-transparent text-xs text-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.experienceYears}
                        onChange={(e) =>
                          setEditForm({ ...editForm, experienceYears: Number(e.target.value) })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      Spoken Languages (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editForm.languages}
                      onChange={(e) => setEditForm({ ...editForm, languages: e.target.value })}
                      placeholder="Bengali, English, Hindi..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              {editProfileSection === 'location' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        District (Optional)
                      </label>
                      <input
                        type="text"
                        value={editForm.district}
                        onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      Service Areas Covered (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editForm.serviceAreas}
                      onChange={(e) => setEditForm({ ...editForm, serviceAreas: e.target.value })}
                      placeholder="Dhaka, Gulshan, Dhanmondi, Chittagong, Nationwide..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              {editProfileSection === 'gear' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      Specialized Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editForm.skills}
                      onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                      placeholder="Cinematic Storytelling, Ronin Gimbal, Drone Piloting, DaVinci Resolve..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      Equipment &amp; Production Gear (one per line)
                    </label>
                    <textarea
                      rows={5}
                      value={editForm.equipment}
                      onChange={(e) => setEditForm({ ...editForm, equipment: e.target.value })}
                      placeholder="Sony FX6 Cinema Line&#10;Sony A7S III (B-Cam)&#10;DJI Ronin RS3 Pro&#10;DJI Mavic 3 Cine Drone"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {editProfileSection === 'social' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1 flex items-center gap-1.5">
                        <Instagram className="w-3.5 h-3.5 text-rose-400" /> Instagram Username or URL
                      </label>
                      <input
                        type="text"
                        value={editForm.instagram}
                        onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                        placeholder="@username or https://..."
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1 flex items-center gap-1.5">
                        <Youtube className="w-3.5 h-3.5 text-red-400" /> YouTube Channel
                      </label>
                      <input
                        type="text"
                        value={editForm.youtube}
                        onChange={(e) => setEditForm({ ...editForm, youtube: e.target.value })}
                        placeholder="@channel or https://..."
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1 flex items-center gap-1.5">
                        <Facebook className="w-3.5 h-3.5 text-sky-400" /> Facebook Profile / Page
                      </label>
                      <input
                        type="text"
                        value={editForm.facebook}
                        onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })}
                        placeholder="username or URL"
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" /> Website / Reel Portfolio
                      </label>
                      <input
                        type="text"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        placeholder="https://myportfolio.com"
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Footer */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-xs font-bold text-white shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL: ADD PORTFOLIO ITEM (FACEBOOK PHOTOS UPLOAD STYLE)             */}
      {/* ========================================================================= */}
      {addPortfolioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white font-['Space_Grotesk']">
                  Add to Portfolio
                </h3>
                <p className="text-xs text-neutral-400">
                  Upload photos or film frames to showcase on your profile
                </p>
              </div>
              <button
                onClick={() => setAddPortfolioModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPortfolioSubmit} className="space-y-4">
              {/* Hidden file input */}
              <input
                type="file"
                ref={portfolioFileInputRef}
                onChange={handleSelectPortfolioFile}
                accept="image/jpeg,image/png,image/webp,video/mp4"
                className="hidden"
              />

              {/* File Select / Drop Area */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Visual Media File
                </label>
                {portfolioFileDataUrl ? (
                  <div className="relative h-44 rounded-2xl overflow-hidden bg-black border border-neutral-800 group">
                    <img
                      src={portfolioFileDataUrl}
                      alt="Upload Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => portfolioFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Change File
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => portfolioFileInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-neutral-800 hover:border-neutral-600 bg-neutral-950/60 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-amber-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold">Choose Image or Video File</span>
                    <span className="text-[10px] text-neutral-500">
                      JPEG, PNG, WEBP or MP4 up to 20MB
                    </span>
                  </button>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'photography', label: 'Photography' },
                    { id: 'cinematography', label: 'Cinema' },
                    { id: 'editing', label: 'Editing' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPortfolioCategoryInput(cat.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                        portfolioCategoryInput === cat.id
                          ? 'bg-rose-500 text-white'
                          : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={portfolioTitle}
                  onChange={(e) => setPortfolioTitle(e.target.value)}
                  placeholder="e.g. Vintage Bridal Narrative, Sony FX6 Test..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Description / Story
                </label>
                <textarea
                  rows={2}
                  value={portfolioDesc}
                  onChange={(e) => setPortfolioDesc(e.target.value)}
                  placeholder="Equipment used, lighting conditions, or client brief..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Featured Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={portfolioFeatured}
                  onChange={(e) => setPortfolioFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500"
                />
                <span className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Feature on profile highlights
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddPortfolioModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPortfolio}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-xs font-bold text-white shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isUploadingPortfolio ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading to Drive...</span>
                    </>
                  ) : (
                    <span>Upload to Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. LIGHTBOX MODAL                                                        */}
      {/* ========================================================================= */}
      {selectedLightboxItem && (
        <div
          onClick={() => setSelectedLightboxItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white font-['Space_Grotesk']">
                  {selectedLightboxItem.title}
                </h4>
                <span className="text-[10px] uppercase font-semibold text-rose-400">
                  {selectedLightboxItem.category} • Full-Resolution Master
                </span>
              </div>
              <button
                onClick={() => setSelectedLightboxItem(null)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative max-h-[70vh] bg-black flex items-center justify-center">
              <img
                src={normalizeGoogleDriveImageUrl(selectedLightboxItem.fileUrl, 1600)}
                alt={selectedLightboxItem.title}
                className="max-h-[70vh] w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.5';
                }}
              />
            </div>
            {selectedLightboxItem.description && (
              <div className="p-4 text-xs text-neutral-300 bg-neutral-950 border-t border-neutral-800">
                {selectedLightboxItem.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
