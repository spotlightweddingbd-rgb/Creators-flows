/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, MapPin, CheckCircle, ArrowRight, Camera, Film } from 'lucide-react';
import { Creator } from '../types';
import { SafeAvatar, SafeCover } from '../utils/imageUtils';

interface CreatorCardProps {
  creator: Creator;
  onSelect: (creator: Creator) => void;
  onBook: (creator: Creator) => void;
}

export const CreatorCard: React.FC<CreatorCardProps> = ({
  creator,
  onSelect,
  onBook,
}) => {
  return (
    <div className="group relative bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10 flex flex-col">
      {/* Cover Image banner */}
      <div className="relative h-44 w-full overflow-hidden bg-neutral-950">
        <SafeCover
          src={creator.coverImageUrl}
          alt={creator.displayName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          size={800}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/30" />

        {/* Starting Price Pill */}
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md border border-neutral-700/60 text-white text-xs font-bold shadow-lg">
          From <span className="text-amber-400 font-extrabold">৳{creator.startingPrice.toLocaleString()} BDT</span>
        </div>

        {/* Roles Badges */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
          {creator.roles.slice(0, 2).map((role, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-neutral-950/70 backdrop-blur-md text-[10px] font-semibold text-neutral-200 border border-neutral-700/50"
            >
              {role}
            </span>
          ))}
          {creator.roles.length > 2 && (
            <span className="px-1.5 py-0.5 rounded-md bg-neutral-950/70 text-[10px] text-neutral-400 border border-neutral-700/50">
              +{creator.roles.length - 2}
            </span>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <SafeAvatar
                src={creator.profileImageUrl}
                name={creator.displayName}
                className="w-12 h-12 rounded-xl ring-2 ring-neutral-800 shadow-md"
                size={400}
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                    {creator.displayName}
                  </h3>
                  {creator.verified && (
                    <CheckCircle className="w-4 h-4 text-sky-400 fill-sky-400/20" />
                  )}
                </div>
                <p className="text-xs text-neutral-400 font-mono">@{creator.username}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{creator.rating.toFixed(1)}</span>
              <span className="text-[10px] text-neutral-400 font-normal">({creator.reviewCount})</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-3">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{creator.city}, {creator.country}</span>
            <span className="text-neutral-600">•</span>
            <span className="text-neutral-400">{creator.experienceYears}y exp</span>
          </div>

          {/* Bio snippet */}
          <p className="text-xs text-neutral-300 line-clamp-2 mt-2.5 leading-relaxed font-normal">
            {creator.bio}
          </p>

          {/* Equipment snippet */}
          {creator.equipment && creator.equipment.length > 0 && (
            <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center gap-1.5 text-[11px] text-neutral-400 truncate">
              <Camera className="w-3 h-3 text-neutral-500 shrink-0" />
              <span className="truncate">{creator.equipment[0]}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-2">
          <button
            onClick={() => onSelect(creator)}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
          >
            View Portfolio
          </button>
          <button
            onClick={() => onBook(creator)}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1"
          >
            <span>Book Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
