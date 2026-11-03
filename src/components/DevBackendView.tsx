/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  HardDrive,
  Calendar,
  Check,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import {
  getAppsScriptUrl,
  setCustomAppsScriptUrl,
  pingBackend,
  runBackendSetup,
  isLiveBackendConfigured,
} from '../services/api';
import { APPS_SCRIPT_FILES } from '../services/appsScriptBundle';

interface DevBackendViewProps {
  onExit: () => void;
}

export const DevBackendView: React.FC<DevBackendViewProps> = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'code' | 'schema'>('status');
  const [apiUrl, setApiUrl] = useState(getAppsScriptUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{ online: boolean; message: string; details?: any } | null>(null);
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupOutput, setSetupOutput] = useState<string | null>(null);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setIsTesting(true);
    const res = await pingBackend();
    setPingResult(res);
    setIsTesting(false);
  };

  const handleSaveUrl = async () => {
    setCustomAppsScriptUrl(apiUrl);
    await checkHealth();
  };

  const handleRunSetup = async () => {
    setSetupRunning(true);
    try {
      const res = await runBackendSetup();
      setSetupOutput(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setSetupOutput(`Error: ${e.message}`);
    } finally {
      setSetupRunning(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-neutral-200 p-6 sm:p-10 font-mono text-xs">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Dev Header */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center gap-1.5 transition-colors font-sans text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to App
            </button>
            <div className="h-5 w-px bg-neutral-700" />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-white text-sm">INTERNAL DEV ROUTE: /dev/backend</span>
            </div>
          </div>
          <span className="text-[11px] text-neutral-500 uppercase tracking-wider">
            Hidden Developer Diagnostics
          </span>
        </div>

        {/* Status and Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 block uppercase text-[10px]">Database Engine</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 block">Google Sheets</span>
            <span className="text-neutral-400 text-[11px]">16 Relational Tables</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 block uppercase text-[10px]">API Serverless Router</span>
            <span className="text-sm font-bold text-sky-400 mt-1 block">Google Apps Script</span>
            <span className="text-neutral-400 text-[11px]">doGet / doPost Web App</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 block uppercase text-[10px]">Object File Store</span>
            <span className="text-sm font-bold text-amber-400 mt-1 block">Google Drive</span>
            <span className="text-neutral-400 text-[11px]">Creator &amp; Project Folders</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 block uppercase text-[10px]">Event Booking Sync</span>
            <span className="text-sm font-bold text-rose-400 mt-1 block">Google Calendar</span>
            <span className="text-neutral-400 text-[11px]">CalendarApp Automation</span>
          </div>
        </div>

        {/* Endpoint Config Card */}
        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <span className="font-bold text-white block uppercase text-[11px] tracking-wider">
            Apps Script Deployment Exec URL
          </span>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveUrl}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition-colors font-sans"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={checkHealth}
                disabled={isTesting}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold flex items-center gap-1.5 transition-colors font-sans"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} /> Ping Test
              </button>
            </div>
          </div>

          {pingResult && (
            <div className={`p-3 rounded-xl border ${pingResult.online ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}>
              <p className="font-bold">{pingResult.message}</p>
              {pingResult.details && (
                <pre className="mt-1 text-[11px] text-neutral-400 overflow-x-auto">
                  {JSON.stringify(pingResult.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Database Auto-Initializer */}
        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-white block uppercase text-[11px]">Database Schema Provisioner (setupDatabase)</span>
              <p className="text-neutral-400 text-[11px]">Provisions all 16 required sheets and column headers idempotently.</p>
            </div>
            <button
              onClick={handleRunSetup}
              disabled={setupRunning}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold font-sans flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${setupRunning ? 'animate-spin' : ''}`} />
              {setupRunning ? 'Running setup...' : 'Execute setupDatabase()'}
            </button>
          </div>
          {setupOutput && (
            <pre className="p-3 rounded-xl bg-black border border-neutral-800 text-emerald-400 text-[11px] overflow-x-auto">
              {setupOutput}
            </pre>
          )}
        </div>

        {/* Script Code Inspector */}
        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <span className="font-bold text-white uppercase text-[11px] block">Unified Single-File Backend (Code.gs)</span>
              <span className="text-[10px] text-neutral-400">All 40 backend modules merged into one standalone Code.gs file for Google Apps Script</span>
            </div>
            <button
              onClick={() => handleCopy(APPS_SCRIPT_FILES[selectedFileIdx]?.content || '')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs flex items-center gap-1.5 transition-colors font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied Full Code.gs ✓' : 'Copy Complete Code.gs'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {APPS_SCRIPT_FILES.map((f, idx) => (
                <button
                  key={f.name}
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    selectedFileIdx === idx
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <span>{f.name}</span>
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </button>
              ))}
            </div>

            <div className="md:col-span-3">
              <pre className="p-4 rounded-xl bg-black border border-neutral-800 text-neutral-300 text-[11px] max-h-80 overflow-y-auto whitespace-pre">
                {APPS_SCRIPT_FILES[selectedFileIdx].content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
