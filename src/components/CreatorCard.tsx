/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, MapPin, CheckCircle, ArrowRight, Camera, Sparkles, MessageSquare, Heart } from 'lucide-react';
import { Creator } from '../types';
import { SafeAvatar, SafeCover } from '../utils/imageUtils';

interface CreatorCardProps {
  creator: Creator;
  isSaved?: boolean;
  onToggleSave?: (creator: Creator) => void;
  onSelect: (creator: Creator) => void;
  onBook: (creator: Creator) => void;
  onMessage?: (creator: Creator) => void;
  layout?: 'grid' | 'list';
}

export const CreatorCard: React.FC<CreatorCardProps> = ({
  creator,
  isSaved = false,
  onToggleSave,
  onSelect,
  onBook,
  onMessage,
  layout = 'grid',
}) => {
  const primaryRole = creator.roles?.[0] || 'Creative Professional';
  const availStatus = creator.availabilityStatus || 'Available';

  const getAvailPill = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'limited') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Limited
        </span>
      );
    }
    if (s === 'busy') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          Busy
        </span>
      );
    }
    if (s === 'unavailable') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700/50">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
          Unavailable
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Available
      </span>
    );
  };

  // ----------------------------------------------------
  // LIST VIEW LAYOUT
  // ----------------------------------------------------
  if (layout === 'list') {
    return (
      <div className="group relative bg-[#171A22] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Avatar & Meta */}
        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
          <div className="relative shrink-0 cursor-pointer" onClick={() => onSelect(creator)}>
            <SafeAvatar
              src={creator.profileImageUrl}
              name={creator.displayName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ring-1 ring-white/10 object-cover group-hover:ring-amber-500/40 transition-all"
              size={400}
            />
            {creator.verified && (
              <div className="absolute -bottom-1 -right-1 bg-[#171A22] rounded-full p-0.5">
                <CheckCircle className="w-4 h-4 text-sky-400 fill-sky-400/20" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                onClick={() => onSelect(creator)}
                className="text-base font-bold text-white group-hover:text-amber-400 transition-colors cursor-pointer truncate"
              >
                {creator.displayName}
              </h3>
              {creator.featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/25">
                  <Sparkles className="w-2.5 h-2.5" />
                  Featured
                </span>
              )}
              {getAvailPill(availStatus)}
            </div>

            <p className="text-xs text-white/60 mt-0.5 truncate">
              {creator.roles?.join(' • ') || primaryRole}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {creator.city || 'Dhaka'}, {creator.country || 'Bangladesh'}
              </span>
              <span>•</span>
              <span className="text-white/60">{creator.experienceYears}y experience</span>
              <span>•</span>
              {creator.reviewCount > 0 ? (
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {creator.rating.toFixed(1)}{' '}
                  <span className="font-normal text-white/50">({creator.reviewCount})</span>
                </span>
              ) : (
                <span className="text-amber-300 font-semibold text-[11px] px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                  New
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pricing & Actions */}
        <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.06] shrink-0">
          <div className="text-left md:text-right">
            <span className="text-[10px] text-white/50 block font-medium uppercase tracking-wider">
              {creator.startingPrice > 0 ? 'Starts from' : 'Rate'}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-white font-['Space_Grotesk']">
              {creator.startingPrice > 0 ? `৳${creator.startingPrice.toLocaleString()}` : 'Contact for Pricing'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(creator);
                }}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  isSaved
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : 'bg-[#11141B] border-white/[0.08] text-white/60 hover:text-white hover:border-white/[0.18]'
                }`}
                title={isSaved ? 'Remove from saved' : 'Save freelancer'}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}

            {onMessage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage(creator);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#11141B] hover:bg-[#1E222D] text-white/80 hover:text-white text-xs font-semibold border border-white/[0.08] hover:border-white/[0.18] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelect(creator)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>View Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // GRID VIEW LAYOUT (DEFAULT)
  // ----------------------------------------------------
  return (
    <div className="group relative bg-[#171A22] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.18] transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/5 flex flex-col">
      {/* Cover Image banner */}
      <div className="relative h-44 w-full overflow-hidden bg-[#11141B]">
        <SafeCover
          src={creator.coverImageUrl}
          alt={creator.displayName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          size={800}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171A22] via-[#171A22]/20 to-black/40" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          {/* Featured Badge */}
          {creator.featured ? (
            <div className="px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-black text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-black" />
              <span>Featured</span>
            </div>
          ) : (
            <div />
          )}

          {/* Save/Favorite Heart Button */}
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(creator);
              }}
              className={`p-2 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                isSaved
                  ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30'
                  : 'bg-black/60 text-white/80 border-white/20 hover:text-white hover:bg-black/80 hover:scale-105'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save freelancer'}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
            </button>
          )}
        </div>

        {/* Availability Pill & Price Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          {getAvailPill(availStatus)}

          <div className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold shadow-md">
            {creator.startingPrice > 0 ? (
              <>
                <span className="text-white/60 font-normal">From </span>
                <span className="text-amber-400 font-extrabold">৳{creator.startingPrice.toLocaleString()}</span>
              </>
            ) : (
              <span className="text-white/80 font-medium">Contact for Pricing</span>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <SafeAvatar
                src={creator.profileImageUrl}
                name={creator.displayName}
                className="w-12 h-12 rounded-xl ring-2 ring-white/10 shadow-md shrink-0 object-cover"
                size={400}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3
                    onClick={() => onSelect(creator)}
                    className="font-bold text-white text-base group-hover:text-amber-400 transition-colors cursor-pointer truncate"
                  >
                    {creator.displayName}
                  </h3>
                  {creator.verified && (
                    <CheckCircle className="w-4 h-4 text-sky-400 fill-sky-400/20 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-white/60 font-mono truncate">@{creator.username}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20 shrink-0">
              {creator.reviewCount > 0 ? (
                <>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{creator.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-white/50 font-normal">({creator.reviewCount})</span>
                </>
              ) : (
                <span className="text-amber-300 font-semibold px-0.5 text-[11px]">New</span>
              )}
            </div>
          </div>

          {/* Location & Experience */}
          <div className="flex items-center gap-1.5 text-xs text-white/60 mt-3">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{creator.city || 'Dhaka'}, {creator.country || 'Bangladesh'}</span>
            <span className="text-white/30">•</span>
            <span className="text-white/60">{creator.experienceYears}y exp</span>
          </div>

          {/* Roles Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {creator.roles?.slice(0, 2).map((role, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-[#11141B] text-[10.5px] font-medium text-white/80 border border-white/[0.08]"
              >
                {role}
              </span>
            ))}
            {creator.roles && creator.roles.length > 2 && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#11141B] text-[10.5px] text-white/50 border border-white/[0.08]">
                +{creator.roles.length - 2}
              </span>
            )}
          </div>

          {/* Bio snippet */}
          <p className="text-xs text-white/60 line-clamp-2 mt-2.5 leading-relaxed font-normal">
            {creator.bio}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
          {onMessage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMessage(creator);
              }}
              className="p-2.5 rounded-xl bg-[#11141B] hover:bg-[#1E222D] text-white/70 hover:text-white border border-white/[0.08] hover:border-white/[0.18] transition-colors cursor-pointer"
              title="Message Creator (No account required)"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelect(creator)}
            className="flex-1 px-3 py-2 rounded-xl bg-[#11141B] hover:bg-[#1E222D] text-white/80 hover:text-white text-xs font-semibold border border-white/[0.08] hover:border-white/[0.18] transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            Profile
          </button>

          <button
            type="button"
            onClick={() => onBook(creator)}
            className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Book</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
