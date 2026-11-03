/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  HardDrive,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  FileCode,
  ShieldAlert,
  Sparkles,
  Server,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  getAppsScriptUrl,
  setCustomAppsScriptUrl,
  isLiveBackendConfigured,
  pingBackend,
  runBackendSetup,
} from '../services/api';
import { APPS_SCRIPT_FILES } from '../services/appsScriptBundle';

interface AppsScriptSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppsScriptSetupModal: React.FC<AppsScriptSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'guide' | 'code' | 'schema'>('status');
  const [inputUrl, setInputUrl] = useState(getAppsScriptUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ online: boolean; message: string; details?: any } | null>(null);
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupOutput, setSetupOutput] = useState<string | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedFile, setCopiedFile] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputUrl(getAppsScriptUrl());
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    setIsTesting(true);
    const res = await pingBackend();
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSaveUrl = async () => {
    setCustomAppsScriptUrl(inputUrl);
    await checkStatus();
  };

  const handleRunSetup = async () => {
    setSetupRunning(true);
    setSetupOutput(null);
    try {
      const res = await runBackendSetup();
      setSetupOutput(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setSetupOutput(`Error running setup: ${err.message || 'Unknown'}`);
    } finally {
      setSetupRunning(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                Google Backend Architecture
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sheets • Drive • Calendar • Apps Script
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Permanent serverless Google Workspace cloud stack for CreatorFlow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/30 px-5 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'status'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Server className="w-4 h-4" />
            Live Status & URL
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            5-Minute Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Apps Script Code (.gs)
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'schema'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Sheet Database Schemas (16)
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Architecture Card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <Database className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Database</span>
                  </div>
                  <p className="text-sm font-semibold text-white">Google Sheets</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">16 auto-provisioned relational tables</p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-sky-400 mb-1">
                    <Server className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">API Engine</span>
                  </div>
                  <p className="text-sm font-semibold text-white">Apps Script Web App</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">doGet / doPost with LockService</p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">File Storage</span>
                  </div>
                  <p className="text-sm font-semibold text-white">Google Drive</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Creator & Project hierarchies</p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 text-rose-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Bookings</span>
                  </div>
                  <p className="text-sm font-semibold text-white">Google Calendar</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Live bidirectional sync</p>
                </div>
              </div>

              {/* Endpoint Configuration */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                    Google Apps Script Web App Exec URL
                  </label>
                  <p className="text-xs text-neutral-400 mb-2">
                    Paste your deployed Apps Script Web App URL (<code className="text-amber-400">https://script.google.com/macros/s/.../exec</code>)
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveUrl}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save & Connect
                      </button>
                      <button
                        onClick={checkStatus}
                        disabled={isTesting}
                        className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                        Ping
                      </button>
                    </div>
                  </div>
                </div>

                {/* Connection Health Result */}
                {testResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                      testResult.online
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                        testResult.online ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <div>
                      <p className="font-semibold">{testResult.message}</p>
                      {testResult.details && (
                        <pre className="mt-1 text-[11px] font-mono text-neutral-400 overflow-x-auto">
                          {JSON.stringify(testResult.details, null, 2)}
                        </pre>
                      )}
                      {!testResult.online && (
                        <p className="text-[11px] text-neutral-400 mt-1">
                          Don't worry! The app is 100% functional right now in demo mode with full simulation of Sheets, Drive folders, and Calendar bookings.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* setupDatabase() Runner */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Database Auto-Initializer (setupDatabase)</h3>
                    <p className="text-xs text-neutral-400">
                      Creates all 16 required sheets and headers without overwriting existing data.
                    </p>
                  </div>
                  <button
                    onClick={handleRunSetup}
                    disabled={setupRunning}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${setupRunning ? 'animate-spin' : ''}`} />
                    {setupRunning ? 'Initializing...' : 'Run setupDatabase()'}
                  </button>
                </div>

                {setupOutput && (
                  <pre className="p-3 rounded-lg bg-black text-[11px] font-mono text-emerald-400 overflow-x-auto border border-neutral-800">
                    {setupOutput}
                  </pre>
                )}
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-neutral-300">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">1</span>
                  Create a Google Sheet
                </h3>
                <p className="text-neutral-400">
                  Go to <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a> and create a blank sheet named <strong>CreatorFlow Database</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">2</span>
                  Open Google Apps Script
                </h3>
                <p className="text-neutral-400">
                  In your Google Sheet menu bar, click <strong>Extensions &gt; Apps Script</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">3</span>
                  Paste Backend Files
                </h3>
                <p className="text-neutral-400">
                  Click the <strong>"Apps Script Code (.gs)"</strong> tab above, copy the files (or Code.gs / Config.gs / Router.gs), and paste them into your Apps Script editor.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">4</span>
                  Run setupDatabase()
                </h3>
                <p className="text-neutral-400">
                  In Apps Script, select <strong>setupDatabase</strong> from the function dropdown at the top and click <strong>Run</strong>. Review permissions when Google requests them. All 16 sheets and Drive folders will be automatically generated!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">5</span>
                  Deploy as Web App
                </h3>
                <p className="text-neutral-400">
                  Click <strong>Deploy &gt; New deployment</strong>. Select type <strong>Web app</strong>. Set:
                </p>
                <ul className="list-disc list-inside space-y-1 text-neutral-400 pl-2">
                  <li><strong>Execute as:</strong> Me (your email)</li>
                  <li><strong>Who has access:</strong> Anyone</li>
                </ul>
                <p className="text-neutral-400 mt-2">
                  Click <strong>Deploy</strong>, copy the resulting Web app URL, and paste it into the <strong>Live Status &amp; URL</strong> tab.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:border-r border-neutral-800 md:pr-3">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Select Script File
                </p>
                {APPS_SCRIPT_FILES.map((file, idx) => (
                  <button
                    key={file.name}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                      selectedFileIndex === idx
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                    }`}
                  >
                    <span>{file.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono">
                      {APPS_SCRIPT_FILES[selectedFileIndex].name}
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      {APPS_SCRIPT_FILES[selectedFileIndex].description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyCode(APPS_SCRIPT_FILES[selectedFileIndex].content)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFile ? 'Copied!' : 'Copy File'}
                  </button>
                </div>
                <div className="relative">
                  <pre className="p-4 rounded-xl bg-black text-[11px] font-mono text-neutral-300 max-h-96 overflow-y-auto border border-neutral-800 whitespace-pre">
                    {APPS_SCRIPT_FILES[selectedFileIndex].content}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">
                CreatorFlow uses 16 dedicated relational sheets as the permanent database.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: 'Users', cols: 'userId, fullName, email, phone, passwordHash, accountType, status, profileImage, createdAt, updatedAt, lastLoginAt' },
                  { name: 'Creators', cols: 'creatorId, userId, displayName, username, roles, bio, profileImageUrl, coverImageUrl, city, district, country, serviceAreas, skills, equipment, startingPrice, rating, reviewCount, driveRootFolderId' },
                  { name: 'Portfolios', cols: 'portfolioId, creatorId, title, description, category, fileId, fileUrl, thumbnailUrl, mimeType, tags, featured, status, sortOrder' },
                  { name: 'Services', cols: 'serviceId, creatorId, title, description, category, startingPrice, deliveryTime, location, status' },
                  { name: 'Packages', cols: 'packageId, creatorId, serviceId, name, description, price, duration, teamSize, photoCount, editedPhotoCount, videoDuration, deliveryTime, revisions' },
                  { name: 'Availability', cols: 'availabilityId, creatorId, date, startTime, endTime, status, bookingId, notes' },
                  { name: 'Bookings', cols: 'bookingId, customerId, creatorId, serviceId, packageId, projectTitle, projectType, eventDate, startTime, endTime, location, budget, status, paymentStatus, calendarEventId, driveProjectFolderId' },
                  { name: 'Projects', cols: 'projectId, bookingId, customerId, creatorId, title, status, driveFolderId, startDate, deliveryDate, notes' },
                  { name: 'Messages', cols: 'messageId, conversationId, senderId, receiverId, bookingId, projectId, message, attachmentFileId, attachmentUrl, isRead' },
                  { name: 'Reviews', cols: 'reviewId, bookingId, customerId, creatorId, overallRating, communicationRating, qualityRating, professionalismRating, deliveryRating, valueRating, reviewText' },
                  { name: 'Payments', cols: 'paymentId, bookingId, customerId, creatorId, amount, currency, method, status, transactionId' },
                  { name: 'Drive_Folders', cols: 'creatorId, rootFolderId, profileFolderId, portfolioFolderId, clientProjectsFolderId, deliverablesFolderId' },
                  { name: 'Notifications', cols: 'notificationId, userId, title, message, type, isRead, linkUrl' },
                  { name: 'Sessions', cols: 'sessionId, userId, tokenHash, expiresAt, createdAt, lastUsedAt' },
                  { name: 'Settings', cols: 'settingKey, settingValue, description, updatedAt' },
                  { name: 'Admin_Users', cols: 'adminId, userId, role, permissions, createdAt' },
                ].map((s) => (
                  <div key={s.name} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-emerald-400 font-mono">{s.name}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">{s.cols}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Zero Node.js • Zero Firebase • 100% Google Cloud Apps Script</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
