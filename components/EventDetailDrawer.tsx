'use client';

import React from 'react';
import { SecurityEvent } from '@/lib/types';
import { X, ExternalLink, MapPin, ShieldCheck, Clock, Share2, Copy, Check, Layers, AlertTriangle } from 'lucide-react';

interface EventDetailDrawerProps {
  event: SecurityEvent | null;
  onClose: () => void;
}

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({ event, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!event) return null;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-800 bg-[#0c1322] shadow-2xl overflow-y-auto">
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/90 bg-[#0f172a]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center space-x-2">
            <span className="rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-400 border border-cyan-500/40">
              INCIDENT DOSSIER
            </span>
            <span className="font-mono text-xs text-slate-400">{event.id}</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-6">
          {/* Status & Categorization Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 border border-slate-700">
              {event.country}
            </span>
            <span className="rounded bg-blue-950/70 px-2.5 py-1 font-mono text-xs font-bold text-blue-300 border border-blue-500/40 uppercase">
              {event.category}
            </span>
            {event.credibility_tier === 'tier_1' ? (
              <span className="flex items-center space-x-1 rounded bg-emerald-950/60 px-2 py-1 font-mono text-xs font-semibold text-emerald-400 border border-emerald-500/40">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>TIER 1 VERIFIED</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 rounded bg-amber-950/60 px-2 py-1 font-mono text-xs font-semibold text-amber-400 border border-amber-500/40">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>TIER 2 ANALYST</span>
              </span>
            )}
          </div>

          {/* Incident Title */}
          <h2 className="text-xl font-bold text-slate-100 leading-snug">
            {event.title}
          </h2>

          {/* Time & Location Metadata */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-[#080d1a] p-3.5 font-mono text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Published Time</span>
              <div className="flex items-center space-x-1 text-slate-300">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>{new Date(event.published_at).toUTCString()}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Geotag Anchor</span>
              <div className="flex items-center space-x-1 text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                <span>{event.location_name || 'Theater Wide'}</span>
              </div>
              {event.lat && event.lng && (
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Lat: {event.lat}, Lng: {event.lng}
                </span>
              )}
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">
              Intelligence Briefing & Excerpt
            </h3>
            <div className="rounded-lg border border-slate-800/80 bg-[#090e1c] p-4 text-sm text-slate-200 leading-relaxed">
              {event.summary}
            </div>
          </div>

          {/* Multi-Source Merged Coverage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Aggregated Reporting Outlets ({event.sources.length})
              </h3>
              <span className="text-[11px] font-mono text-cyan-400">Deduplicated</span>
            </div>

            <div className="space-y-2.5">
              {event.sources.map((src, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-800/80 bg-[#090e1c] p-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-200">{src.source_name}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                      {src.credibility_tier.toUpperCase()}
                    </span>
                  </div>
                  {src.snippet && (
                    <p className="text-xs text-slate-400 italic mb-2 line-clamp-2">
                      "{src.snippet}"
                    </p>
                  )}
                  <a
                    href={src.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-cyan-400 hover:underline"
                  >
                    <span>Read Original Article</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Verified X Citations */}
          {event.x_citations && event.x_citations.length > 0 && (
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">
                External X / Twitter Citations
              </h3>
              <div className="space-y-2">
                {event.x_citations.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded border border-slate-800 bg-[#090e1c] px-3 py-2 text-xs"
                  >
                    <span className="font-mono text-slate-300 truncate max-w-sm">{url}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 flex-shrink-0 flex items-center space-x-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-cyan-400 hover:bg-slate-700"
                    >
                      <span>View Tweet</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyst Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
            <button
              onClick={copyJson}
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'JSON Copied!' : 'Copy Event JSON'}</span>
            </button>

            <a
              href={event.primary_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500 transition"
            >
              <span>Open Primary Coverage</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
