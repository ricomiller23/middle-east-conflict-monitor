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
    <div className="border-b border-slate-800/80 bg-[#070d1a] py-2 px-4 text-xs font-mono">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
        {/* Ticker Items */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-slate-300">
          {/* Brent Crude */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">BRENT CRUDE:</span>
            <span className="font-bold text-amber-400">$84.15</span>
            <span className="flex items-center text-[10px] text-rose-400">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +2.4%
            </span>
          </div>

          {/* WTI */}
          <div className="flex items-center space-x-1.5 hidden sm:flex">
            <span className="text-slate-400">WTI CRUDE:</span>
            <span className="font-bold text-amber-300">$79.80</span>
            <span className="flex items-center text-[10px] text-rose-400">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +1.9%
            </span>
          </div>

          {/* Red Sea Tanker Rerouting */}
          <div className="flex items-center space-x-1.5">
            <Anchor className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
            <span className="text-slate-400">RED SEA DIVERSION:</span>
            <span className="font-bold text-rose-400">68.5%</span>
            <span className="text-slate-400 text-[11px] hidden md:inline">via Good Hope (+14d)</span>
          </div>

          {/* War Risk Insurance */}
          <div className="flex items-center space-x-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
            <span className="text-slate-400">WAR RISK PREMIUM:</span>
            <span className="rounded bg-rose-950/80 px-1.5 py-0.2 font-bold text-rose-300 border border-rose-500/40 text-[10px]">
              0.75% HULL (CRITICAL)
            </span>
          </div>

          {/* East-West Petroline */}
          <div className="flex items-center space-x-1.5 hidden lg:flex">
            <Fuel className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-400">SAUDI PETROLINE:</span>
            <span className="font-semibold text-emerald-300">5.0M BPD</span>
            <span className="text-slate-400 text-[10px]">(Bypassing Hormuz)</span>
          </div>
        </div>

        {/* Energy Filter Quick Toggle */}
        {onFilterEnergyOnly && (
          <button
            onClick={onFilterEnergyOnly}
            className={`flex items-center space-x-1.5 rounded px-2.5 py-1 text-xs transition border ${
              isEnergyFiltered
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow'
                : 'bg-slate-800 text-amber-400 border-amber-500/30 hover:bg-slate-700'
            }`}
          >
            <Fuel className="h-3.5 w-3.5" />
            <span>{isEnergyFiltered ? 'All Intel' : 'Oil & Energy Only'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
