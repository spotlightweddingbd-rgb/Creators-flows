/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ArrowRight, ArrowUpRight, CheckCircle, Sparkles, Star } from 'lucide-react';
import { Creator } from '../types';
import { SafeAvatar } from '../utils/imageUtils';

interface FeaturedFreelancersMarqueeProps {
  creators: Creator[];
  onSelectCreator: (creator: Creator) => void;
  onViewAll?: () => void;
}

export const FeaturedFreelancersMarquee: React.FC<FeaturedFreelancersMarqueeProps> = ({
  creators,
  onSelectCreator,
  onViewAll,
}) => {
  // RULE: The Featured Freelancers section on the public marketplace must load ONLY creator.featured === true
  const featuredList = useMemo(() => {
    return (creators || []).filter((c) => Boolean(c.featured));
  }, [creators]);

  const count = featuredList.length;

  // RULE: 0 featured freelancers -> hide the section cleanly
  if (count === 0) {
    return null;
  }

  // Helper to build seamless duplicate track for continuous ticker
  const buildRowSequence = (sourceList: Creator[], shiftOffset = 0, targetMin = 8): Creator[] => {
    if (sourceList.length === 0) return [];
    const shifted = [
      ...sourceList.slice(shiftOffset % sourceList.length),
      ...sourceList.slice(0, shiftOffset % sourceList.length),
    ];
    let seq = [...shifted];
    while (seq.length < targetMin) {
      seq = [...seq, ...shifted];
    }
    return seq;
  };

  // Row sequences for single or dual slider rows
  const singleRowItems = useMemo(() => {
    return buildRowSequence(featuredList, 0, Math.max(8, featuredList.length));
  }, [featuredList]);

  const rowOneItems = useMemo(() => {
    return buildRowSequence(featuredList, 0, Math.max(8, featuredList.length));
  }, [featuredList]);

  const rowTwoItems = useMemo(() => {
    const offset = Math.max(1, Math.floor(featuredList.length / 2));
    return buildRowSequence(featuredList, offset, Math.max(8, featuredList.length));
  }, [featuredList]);

  return (
    <section
      aria-label="Featured Freelancers"
      className="relative rounded-3xl bg-[#11141B] border border-white/[0.08] py-6 sm:py-7 px-4 sm:px-6 overflow-hidden shadow-xl space-y-5"
    >
      {/* Section Header with exact requested copy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/25">
              CURATED TALENT
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white font-['Space_Grotesk'] tracking-tight">
              Featured Freelancers
            </h2>
          </div>
          <p className="text-xs text-white/60">
            Selected independent creatives highlighted by SpotlightPhotography.
          </p>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="group/cta inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>View All Freelancers</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/cta:translate-x-1" />
          </button>
        )}
      </div>

      {/* 1–3 Featured: Show static premium cards in a clean responsive grid without an endless marquee */}
      {count >= 1 && count <= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
          {featuredList.map((creator) => (
            <FeaturedFreelancerCard
              key={`static-feat-${creator.creatorId}`}
              creator={creator}
              onSelect={() => onSelectCreator(creator)}
            />
          ))}
        </div>
      )}

      {/* 4–7 Featured: Show ONE smooth slider row */}
      {count >= 4 && count <= 7 && (
        <div className="relative w-full overflow-hidden edge-fade-mask pt-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="hover-pause overflow-hidden reduce-motion-scroll">
            <div className="flex gap-3.5 w-max animate-marquee-forward">
              {/* Group A */}
              <div className="flex gap-3.5 shrink-0">
                {singleRowItems.map((creator, idx) => (
                  <FeaturedFreelancerCard
                    key={`r1-single-a-${creator.creatorId}-${idx}`}
                    creator={creator}
                    onSelect={() => onSelectCreator(creator)}
                  />
                ))}
              </div>

              {/* Group B (identical duplicate for seamless loop) */}
              <div className="flex gap-3.5 shrink-0" aria-hidden="true">
                {singleRowItems.map((creator, idx) => (
                  <FeaturedFreelancerCard
                    key={`r1-single-b-${creator.creatorId}-${idx}`}
                    creator={creator}
                    onSelect={() => onSelectCreator(creator)}
                    isClone
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8+ Featured: Show TWO smooth slider rows in opposite directions */}
      {count >= 8 && (
        <div className="relative w-full overflow-hidden edge-fade-mask space-y-3.5 pt-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
          {/* Row 1: Right-to-Left */}
          <div className="hover-pause overflow-hidden reduce-motion-scroll">
            <div className="flex gap-3.5 w-max animate-marquee-forward">
              <div className="flex gap-3.5 shrink-0">
                {rowOneItems.map((creator, idx) => (
                  <FeaturedFreelancerCard
                    key={`r1-dual-a-${creator.creatorId}-${idx}`}
                    creator={creator}
                    onSelect={() => onSelectCreator(creator)}
                  />
                ))}
              </div>
              <div className="flex gap-3.5 shrink-0" aria-hidden="true">
                {rowOneItems.map((creator, idx) => (
                  <FeaturedFreelancerCard
                    key={`r1-dual-b-${creator.creatorId}-${idx}`}
                    creator={creator}
                    onSelect={() => onSelectCreator(creator)}
                    isClone
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Left-to-Right */}
          <div className="hover-pause overflow-hidden reduce-motion-scroll">
            <div className="flex gap-3.5 w-max animate-marquee-reverse">
              <div className="flex gap-3.5 shrink-0">
                {rowTwoItems.map((creator, idx) => (
                  <FeaturedFreelancerCard
                    key={`r2-dual-a-${creator.creatorId}-${idx}`}
                    creator={creator}
                    onSelect={() => onSelectCreator(creator)}
                  />
                ))}
              </div>
              <div className="flex gap-3.5 shrink-0" aria-hidden="true">
                {rowTwoItems.map((creator, idx) => (
                  <FeaturedFreelancerCard
                    key={`r2-dual-b-${creator.creatorId}-${idx}`}
                    creator={creator}
                    onSelect={() => onSelectCreator(creator)}
                    isClone
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

interface FeaturedFreelancerCardProps {
  creator: Creator;
  onSelect: () => void;
  isClone?: boolean;
}

const FeaturedFreelancerCard: React.FC<FeaturedFreelancerCardProps> = ({
  creator,
  onSelect,
  isClone = false,
}) => {
  const primaryRole = creator.roles?.[0] || 'Creative Professional';
  const location = creator.city || creator.country || 'Dhaka';
  const availStatus = creator.availabilityStatus || 'Available';

  const getAvailPill = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'limited') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Limited
        </span>
      );
    }
    if (s === 'busy') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          Busy
        </span>
      );
    }
    if (s === 'unavailable') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700/50">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
          Unavailable
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Available
      </span>
    );
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={isClone ? -1 : 0}
      className="group/pill flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-[#171A22] hover:bg-[#1E222D] border border-white/[0.08] hover:border-amber-500/30 shadow-md hover:shadow-xl transition-all duration-200 text-left shrink-0 cursor-pointer select-none max-w-[340px] sm:max-w-[360px]"
      title={`Open ${creator.displayName}'s profile`}
    >
      {/* Large circular avatar with SafeAvatar */}
      <div className="relative shrink-0">
        <SafeAvatar
          src={creator.profileImageUrl}
          name={creator.displayName}
          className="w-12 h-12 rounded-full ring-2 ring-white/10 group-hover/pill:ring-amber-500/50 transition-all object-cover"
          size={160}
        />
        {creator.verified && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-[#171A22] rounded-full p-0.5 leading-none">
            <CheckCircle className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
          </div>
        )}
      </div>

      {/* Info Block */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-white group-hover/pill:text-amber-300 transition-colors truncate">
            {creator.displayName}
          </h3>
          {creator.featured && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
              Featured
            </span>
          )}
        </div>

        <p className="text-xs text-white/60 truncate mt-0.5">
          {primaryRole} • {location}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          {creator.reviewCount > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
              <Star className="w-3 h-3 fill-amber-400" />
              {creator.rating.toFixed(1)}{' '}
              <span className="font-normal text-white/50">({creator.reviewCount})</span>
            </span>
          ) : (
            <span className="text-[10px] text-amber-300 font-semibold px-1 rounded bg-amber-500/10 border border-amber-500/20">
              New
            </span>
          )}

          <span className="text-white/20">•</span>

          {getAvailPill(availStatus)}
        </div>
      </div>

      {/* Small Arrow Icon */}
      <div className="w-7 h-7 rounded-xl bg-[#11141B] group-hover/pill:bg-amber-500/15 text-white/50 group-hover/pill:text-amber-300 border border-white/[0.06] flex items-center justify-center shrink-0 transition-all ml-1 group-hover/pill:translate-x-0.5 group-hover/pill:-translate-y-0.5">
        <ArrowUpRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
};
