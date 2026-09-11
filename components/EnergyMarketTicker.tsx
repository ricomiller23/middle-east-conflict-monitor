'use client';

import React from 'react';
import { Fuel, TrendingUp, AlertOctagon, Navigation, Anchor, ShieldAlert, Activity } from 'lucide-react';

interface EnergyMarketTickerProps {
  onFilterEnergyOnly?: () => void;
  isEnergyFiltered?: boolean;
}

export const EnergyMarketTicker: React.FC<EnergyMarketTickerProps> = ({
  onFilterEnergyOnly,
  isEnergyFiltered,
}) => {
  return (
    <div className="border-b border-slate-800/80 bg-[#070d1a] py-1.5 px-3 sm:px-4 text-xs font-mono">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Horizontally swipeable ticker rail */}
        <div className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-none py-1 gap-4 text-slate-300 -mx-3 px-3 sm:mx-0 sm:px-0">
          {/* Brent Crude */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <span className="text-slate-400 text-[11px]">BRENT:</span>
            <span className="font-bold text-amber-400">$84.15</span>
            <span className="flex items-center text-[10px] text-rose-400">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +2.4%
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* WTI Crude */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <span className="text-slate-400 text-[11px]">WTI:</span>
            <span className="font-bold text-amber-300">$79.80</span>
            <span className="flex items-center text-[10px] text-rose-400">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +1.9%
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* Red Sea Tanker Rerouting */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <Anchor className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
            <span className="text-slate-400 text-[11px]">RED SEA DIVERSION:</span>
            <span className="font-bold text-rose-400">68.5%</span>
          </div>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* War Risk Insurance */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
            <span className="text-slate-400 text-[11px]">WAR RISK:</span>
            <span className="rounded bg-rose-950/80 px-1.5 py-0.5 font-bold text-rose-300 border border-rose-500/40 text-[10px]">
              0.75% HULL
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* East-West Petroline */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <Fuel className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-400 text-[11px]">PETROLINE:</span>
            <span className="font-semibold text-emerald-300">5.0M BPD</span>
          </div>
        </div>

        {/* Energy Filter Quick Toggle Button */}
        {onFilterEnergyOnly && (
          <div className="flex justify-end sm:justify-start flex-shrink-0 pt-0.5 sm:pt-0">
            <button
              onClick={onFilterEnergyOnly}
              className={`flex min-h-[36px] w-full sm:w-auto items-center justify-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition border active:scale-95 ${
                isEnergyFiltered
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow'
                  : 'bg-slate-800/90 text-amber-400 border-amber-500/30 hover:bg-slate-700'
              }`}
            >
              <Fuel className="h-3.5 w-3.5" />
              <span>{isEnergyFiltered ? 'Showing: Oil & Energy (Tap for All)' : 'Filter: Oil & Energy Only'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
