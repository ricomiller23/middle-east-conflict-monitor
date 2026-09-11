'use client';

import React, { useState } from 'react';
import { SecurityEvent } from '@/lib/types';
import { MapPin, Shield, Crosshair, ZoomIn, ZoomOut, Compass, ExternalLink, Fuel, Anchor, Flame } from 'lucide-react';

interface TacticalMapViewProps {
  events: SecurityEvent[];
  onSelect: (event: SecurityEvent) => void;
}

export const TacticalMapView: React.FC<TacticalMapViewProps> = ({ events, onSelect }) => {
  const [selectedPin, setSelectedPin] = useState<SecurityEvent | null>(null);
  const [activeTheater, setActiveTheater] = useState<'all' | 'yemen' | 'saudi' | 'iran' | 'energy'>('all');

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
      case 'tanker_attack': return '#e11d48'; // crimson rose
      case 'refinery_disruption': return '#f97316'; // orange flame
      case 'pipeline_infrastructure': return '#10b981'; // emerald pipeline
      case 'energy_market': return '#f59e0b'; // amber oil
      case 'strike': return '#ef4444'; // red
      case 'military': return '#38bdf8'; // sky-400
      case 'diplomatic': return '#34d399'; // green
      case 'statement': return '#fbbf24'; // yellow
      default: return '#94a3b8';
    }
  };

  const getPinIcon = (category: string) => {
    switch (category) {
      case 'tanker_attack': return '🚢';
      case 'pipeline_infrastructure': return '⚡';
      case 'refinery_disruption': return '⛽';
      case 'energy_market': return '🛢️';
      case 'strike': return '🎯';
      default: return null;
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (activeTheater === 'all') return true;
    if (activeTheater === 'yemen') return ev.country === 'Yemen';
    if (activeTheater === 'saudi') return ev.country === 'Saudi Arabia';
    if (activeTheater === 'iran') return ev.country === 'Iran';
    if (activeTheater === 'energy') {
      return (
        ev.category === 'tanker_attack' ||
        ev.category === 'pipeline_infrastructure' ||
        ev.category === 'refinery_disruption' ||
        ev.category === 'energy_market'
      );
    }
    return true;
  });

  return (
    <div className="relative rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden shadow-2xl">
      {/* Top Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 bg-[#0c1322]/90 px-4 py-2.5 backdrop-blur z-10 relative">
        <div className="flex items-center space-x-2">
          <Crosshair className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-slate-200">
            TACTICAL THEATER & ENERGY INFRASTRUCTURE RADAR
          </span>
          <span className="rounded bg-cyan-950/60 px-2 py-0.5 font-mono text-[10px] text-cyan-400 border border-cyan-500/30">
            {filteredEvents.length} INCIDENT PINS
          </span>
        </div>

        {/* Quick Theater Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setActiveTheater('all')}
            className={`rounded px-2 py-1 transition ${
              activeTheater === 'all'
                ? 'bg-cyan-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Theaters
          </button>
          <button
            onClick={() => setActiveTheater('energy')}
            className={`rounded px-2 py-1 transition ${
              activeTheater === 'energy'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
            }`}
          >
            🛢️ Energy & Tankers Only
          </button>
          <button
            onClick={() => setActiveTheater('yemen')}
            className={`rounded px-2 py-1 transition ${
              activeTheater === 'yemen'
                ? 'bg-amber-700 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🇾🇪 Yemen & Red Sea
          </button>
          <button
            onClick={() => setActiveTheater('saudi')}
            className={`rounded px-2 py-1 transition ${
              activeTheater === 'saudi'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🇸🇦 Saudi Arabia
          </button>
          <button
            onClick={() => setActiveTheater('iran')}
            className={`rounded px-2 py-1 transition ${
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
      <div className="relative w-full h-[540px] bg-[#070b14] select-none">
        <svg
          viewBox="0 0 1000 650"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Grid lines and gradients */}
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

          {/* Regional Landmass Geometry */}
          {/* Iran */}
          <path
            d="M 460,80 L 820,70 L 920,240 L 760,340 L 680,310 L 610,260 L 520,220 Z"
            fill="#10192e"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <text x="660" y="160" fill="#475569" fontSize="18" fontFamily="monospace" fontWeight="bold" letterSpacing="4">
            IRAN
          </text>

          {/* Saudi Arabia */}
          <path
            d="M 220,180 L 460,190 L 580,260 L 610,320 L 540,460 L 360,490 L 260,410 L 210,290 Z"
            fill="#0f192b"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <text x="350" y="310" fill="#475569" fontSize="22" fontFamily="monospace" fontWeight="bold" letterSpacing="6">
            SAUDI ARABIA
          </text>

          {/* Yemen */}
          <path
            d="M 270,470 L 540,460 L 590,520 L 480,590 L 330,580 L 270,520 Z"
            fill="#131e33"
            stroke="#334155"
            strokeWidth="1.8"
          />
          <text x="390" y="530" fill="#64748b" fontSize="16" fontFamily="monospace" fontWeight="bold" letterSpacing="4">
            YEMEN
          </text>

          {/* STRATEGIC PIPELINE OVERLAYS */}
          {/* 1. Saudi East-West Petroline (Abqaiq to Yanbu across the kingdom) */}
          <path
            d="M 530,295 L 430,325 L 320,335 L 235,340"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeDasharray="6,4"
            fill="none"
            opacity="0.9"
          />
          <text x="290" y="325" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">
            [ SAUDI EAST-WEST PETROLINE (5M BPD) ]
          </text>

          {/* 2. Iranian Goureh-Jask Pipeline (Bypassing Hormuz) */}
          <path
            d="M 570,240 L 630,275 L 685,310 L 750,345"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeDasharray="5,4"
            fill="none"
            opacity="0.8"
          />
          <text x="640" y="360" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">
            [ IRAN GOUREH-JASK PIPELINE ]
          </text>

          {/* Critical Waterways & Maritime Chokepoints */}
          <path d="M 230,280 L 290,490" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4,4" fill="none" opacity="0.5" />
          <text x="160" y="400" fill="#0284c7" fontSize="12" fontFamily="monospace" opacity="0.8">
            [ RED SEA TANKER TRANSIT CORRIDOR ]
          </text>

          <text x="620" y="275" fill="#f43f5e" fontSize="11" fontFamily="monospace" fontWeight="bold" opacity="0.9">
            ⚠️ [ STRAIT OF HORMUZ CHOKEPOINT ]
          </text>

          <text x="250" y="580" fill="#f43f5e" fontSize="11" fontFamily="monospace" fontWeight="bold" opacity="0.9">
            ⚠️ [ BAB AL-MANDAB CHOKEPOINT ]
          </text>

          {/* Strategic Oil & Energy Terminals */}
          {/* Ras Tanura */}
          <circle cx="535" cy="290" r="4" fill="#10b981" />
          <text x="545" y="294" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">
            Ras Tanura Terminal (Aramco)
          </text>

          {/* Yanbu Terminal */}
          <circle cx="235" cy="340" r="4" fill="#10b981" />
          <text x="165" y="335" fill="#10b981" fontSize="10" fontFamily="monospace">
            Yanbu Port
          </text>

          {/* Kharg Island */}
          <circle cx="550" cy="235" r="4" fill="#f59e0b" />
          <text x="560" y="238" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">
            Kharg Island (Iran Crude)
          </text>

          {/* Fujairah */}
          <circle cx="700" cy="325" r="3.5" fill="#38bdf8" />
          <text x="708" y="328" fill="#94a3b8" fontSize="9" fontFamily="monospace">
            Fujairah Bunkering Hub
          </text>

          {/* Cities */}
          <circle cx="430" cy="330" r="2.5" fill="#64748b" />
          <text x="438" y="334" fill="#64748b" fontSize="10" fontFamily="monospace">Riyadh</text>

          <circle cx="340" cy="525" r="2.5" fill="#64748b" />
          <text x="348" y="529" fill="#64748b" fontSize="10" fontFamily="monospace">Sana'a</text>

          <circle cx="640" cy="165" r="2.5" fill="#64748b" />
          <text x="648" y="169" fill="#64748b" fontSize="10" fontFamily="monospace">Tehran</text>
        </svg>

        {/* Dynamic Incident Pins */}
        {filteredEvents.map((ev) => {
          const pos = projectToMap(ev.lat, ev.lng);
          const color = getPinColor(ev.category);
          const icon = getPinIcon(ev.category);
          const isSelected = selectedPin?.id === ev.id;
          const isTanker = ev.category === 'tanker_attack';

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
              {/* Pulsing ring for strikes/tanker attacks */}
              <div
                style={{ borderColor: color }}
                className={`absolute -inset-2 rounded-full border opacity-70 pointer-events-none ${
                  isTanker ? 'animate-ping' : 'animate-pulse_slow'
                }`}
              />

              {/* Pin Head */}
              <div
                style={{ backgroundColor: color }}
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#080c14] shadow-lg transition-transform group-hover:scale-125 text-xs ${
                  isSelected ? 'ring-4 ring-cyan-400 scale-125' : ''
                }`}
              >
                {icon ? (
                  <span className="text-[11px] leading-none">{icon}</span>
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-950/95 px-2.5 py-1.5 text-[11px] text-slate-100 opacity-0 border border-slate-700 shadow-xl transition-opacity group-hover:opacity-100 z-30 font-mono">
                <div className="font-bold text-cyan-400">
                  {ev.category.toUpperCase().replace('_', ' ')} • {ev.country}
                </div>
                {ev.vessel_name && (
                  <div className="text-rose-300 font-bold text-[10px]">
                    🚢 Vessel: {ev.vessel_name}
                  </div>
                )}
                {ev.barrel_risk_estimate && (
                  <div className="text-amber-300 text-[10px]">
                    🛢️ {ev.barrel_risk_estimate}
                  </div>
                )}
                <div className="truncate max-w-[220px] text-slate-300 font-sans">{ev.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 bg-[#0b1220] px-4 py-2 text-[11px] font-mono text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs">🚢</span>
            <span className="text-rose-400 font-semibold">Tanker Attacks</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-1.5 w-4 bg-emerald-500 rounded" />
            <span className="text-emerald-400">Petroline Route</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-1.5 w-4 bg-amber-500 rounded" />
            <span className="text-amber-400">Goureh-Jask Pipeline</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs">⛽</span>
            <span>Refineries & Terminals</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            <span>Military/Naval Drills</span>
          </div>
        </div>

        <span className="text-slate-500 hidden lg:inline">
          Click any incident or pipeline terminal to open tactical dossier
        </span>
      </div>
    </div>
  );
};
