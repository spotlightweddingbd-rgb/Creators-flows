/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Lock,
  Calendar as CalendarIcon,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  LogIn,
  MessageSquare,
} from 'lucide-react';
import { Creator, PackageItem } from '../types';
import { SafeAvatar } from '../utils/imageUtils';

interface BookingAuthGateModalProps {
  isOpen: boolean;
  creator: Creator | null;
  selectedPackage?: PackageItem | null;
  onClose: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onSwitchToMessage: () => void;
}

export const BookingAuthGateModal: React.FC<BookingAuthGateModalProps> = ({
  isOpen,
  creator,
  selectedPackage,
  onClose,
  onNavigateLogin,
  onNavigateRegister,
  onSwitchToMessage,
}) => {
  if (!isOpen || !creator) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Icon & Creator Pill */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Project Booking Gate
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <SafeAvatar
                src={creator.profileImageUrl}
                name={creator.displayName}
                className="w-5 h-5 rounded-full ring-1 ring-neutral-700"
                size={100}
              />
              <span className="text-xs font-bold text-white truncate">{creator.displayName}</span>
              {selectedPackage && (
                <span className="text-[10px] text-neutral-400 truncate font-mono">
                  • {selectedPackage.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Heading & Clear Copy */}
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
            Account Required to Book
          </h2>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Create an account or sign in to send a project request to {creator.displayName}.
          </p>
        </div>

        {/* Why an Account is Needed */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs text-neutral-400">
          <span className="text-white font-bold flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Why is an account needed for bookings?</span>
          </span>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400 pl-1">
            <li>Locks confirmed shoot dates on {creator.displayName}'s calendar</li>
            <li>Gives you access to a dedicated cloud workspace for raw and edited files</li>
            <li>Enables milestone tracking and invoice receipts</li>
          </ul>
        </div>

        {/* Difference Callout: Message vs Booking */}
        <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between text-xs">
          <div>
            <p className="font-semibold text-white text-[11px]">Just have a quick question?</p>
            <p className="text-[10px] text-neutral-400">You can message this creator without an account.</p>
          </div>
          <button
            type="button"
            onClick={onSwitchToMessage}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 transition-colors shrink-0 flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
            <span>Message</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onNavigateRegister}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Client Account &amp; Book</span>
          </button>

          <button
            type="button"
            onClick={onNavigateLogin}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-neutral-700"
          >
            <LogIn className="w-4 h-4 text-neutral-300" />
            <span>Sign In to Existing Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
