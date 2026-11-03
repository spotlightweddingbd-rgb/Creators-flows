/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  User,
  Phone,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Creator, Message } from '../types';
import { SafeAvatar } from '../utils/imageUtils';
import {
  sendGuestMessage,
  getGuestMessages,
  getGuestStoredConversations,
  sendMessage,
} from '../services/api';

interface GuestMessageModalProps {
  isOpen: boolean;
  creator: Creator | null;
  onClose: () => void;
  sessionUser: any | null;
  onOpenBookingGate?: () => void;
}

export const GuestMessageModal: React.FC<GuestMessageModalProps> = ({
  isOpen,
  creator,
  onClose,
  sessionUser,
  onOpenBookingGate,
}) => {
  const [name, setName] = useState(sessionUser?.fullName || '');
  const [email, setEmail] = useState(sessionUser?.email || '');
  const [phone, setPhone] = useState(sessionUser?.phone || '');
  const [messageText, setMessageText] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Spam honeypot
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Ongoing conversation state if guest previously contacted this creator
  const [activeGuestConvId, setActiveGuestConvId] = useState<string | null>(null);
  const [activeGuestToken, setActiveGuestToken] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  useEffect(() => {
    if (!isOpen || !creator) {
      setSuccessNotice(null);
      setErrorMessage(null);
      return;
    }

    if (sessionUser) {
      setName(sessionUser.fullName || '');
      setEmail(sessionUser.email || '');
      setPhone(sessionUser.phone || '');
    }

    // Check if guest already has a conversation with this creator
    const stored = getGuestStoredConversations();
    const existing = stored.find((c) => c.creatorId === creator.creatorId);
    if (existing) {
      setActiveGuestConvId(existing.conversationId);
      setActiveGuestToken(existing.guestAccessToken);
      setName(existing.guestName || sessionUser?.fullName || '');
      setEmail(existing.guestEmail || sessionUser?.email || '');
      setPhone(existing.guestPhone || sessionUser?.phone || '');
      loadThread(existing.conversationId, existing.guestAccessToken);
    } else {
      setActiveGuestConvId(null);
      setActiveGuestToken(null);
      setThreadMessages([]);
    }
  }, [isOpen, creator, sessionUser]);

  const loadThread = async (convId: string, token: string) => {
    setIsLoadingThread(true);
    try {
      const msgs = await getGuestMessages(convId, token);
      setThreadMessages(msgs);
    } catch (e) {
      console.warn('Error loading guest thread:', e);
    } finally {
      setIsLoadingThread(false);
    }
  };

  if (!isOpen || !creator) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Honeypot bot protection
    if (honeypot.trim()) {
      // Silently ignore spam bot
      onClose();
      return;
    }

    // 2. Validate fields
    if (!sessionUser) {
      if (!name.trim() || name.trim().length < 2) {
        setErrorMessage('Please enter your full name (at least 2 characters).');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setErrorMessage('Please provide a valid email address so the creator can reply.');
        return;
      }
    }

    if (!messageText.trim() || messageText.trim().length < 10) {
      setErrorMessage('Please enter a message with at least 10 characters.');
      return;
    }

    if (messageText.trim().length > 1000) {
      setErrorMessage('Message length is limited to 1,000 characters.');
      return;
    }

    // 3. Rate limiting / cooldown check (30 seconds between new inquiries)
    const lastSentTime = localStorage.getItem('creatorflow_last_guest_message_time');
    if (lastSentTime && !sessionUser && !activeGuestConvId) {
      const diffSec = (Date.now() - Number(lastSentTime)) / 1000;
      if (diffSec < 20) {
        setErrorMessage('Please wait a few seconds before sending another inquiry.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (sessionUser) {
        // Authenticated user direct message
        const msg = await sendMessage({
          receiverId: creator.userId,
          message: messageText.trim(),
        });
        setSuccessNotice(`Your message has been sent to ${creator.displayName}.`);
        setMessageText('');
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        // Guest user message
        const res = await sendGuestMessage({
          creatorId: creator.creatorId,
          guestName: name.trim(),
          guestEmail: email.trim().toLowerCase(),
          guestPhone: phone.trim() || undefined,
          message: messageText.trim(),
          conversationId: activeGuestConvId || undefined,
          guestAccessToken: activeGuestToken || undefined,
        });

        localStorage.setItem('creatorflow_last_guest_message_time', String(Date.now()));
        setActiveGuestConvId(res.conversationId);
        setActiveGuestToken(res.guestAccessToken);

        // Append to local thread
        setThreadMessages((prev) => [...prev, res.message]);
        setMessageText('');
        setSuccessNotice(`Your message has been sent to ${creator.displayName}.`);

        // If it was the first inquiry, show confirmation briefly
        if (!activeGuestConvId) {
          setTimeout(() => {
            setSuccessNotice(null);
          }, 4000);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <SafeAvatar
              src={creator.profileImageUrl}
              name={creator.displayName}
              className="w-11 h-11 rounded-xl ring-1 ring-neutral-700"
              size={300}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Message {creator.displayName}
                </h3>
              </div>
              <p className="text-[11px] text-neutral-400">
                Ask about rates, creative style, or availability • <span className="text-amber-400 font-semibold">No account required</span>
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

        {/* Existing Thread Display if Guest has prior discussion */}
        {threadMessages.length > 0 && (
          <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 max-h-48 overflow-y-auto space-y-2.5">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold mb-1 flex items-center justify-between">
              <span>Your Conversation Thread</span>
              <span className="text-emerald-400">Inquiry Active</span>
            </div>
            {threadMessages.map((m) => {
              const isCreator = m.senderId === creator.userId;
              return (
                <div
                  key={m.messageId}
                  className={`flex ${isCreator ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-xs space-y-1 ${
                      isCreator
                        ? 'bg-neutral-800 text-neutral-200 rounded-bl-none border border-neutral-700/60'
                        : 'bg-rose-600 text-white rounded-br-none'
                    }`}
                  >
                    <p className="font-semibold text-[10px] opacity-80">
                      {isCreator ? creator.displayName : 'You (Guest)'}
                    </p>
                    <p className="leading-relaxed">{m.message}</p>
                    <span className="text-[9px] opacity-60 block text-right font-mono">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-medium">{successNotice}</span>
            </div>
          )}

          {/* Guest Contact Info Fields (hidden if already logged in) */}
          {!sessionUser && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Your Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tanvir@example.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Phone Number <span className="text-neutral-500 font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1700-000000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Honeypot field for bot protection (hidden from humans) */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website_hp"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{activeGuestConvId ? 'Your Reply' : 'Message *'}</span>
              <span className="text-[10px] text-neutral-500 font-normal">
                {messageText.length} / 1000
              </span>
            </label>
            <textarea
              required
              rows={4}
              maxLength={1000}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Hi ${creator.displayName}, I would love to know more about your availability for an upcoming project...`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 leading-relaxed resize-none"
            />
          </div>

          {/* Message vs Booking Distinction Banner */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-[11px] text-neutral-400">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Message vs. Project Request</span>
              </span>
              {onOpenBookingGate && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBookingGate();
                  }}
                  className="text-rose-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Ready to hire?</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Use this message form to ask questions with <strong className="text-neutral-200">no account required</strong>. When you are ready to book specific dates and lock deliverables, submit a formal project request (requires sign-in).
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !messageText.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Message</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
