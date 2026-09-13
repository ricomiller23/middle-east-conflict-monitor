'use client';

import React from 'react';
import { SecurityEvent } from '@/lib/types';
import { ExternalLink, MapPin, ShieldCheck, AlertTriangle, Layers, Share2, Compass, Headphones } from 'lucide-react';

interface EventCardProps {
  event: SecurityEvent;
  onSelect: (event: SecurityEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  const isWarfronts = event.is_podcast_analysis || event.primary_source.includes('Warfronts');

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'tanker_attack':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/60 font-bold';
      case 'pipeline_infrastructure':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 font-bold';
      case 'energy_market':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/60 font-bold';
      case 'refinery_disruption':
        return 'bg-orange-950/80 text-orange-300 border-orange-500/60 font-bold';
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
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'recent';
      const diffMs = Date.now() - d.getTime();
      const diffHours = Math.floor(diffMs / 3600000);
      let rel = "";
      if (diffMs < 0) {
        rel = "just now";
      } else if (diffHours < 1) {
        const diffMins = Math.max(1, Math.floor(diffMs / 60000));
        rel = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        rel = `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        rel = `${diffDays}d ago`;
      }
      const dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const timeStr = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      });
      return `${rel} • ${dateStr} ${timeStr} UTC`;
    } catch {
      return 'recent';
    }
  };

  return (
    <div className={`group relative rounded-lg border ${isWarfronts ? 'border-purple-900/60 bg-[#0e1226]' : 'border-slate-800 bg-[#0d1424]'} p-3.5 sm:p-4 hover:border-slate-700 hover:bg-[#111a2f] transition-all shadow-sm active:scale-[0.995]`}>
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:space-x-2">
          {/* Country Pill */}
          <span className="flex items-center space-x-1 rounded bg-slate-800/90 px-2 py-0.5 text-xs font-semibold text-slate-200 border border-slate-700">
            <span>{getCountryFlag(event.country)}</span>
            <span>{event.country}</span>
          </span>

          {/* Warfronts Badge if applicable */}
          {isWarfronts && (
            <span className="flex items-center space-x-1 rounded bg-purple-950/90 px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold text-purple-300 border border-purple-500/60 shadow-sm">
              <Headphones className="h-3 w-3 text-purple-400" />
              <span>WARFRONTS</span>
            </span>
          )}

          {/* Podcast Duration Pill */}
          {event.podcast_duration && (
            <span className="rounded bg-indigo-950/70 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300 border border-indigo-500/40">
              ⏱️ {event.podcast_duration}
            </span>
          )}

          {/* Category Tag */}
          <span
            className={`rounded px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider border ${getCategoryColor(
              event.category
            )}`}
          >
            {event.category.replace('_', ' ')}
          </span>

          {/* Credibility Tier Badge */}
          {event.credibility_tier === 'tier_1' ? (
            <span className="flex items-center space-x-1 rounded bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-3 w-3" />
              <span>TIER 1</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 rounded bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-400 border border-amber-500/30">
              <AlertTriangle className="h-3 w-3" />
              <span>TIER 2</span>
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="font-mono text-[11px] sm:text-xs text-slate-400">
          {formatTimeAgo(event.published_at)}
        </span>
      </div>

      {/* Oil & Energy Impact Pill Bar */}
      {(event.vessel_name || event.barrel_risk_estimate || (event.oil_market_impact && event.oil_market_impact !== 'neutral')) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2 font-mono text-[10px]">
          {event.vessel_name && (
            <span className="rounded bg-rose-950/70 text-rose-300 px-2 py-0.5 border border-rose-500/40 font-semibold flex items-center space-x-1">
              <span>🚢 Vessel:</span>
              <span className="text-white">{event.vessel_name}</span>
            </span>
          )}
          {event.oil_market_impact && event.oil_market_impact === 'critical' && (
            <span className="rounded bg-red-950/90 text-red-400 px-2 py-0.5 border border-red-500/50 font-bold uppercase">
              ⚡ CRITICAL IMPACT
            </span>
          )}
          {event.oil_market_impact && event.oil_market_impact === 'high' && (
            <span className="rounded bg-amber-950/80 text-amber-400 px-2 py-0.5 border border-amber-500/40 font-bold uppercase">
              ⚠️ HIGH RISK
            </span>
          )}
          {event.barrel_risk_estimate && (
            <span className="rounded bg-slate-800 text-amber-300 px-2 py-0.5 border border-slate-700">
              🛢️ {event.barrel_risk_estimate}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <h2
        onClick={() => onSelect(event)}
        className="text-sm sm:text-base font-semibold text-slate-100 hover:text-cyan-400 cursor-pointer transition line-clamp-2 leading-snug mb-1.5"
      >
        {event.title}
      </h2>

      {/* Summary / Military Synopsis Excerpt */}
      {isWarfronts && event.synopsis ? (
        <div className="rounded-md border border-purple-900/50 bg-purple-950/25 p-2.5 mb-2.5">
          <div className="flex items-center space-x-1 text-[10px] font-mono uppercase text-purple-400 font-bold mb-1">
            <Headphones className="h-3 w-3 text-purple-400" />
            <span>Simon Whistler Synopsis & Intelligence</span>
          </div>
          <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
            {event.synopsis}
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2.5">
          {event.summary}
        </p>
      )}

      {/* Geolocation Tag */}
      {event.location_name && (
        <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 mb-2.5">
          <MapPin className="h-3 w-3 text-cyan-400 flex-shrink-0" />
          <span className="truncate">{event.location_name}</span>
          {event.lat && event.lng && (
            <span className="text-slate-500 text-[10px] hidden sm:inline">
              ({event.lat.toFixed(2)}, {event.lng.toFixed(2)})
            </span>
          )}
        </div>
      )}

      {/* Bottom Bar: Collapsed Multi-Source Reporting & Citations */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 mt-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-mono text-[10px] uppercase text-slate-400">Sources:</span>
          {event.sources.slice(0, 2).map((s, idx) => (
            <a
              key={idx}
              href={s.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-h-[28px] items-center space-x-1 rounded bg-slate-800/80 px-2 py-1 text-[11px] text-cyan-400 hover:bg-slate-700 border border-slate-700/60 transition active:scale-95"
            >
              <span>{s.source_name}</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-70 ml-0.5" />
            </a>
          ))}

          {event.sources.length > 2 && (
            <button
              onClick={() => onSelect(event)}
              className="inline-flex min-h-[28px] items-center space-x-1 rounded bg-slate-800/50 px-2 py-1 text-[10px] font-mono text-slate-400 hover:text-slate-200 active:scale-95"
            >
              <Layers className="h-2.5 w-2.5" />
              <span>+{event.sources.length - 2} merged</span>
            </button>
          )}

          {/* X / Twitter Citations */}
          {event.x_citations && event.x_citations.length > 0 && (
            <div className="flex items-center space-x-1">
              {event.x_citations.slice(0, 1).map((xUrl, i) => (
                <a
                  key={i}
                  href={xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex min-h-[28px] items-center space-x-1 rounded bg-[#1d283a] px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-white border border-slate-700 active:scale-95"
                  title="Verified OSINT Citation on X"
                >
                  <span className="font-bold text-[10px]">𝕏</span>
                  <span>Citation</span>
                  <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {event.audio_url && (
            <a
              href={event.audio_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex min-h-[32px] items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-purple-300 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/50 transition active:scale-95 shadow-sm"
              title="Stream Full Warfronts Audio Episode"
            >
              <Headphones className="h-3.5 w-3.5 text-purple-400" />
              <span>Listen</span>
            </a>
          )}

          {/* Inspect Dossier Action */}
          <button
            onClick={() => onSelect(event)}
            className="flex min-h-[32px] items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-medium text-cyan-400 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/30 transition active:scale-95"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
};
