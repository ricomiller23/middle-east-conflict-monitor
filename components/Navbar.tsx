'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Radio, RefreshCw, Settings, ExternalLink, Activity } from 'lucide-react';

interface NavbarProps {
  totalEvents: number;
  countryCounts: { saudi: number; yemen: number; iran: number };
  lastSyncAt: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalEvents,
  countryCounts,
  lastSyncAt,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0a0f1d]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 sm:py-2.5">
        {/* Brand & Terminal Badge */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-inner flex-shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-slate-100">
                ME-CONFLICT<span className="hidden xs:inline">.OSINT</span>
              </span>
              <span className="flex items-center space-x-1 rounded bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>6H CRON</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
              Saudi Arabia • Yemen • Iran Military & Security Radar
            </p>
          </div>
        </div>

        {/* Live Theater Counters (Desktop / Tablet) */}
        <div className="hidden md:flex items-center space-x-2 font-mono text-xs">
          <div className="flex items-center space-x-1.5 rounded border border-slate-800 bg-[#0d1527] px-2.5 py-1">
            <span className="text-slate-400">🇾🇪 Yemen:</span>
            <span className="font-semibold text-amber-400">{countryCounts.yemen}</span>
          </div>
          <div className="flex items-center space-x-1.5 rounded border border-slate-800 bg-[#0d1527] px-2.5 py-1">
            <span className="text-slate-400">🇸🇦 Saudi:</span>
            <span className="font-semibold text-emerald-400">{countryCounts.saudi}</span>
          </div>
          <div className="flex items-center space-x-1.5 rounded border border-slate-800 bg-[#0d1527] px-2.5 py-1">
            <span className="text-slate-400">🇮🇷 Iran:</span>
            <span className="font-semibold text-rose-400">{countryCounts.iran}</span>
          </div>
        </div>

        {/* Action Controls with Touch Targets */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh events"
            className="flex min-h-[40px] items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 transition disabled:opacity-50"
            title="Fetch latest incident reports"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="text-xs font-mono">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <Link
            href="/admin"
            aria-label="Open Admin Ops Console"
            className="flex min-h-[40px] items-center space-x-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:border-slate-600 active:scale-95 transition"
          >
            <Settings className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden xs:inline sm:inline">Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
