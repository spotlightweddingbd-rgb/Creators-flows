/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  HardDrive,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Creator, PackageItem, Service, AuthSession, Booking } from '../types';
import { createBooking } from '../services/api';
import { SafeAvatar } from '../utils/imageUtils';

interface BookingModalProps {
  isOpen: boolean;
  creator: Creator | null;
  selectedPackage: PackageItem | null;
  session: AuthSession | null;
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
  onRequireAuth: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  creator,
  selectedPackage,
  session,
  onClose,
  onSuccess,
  onRequireAuth,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectType, setProjectType] = useState('Cinematography & Photography');
  const [eventDate, setEventDate] = useState('2026-11-18');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('18:00');
  const [location, setLocation] = useState('Dhaka, Bangladesh');
  const [budget, setBudget] = useState(selectedPackage ? selectedPackage.price : (creator?.startingPrice || 600));
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !creator) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      onRequireAuth();
      return;
    }

    if (!projectTitle.trim()) {
      setErrorMessage('Please enter a project title');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      setSubmissionProgress('Verifying creator schedule...');
      await new Promise((r) => setTimeout(r, 400));

      setSubmissionProgress('Securing your booking reservation...');
      await new Promise((r) => setTimeout(r, 500));

      setSubmissionProgress('Setting up project workspace...');
      const booking = await createBooking({
        creatorId: creator.creatorId,
        packageId: selectedPackage?.packageId,
        serviceId: selectedPackage?.serviceId,
        projectTitle: projectTitle.trim(),
        projectType,
        eventDate,
        startTime,
        endTime,
        location,
        budget: Number(budget),
        message: message.trim(),
      });

      setSubmissionProgress('Booking confirmed!');
      await new Promise((r) => setTimeout(r, 400));
      onSuccess(booking);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Booking submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      setSubmissionProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <SafeAvatar
              src={creator.profileImageUrl}
              name={creator.displayName}
              className="w-10 h-10 rounded-xl ring-1 ring-neutral-700"
              size={400}
            />
            <div>
              <h3 className="font-bold text-sm text-white">Book {creator.displayName}</h3>
              <p className="text-[11px] text-neutral-400">
                {selectedPackage ? selectedPackage.name : 'Custom Production Booking'} • ৳{Number(budget).toLocaleString()} BDT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step Booking Flow Indicator */}
        <div className="bg-neutral-950/40 border-b border-neutral-800/80 px-5 py-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-semibold text-neutral-400 whitespace-nowrap">
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 inline-flex items-center justify-center text-[10px] font-bold">1</span>
              {selectedPackage ? selectedPackage.name : 'Package / Custom'}
            </span>
            <span className="text-neutral-600">→</span>
            <span className="text-neutral-300 flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-300 inline-flex items-center justify-center text-[10px] font-bold">2</span>
              Date &amp; Time
            </span>
            <span className="text-neutral-600">→</span>
            <span className="text-neutral-300 flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-300 inline-flex items-center justify-center text-[10px] font-bold">3</span>
              Project Details
            </span>
            <span className="text-neutral-600">→</span>
            <span className="text-neutral-300 flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-300 inline-flex items-center justify-center text-[10px] font-bold">4</span>
              Review Budget
            </span>
            <span className="text-neutral-600">→</span>
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-300 inline-flex items-center justify-center text-[10px] font-bold">5</span>
              Send Request
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Project Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Project Title / Event Name *
              </label>
              <input
                type="text"
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Autumn Wedding Film or Spring Brand Lookbook"
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="Wedding Cinematography">Wedding Cinematography</option>
                <option value="Commercial & Brand">Commercial &amp; Brand</option>
                <option value="Fashion / Editorial Shoot">Fashion / Editorial Shoot</option>
                <option value="Music Video">Music Video</option>
                <option value="Corporate / Event">Corporate / Event</option>
                <option value="Post-Production & Grading">Post-Production &amp; Grading</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Location / Venue *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Studio address, or Remote"
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Event Date *
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Message / Creative Brief */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
              Creative Brief &amp; Notes
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the creator about your schedule, vibe, aesthetic, or specific deliverables..."
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 leading-relaxed"
            />
          </div>

          {/* Booking Protection Notice & Flow Disclaimer */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-[11px] text-neutral-400">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>How Booking Works</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              Submitting sends a direct booking request to {creator.displayName}. The creator reviews your event date and scope, then confirms availability before any payment or commitment.
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-neutral-400 pl-1 pt-1 border-t border-neutral-900">
              <li>Direct calendar appointment lock &amp; scheduling</li>
              <li>Dedicated cloud workspace for raw footage &amp; final deliverables</li>
              <li>Milestone delivery protection for your peace of mind</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Estimated Total</span>
              <span className="text-xl font-extrabold text-white font-['Space_Grotesk']">
                ৳{Number(budget).toLocaleString()} <span className="text-xs text-neutral-400 font-normal">BDT</span>
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{submissionProgress || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <span>Send Booking Request</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
