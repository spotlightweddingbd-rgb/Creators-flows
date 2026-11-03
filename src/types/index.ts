/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'customer' | 'creator' | 'staff' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'deleted';

export interface User {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  accountType: AccountType;
  status: UserStatus;
  profileImage: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Creator {
  creatorId: string;
  userId: string;
  displayName: string;
  username: string;
  roles: string[]; // e.g. ["Photographer", "Cinematographer", "Drone Operator"]
  bio: string;
  profileImageUrl: string;
  coverImageUrl: string;
  city: string;
  district: string;
  country: string;
  serviceAreas: string[];
  skills: string[];
  languages: string[];
  experienceYears: number;
  equipment: string[];
  startingPrice: number;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  website?: string;
  verified: boolean;
  featured: boolean;
  rating: number;
  reviewCount: number;
  driveRootFolderId?: string;
  driveRootFolderUrl?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PortfolioCategory = 'photography' | 'cinematography' | 'editing';

export interface PortfolioItem {
  portfolioId: string;
  creatorId: string;
  title: string;
  description: string;
  category: PortfolioCategory;
  fileId: string;
  fileUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  tags: string[];
  featured: boolean;
  status: 'active' | 'archived';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  serviceId: string;
  creatorId: string;
  title: string;
  description: string;
  category: string;
  startingPrice: number;
  deliveryTime: string;
  location: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PackageItem {
  packageId: string;
  creatorId: string;
  serviceId: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  teamSize: number;
  photoCount: number;
  editedPhotoCount: number;
  videoDuration: string;
  deliveryTime: string;
  revisions: number;
  travelIncluded: boolean;
  equipment: string[];
  addons: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export type AvailabilityStatus = 'available' | 'unavailable' | 'tentative' | 'booked';

export interface Availability {
  availabilityId: string;
  creatorId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AvailabilityStatus;
  bookingId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'fully_paid' | 'refunded';

export interface Booking {
  bookingId: string;
  customerId: string;
  creatorId: string;
  serviceId: string;
  packageId: string;
  projectTitle: string;
  projectType: string;
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  budget: number;
  message: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  calendarEventId?: string;
  driveProjectFolderId?: string;
  createdAt: string;
  updatedAt: string;
  // joined fields for UI display
  customerName?: string;
  customerEmail?: string;
  creatorName?: string;
  packageName?: string;
}

export type ProjectStatus =
  | 'Not Started'
  | 'Active'
  | 'Waiting for Client'
  | 'Editing'
  | 'Review'
  | 'Ready for Delivery'
  | 'Completed';

export interface Project {
  projectId: string;
  bookingId: string;
  customerId: string;
  creatorId: string;
  title: string;
  status: ProjectStatus;
  driveFolderId?: string;
  startDate: string;
  deliveryDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // UI helper
  customerName?: string;
  creatorName?: string;
}

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  bookingId?: string;
  projectId?: string;
  message: string;
  attachmentFileId?: string;
  attachmentUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Review {
  reviewId: string;
  bookingId: string;
  customerId: string;
  creatorId: string;
  overallRating: number;
  communicationRating: number;
  qualityRating: number;
  professionalismRating: number;
  deliveryRating: number;
  valueRating: number;
  reviewText: string;
  createdAt: string;
  customerName?: string;
  customerAvatar?: string;
}

export interface DriveFolders {
  creatorId: string;
  rootFolderId: string;
  profileFolderId: string;
  portfolioFolderId: string;
  photographyFolderId: string;
  cinematographyFolderId: string;
  editingFolderId: string;
  clientProjectsFolderId: string;
  deliverablesFolderId: string;
  contractsFolderId: string;
  invoicesFolderId: string;
  temporaryUploadsFolderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'calendar' | 'message' | 'review' | 'system' | 'project';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthSession {
  token: string;
  user: User;
  creator?: Creator;
}
