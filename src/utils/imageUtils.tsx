/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User as UserIcon, Camera } from 'lucide-react';

/**
 * Extracts a Google Drive file ID from various Drive URL formats or raw ID strings.
 * Supports:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/thumbnail?id=FILE_ID
 * - https://lh3.googleusercontent.com/d/FILE_ID
 * - Direct ID strings
 */
export function extractGoogleDriveFileId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. /file/d/FILE_ID
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // 2. [?&]id=FILE_ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // 3. lh3.googleusercontent.com/d/FILE_ID
  const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match && lh3Match[1]) return lh3Match[1];

  // 4. Raw file ID (alphanumeric string with _ or -, length between 25 and 55, without slashes/colons)
  if (!trimmed.includes('/') && !trimmed.includes(':') && /^[a-zA-Z0-9_-]{25,55}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Normalizes any Google Drive image URL to the robust, public CDN thumbnail format.
 * https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
 * Base64 data URLs, blob URLs, and external web URLs are returned directly.
 */
export function normalizeGoogleDriveImageUrl(url?: string | null, size: number = 1000): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Base64 data URLs or blob URLs should be left untouched
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Check if it's a Google Drive URL or raw Drive ID
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`;
  }

  return trimmed;
}

/**
 * Generates 1 or 2 uppercase initials from a person or brand name.
 */
export function getInitials(name?: string | null, maxChars: number = 2): string {
  if (!name || typeof name !== 'string') return 'U';
  const clean = name.trim();
  if (!clean) return 'U';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, maxChars).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface SafeAvatarProps {
  src?: string | null;
  alt?: string;
  name?: string | null;
  initials?: string;
  className?: string;
  size?: number; // Drive thumbnail size (default 600)
  iconClassName?: string;
}

/**
 * SafeAvatar:
 * - Normalizes Google Drive image URLs to thumbnail format
 * - Catches image load errors gracefully via onError
 * - Renders a clean gradient initials badge or SVG silhouette fallback
 * - Never renders a broken image icon or missing asset box
 */
export const SafeAvatar: React.FC<SafeAvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  initials,
  className = 'w-10 h-10 rounded-full',
  size = 600,
  iconClassName,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if image src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const cleanSrc = src?.trim();
  const normalizedUrl = cleanSrc ? normalizeGoogleDriveImageUrl(cleanSrc, size) : '';
  const displayInitials = initials || getInitials(name);

  // If no source or load error, show clean fallback placeholder
  if (!normalizedUrl || hasError) {
    if (name || initials) {
      return (
        <div
          className={`flex items-center justify-center font-bold text-white bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-500 font-['Space_Grotesk'] select-none shrink-0 ${className}`}
          title={alt || name || 'Avatar'}
        >
          <span className="truncate">{displayInitials}</span>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center justify-center bg-neutral-800 text-neutral-400 select-none shrink-0 ring-1 ring-neutral-700/50 ${className}`}
        title={alt || 'Avatar'}
      >
        <UserIcon className={iconClassName || 'w-1/2 h-1/2 opacity-70'} />
      </div>
    );
  }

  return (
    <img
      src={normalizedUrl}
      alt={alt || name || 'Avatar'}
      className={`object-cover shrink-0 ${className}`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

export interface SafeCoverProps {
  src?: string | null;
  alt?: string;
  className?: string;
  size?: number;
  placeholderText?: string;
  showPlaceholderCamera?: boolean;
}

/**
 * SafeCover:
 * - Normalizes Google Drive cover image URLs
 * - Gracefully falls back to dark studio gradient if image fails or is empty
 */
export const SafeCover: React.FC<SafeCoverProps> = ({
  src,
  alt = 'Cover photo',
  className = 'w-full h-full object-cover',
  size = 1600,
  placeholderText,
  showPlaceholderCamera = true,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const cleanSrc = src?.trim();
  const normalizedUrl = cleanSrc ? normalizeGoogleDriveImageUrl(cleanSrc, size) : '';

  if (!normalizedUrl || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800 via-neutral-900 to-neutral-950">
        {showPlaceholderCamera && (
          <Camera className="w-12 h-12 stroke-[1.2] opacity-30 mb-2" />
        )}
        {placeholderText && (
          <span className="text-xs font-medium text-neutral-500 text-center px-4">
            {placeholderText}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={normalizedUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};
