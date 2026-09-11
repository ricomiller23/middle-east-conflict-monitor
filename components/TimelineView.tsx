'use client';

import React from 'react';
import { SecurityEvent } from '@/lib/types';
import { Clock, MapPin, ShieldCheck, AlertTriangle } from 'lucide-react';

interface TimelineViewProps {
  events: SecurityEvent[];
  onSelect: (event: SecurityEvent) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ events, onSelect }) => {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-[#0d1424] p-12 text-center">
        <Clock className="mx-auto h-8 w-8 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No Incidents in Timeline</h3>
        <p className="text-xs text-slate-500 mt-1">Adjust your filters or trigger a live ingestion sync.</p>
      </div>
    );
  }

  // Group events by date string
  const groupedByDate: Record<string, SecurityEvent[]> = {};
  for (const ev of events) {
    const d = new Date(ev.published_at);
    const dateKey = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(ev);
  }

  const getCountryFlag = (country: string) => {
    switch (country) {
      case 'Yemen': return '🇾🇪';
      case 'Saudi Arabia': return '🇸🇦';
      case 'Iran': return '🇮🇷';
      default: return '🌐';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'strike': return 'border-rose-500 bg-rose-500/20 text-rose-400';
      case 'military': return 'border-blue-500 bg-blue-500/20 text-blue-400';
      case 'diplomatic': return 'border-emerald-500 bg-emerald-500/20 text-emerald-400';
      case 'statement': return 'border-amber-500 bg-amber-500/20 text-amber-400';
      default: return 'border-slate-500 bg-slate-500/20 text-slate-300';
    }
  };

  return (
    <div className="space-y-8 py-2">
      {Object.entries(groupedByDate).map(([dateLabel, dayEvents]) => (
        <div key={dateLabel} className="relative">
          {/* Sticky Date Header */}
          <div className="sticky top-28 z-20 mb-4 inline-flex items-center space-x-2 rounded-full border border-slate-700 bg-[#0f172a] px-3.5 py-1 text-xs font-mono font-bold text-cyan-400 shadow-md">
            <Clock className="h-3.5 w-3.5" />
            <span>{dateLabel}</span>
            <span className="text-slate-500">({dayEvents.length} events)</span>
          </div>

          {/* Timeline Vertical Rail */}
          <div className="relative border-l-2 border-slate-800 ml-4 space-y-6 pl-6">
            {dayEvents.map((ev) => {
              const timeStr = new Date(ev.published_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

              return (
                <div key={ev.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#080c14] border-2 border-cyan-500 group-hover:scale-125 transition-transform" />

                  {/* Timeline Card */}
                  <div
                    onClick={() => onSelect(ev)}
                    className="rounded-lg border border-slate-800 bg-[#0d1424] p-4 hover:border-slate-700 hover:bg-[#111a2f] cursor-pointer transition shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 font-mono text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-cyan-400">{timeStr} UTC</span>
                        <span className="text-slate-600">•</span>
                        <span>{getCountryFlag(ev.country)} {ev.country}</span>
                        <span className={`rounded px-1.5 py-0.2 text-[10px] uppercase font-bold border ${getCategoryColor(ev.category)}`}>
                          {ev.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {ev.sources.length} report{ev.sources.length > 1 ? 's' : ''} merged
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-400 transition mb-1">
                      {ev.title}
                    </h4>

                    <p className="text-xs text-slate-300 line-clamp-2 mb-2 leading-relaxed">
                      {ev.summary}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-cyan-400" />
                        <span>{ev.location_name || 'Theater'}</span>
                      </div>
                      <span className="text-cyan-400 hover:underline">View Dossier →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
