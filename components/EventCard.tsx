'use client';

import React from 'react';
import { SecurityEvent } from '@/lib/types';
import { ExternalLink, MapPin, ShieldCheck, AlertTriangle, Layers, Share2, Compass } from 'lucide-react';

interface EventCardProps {
  event: SecurityEvent;
  onSelect: (event: SecurityEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'strike':
        return 'bg-rose-950/60 text-rose-400 border-rose-500/40';
      case 'military':
        return 'bg-blue-950/60 text-blue-400 border-blue-500/40';
      case 'diplomatic':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40';
      case 'statement':
        return 'bg-amber-950/60 text-amber-400 border-amber-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getCountryFlag = (country: string) => {
    switch (country) {
      case 'Yemen':
        return '🇾🇪';
      case 'Saudi Arabia':
        return '🇸🇦';
      case 'Iran':
        return '🇮🇷';
      default:
        return '🌐';
    }
  };

  const formatTimeAgo = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffHours = Math.floor(diffMs / 3600000);
      if (diffHours < 1) {
        const diffMins = Math.max(1, Math.floor(diffMs / 60000));
        return `${diffMins}m ago`;
      }
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'recent';
    }
  };

  return (
    <div className="group relative rounded-lg border border-slate-800 bg-[#0d1424] p-4 hover:border-slate-700 hover:bg-[#111a2f] transition-all shadow-sm">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center space-x-2">
          {/* Country Pill */}
          <span className="flex items-center space-x-1 rounded bg-slate-800/90 px-2 py-0.5 text-xs font-semibold text-slate-200 border border-slate-700">
            <span>{getCountryFlag(event.country)}</span>
            <span>{event.country}</span>
          </span>

          {/* Category Tag */}
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider border ${getCategoryColor(
              event.category
            )}`}
          >
            {event.category}
          </span>

          {/* Credibility Tier Badge */}
          {event.credibility_tier === 'tier_1' ? (
            <span className="flex items-center space-x-1 rounded bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-3 w-3" />
              <span>TIER 1 VERIFIED</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 rounded bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-400 border border-amber-500/30">
              <AlertTriangle className="h-3 w-3" />
              <span>TIER 2 ANALYST</span>
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="font-mono text-xs text-slate-400">
          {formatTimeAgo(event.published_at)}
        </span>
      </div>

      {/* Title */}
      <h2
        onClick={() => onSelect(event)}
        className="text-base font-semibold text-slate-100 hover:text-cyan-400 cursor-pointer transition line-clamp-2 leading-snug mb-1.5"
      >
        {event.title}
      </h2>

      {/* Summary Excerpt */}
      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
        {event.summary}
      </p>

      {/* Geolocation Tag */}
      {event.location_name && (
        <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 mb-3">
          <MapPin className="h-3 w-3 text-cyan-400 flex-shrink-0" />
          <span className="truncate">{event.location_name}</span>
          {event.lat && event.lng && (
            <span className="text-slate-500 text-[10px]">
              ({event.lat.toFixed(2)}, {event.lng.toFixed(2)})
            </span>
          )}
        </div>
      )}

      {/* Bottom Bar: Collapsed Multi-Source Reporting & Citations */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 mt-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-mono text-[10px] uppercase text-slate-400">Sources:</span>
          {event.sources.slice(0, 2).map((s, idx) => (
            <a
              key={idx}
              href={s.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center space-x-1 rounded bg-slate-800/80 px-2 py-0.5 text-[11px] text-cyan-400 hover:bg-slate-700 border border-slate-700/60 transition"
            >
              <span>{s.source_name}</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-70" />
            </a>
          ))}

          {event.sources.length > 2 && (
            <button
              onClick={() => onSelect(event)}
              className="flex items-center space-x-1 rounded bg-slate-800/50 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:text-slate-200"
            >
              <Layers className="h-2.5 w-2.5" />
              <span>+{event.sources.length - 2} merged</span>
            </button>
          )}

          {/* X / Twitter Citations */}
          {event.x_citations && event.x_citations.length > 0 && (
            <div className="flex items-center space-x-1 ml-1">
              {event.x_citations.slice(0, 1).map((xUrl, i) => (
                <a
                  key={i}
                  href={xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center space-x-1 rounded bg-[#1d283a] px-2 py-0.5 text-[11px] font-mono text-slate-300 hover:text-white border border-slate-700"
                  title="Verified OSINT Citation on X"
                >
                  <span className="font-bold text-[10px]">𝕏</span>
                  <span>Citation</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Inspect Dossier Action */}
        <button
          onClick={() => onSelect(event)}
          className="flex items-center space-x-1 rounded px-2 py-1 text-[11px] font-medium text-cyan-400 hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30 transition"
        >
          <Compass className="h-3 w-3" />
          <span>Dossier</span>
        </button>
      </div>
    </div>
  );
};
