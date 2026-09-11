'use client';

import React, { useState } from 'react';
import { SecurityEvent } from '@/lib/types';
import { MapPin, Shield, Crosshair, ZoomIn, ZoomOut, Compass, ExternalLink } from 'lucide-react';

interface TacticalMapViewProps {
  events: SecurityEvent[];
  onSelect: (event: SecurityEvent) => void;
}

export const TacticalMapView: React.FC<TacticalMapViewProps> = ({ events, onSelect }) => {
  const [selectedPin, setSelectedPin] = useState<SecurityEvent | null>(null);
  const [activeTheater, setActiveTheater] = useState<'all' | 'yemen' | 'saudi' | 'iran'>('all');

  // Geographic bounds of the region:
  // Lat: 10°N to 40°N
  // Lng: 34°E to 64°E
  const MIN_LAT = 10;
  const MAX_LAT = 40;
  const MIN_LNG = 34;
  const MAX_LNG = 64;

  const projectToMap = (lat: number | null, lng: number | null) => {
    if (!lat || !lng) return { x: 50, y: 50 };
    // Invert lat for SVG Y (high lat = lower Y)
    const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 100;
    const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * 100;
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  };

  const getPinColor = (category: string) => {
    switch (category) {
      case 'strike': return '#f43f5e'; // rose-500
      case 'military': return '#38bdf8'; // sky-400
      case 'diplomatic': return '#10b981'; // emerald-500
      case 'statement': return '#f59e0b'; // amber-500
      default: return '#94a3b8';
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (activeTheater === 'all') return true;
    if (activeTheater === 'yemen') return ev.country === 'Yemen';
    if (activeTheater === 'saudi') return ev.country === 'Saudi Arabia';
    if (activeTheater === 'iran') return ev.country === 'Iran';
    return true;
  });

  return (
    <div className="relative rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden shadow-2xl">
      {/* Top Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 bg-[#0c1322]/90 px-4 py-2.5 backdrop-blur z-10 relative">
        <div className="flex items-center space-x-2">
          <Crosshair className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-slate-200">
            TACTICAL THEATER MAP (SAUDI ARABIA • YEMEN • IRAN)
          </span>
          <span className="rounded bg-cyan-950/60 px-2 py-0.5 font-mono text-[10px] text-cyan-400 border border-cyan-500/30">
            {filteredEvents.length} GEOTAGGED PINS
          </span>
        </div>

        {/* Quick Theater Selectors */}
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <button
            onClick={() => setActiveTheater('all')}
            className={`rounded px-2.5 py-1 transition ${
              activeTheater === 'all'
                ? 'bg-cyan-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Theaters
          </button>
          <button
            onClick={() => setActiveTheater('yemen')}
            className={`rounded px-2.5 py-1 transition ${
              activeTheater === 'yemen'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🇾🇪 Yemen & Red Sea
          </button>
          <button
            onClick={() => setActiveTheater('saudi')}
            className={`rounded px-2.5 py-1 transition ${
              activeTheater === 'saudi'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🇸🇦 Saudi Arabia
          </button>
          <button
            onClick={() => setActiveTheater('iran')}
            className={`rounded px-2.5 py-1 transition ${
              activeTheater === 'iran'
                ? 'bg-rose-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🇮🇷 Iran & Hormuz
          </button>
        </div>
      </div>

      {/* SVG Tactical Map Surface */}
      <div className="relative w-full h-[520px] bg-[#070b14] select-none">
        <svg
          viewBox="0 0 1000 650"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Subtle Grid Lines */}
          <defs>
            <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
            </pattern>
            <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="1000" height="650" fill="url(#tactical-grid)" />

          {/* Regional Landmass Geometry (Representative Theater Silhouette) */}
          {/* Iran Region */}
          <path
            d="M 460,80 L 820,70 L 920,240 L 760,340 L 680,310 L 610,260 L 520,220 Z"
            fill="#10192e"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <text x="660" y="180" fill="#475569" fontSize="18" fontFamily="monospace" fontWeight="bold" letterSpacing="4">
            IRAN
          </text>

          {/* Saudi Arabia Region */}
          <path
            d="M 220,180 L 460,190 L 580,260 L 610,320 L 540,460 L 360,490 L 260,410 L 210,290 Z"
            fill="#0f192b"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <text x="350" y="330" fill="#475569" fontSize="22" fontFamily="monospace" fontWeight="bold" letterSpacing="6">
            SAUDI ARABIA
          </text>

          {/* Yemen Region */}
          <path
            d="M 270,470 L 540,460 L 590,520 L 480,590 L 330,580 L 270,520 Z"
            fill="#131e33"
            stroke="#334155"
            strokeWidth="1.8"
          />
          <text x="390" y="530" fill="#64748b" fontSize="16" fontFamily="monospace" fontWeight="bold" letterSpacing="4">
            YEMEN
          </text>

          {/* Waterways: Red Sea & Persian Gulf Labels */}
          <path d="M 230,280 L 290,490" stroke="#0284c7" strokeWidth="1" strokeDasharray="4,4" fill="none" opacity="0.4" />
          <text x="180" y="380" fill="#0284c7" fontSize="12" fontFamily="monospace" opacity="0.7">
            [ RED SEA CORRIDOR ]
          </text>

          <text x="610" y="290" fill="#0284c7" fontSize="11" fontFamily="monospace" opacity="0.7">
            [ STRAIT OF HORMUZ ]
          </text>

          <text x="330" y="615" fill="#0284c7" fontSize="11" fontFamily="monospace" opacity="0.6">
            [ GULF OF ADEN / BAB AL-MANDAB ]
          </text>

          {/* Key Strategic Anchors */}
          <circle cx="430" cy="330" r="3" fill="#38bdf8" opacity="0.6" />
          <text x="438" y="334" fill="#94a3b8" fontSize="10" fontFamily="monospace">Riyadh</text>

          <circle cx="340" cy="525" r="3" fill="#38bdf8" opacity="0.6" />
          <text x="348" y="529" fill="#94a3b8" fontSize="10" fontFamily="monospace">Sana'a</text>

          <circle cx="640" cy="165" r="3" fill="#38bdf8" opacity="0.6" />
          <text x="648" y="169" fill="#94a3b8" fontSize="10" fontFamily="monospace">Tehran</text>

          <circle cx="690" cy="310" r="3" fill="#f59e0b" opacity="0.8" />
          <text x="698" y="314" fill="#f59e0b" fontSize="10" fontFamily="monospace">Bandar Abbas</text>

          <circle cx="310" cy="510" r="3" fill="#f43f5e" opacity="0.8" />
          <text x="250" y="514" fill="#f43f5e" fontSize="10" fontFamily="monospace">Hodeidah</text>
        </svg>

        {/* Dynamic Incident Pins */}
        {filteredEvents.map((ev) => {
          const pos = projectToMap(ev.lat, ev.lng);
          const color = getPinColor(ev.category);
          const isSelected = selectedPin?.id === ev.id;

          return (
            <div
              key={ev.id}
              onClick={() => {
                setSelectedPin(ev);
                onSelect(ev);
              }}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
            >
              {/* Pulsing ring */}
              <div
                style={{ borderColor: color }}
                className="absolute -inset-2 rounded-full border animate-ping opacity-60 pointer-events-none"
              />

              {/* Pin Head */}
              <div
                style={{ backgroundColor: color }}
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#080c14] shadow-lg transition-transform group-hover:scale-125 ${
                  isSelected ? 'ring-4 ring-cyan-400 scale-125' : ''
                }`}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-950/95 px-2.5 py-1.5 text-[11px] text-slate-100 opacity-0 border border-slate-700 shadow-xl transition-opacity group-hover:opacity-100 z-30 font-mono">
                <div className="font-bold text-cyan-400">{ev.country} • {ev.category.toUpperCase()}</div>
                <div className="truncate max-w-[200px] text-slate-300 font-sans">{ev.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 bg-[#0b1220] px-4 py-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>Strikes / Missiles</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            <span>Military / Naval Drills</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Diplomatic / Talks</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Statements</span>
          </div>
        </div>

        <span className="text-slate-500 hidden sm:inline">
          Click any pin to inspect verified incident dossier
        </span>
      </div>
    </div>
  );
};
