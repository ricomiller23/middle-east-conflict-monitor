'use client';

import React from 'react';
import {
  Fuel,
  TrendingUp,
  TrendingDown,
  Anchor,
  ShieldAlert,
  BarChart2,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { LIVE_BENCHMARKS, CHOKEPOINT_TELEMETRY } from '@/lib/energy-data';

interface EnergyMarketTickerProps {
  onFilterEnergyOnly?: () => void;
  isEnergyFiltered?: boolean;
  onOpenEnergyTab?: (benchmarkId?: string) => void;
}

export const EnergyMarketTicker: React.FC<EnergyMarketTickerProps> = ({
  onFilterEnergyOnly,
  isEnergyFiltered,
  onOpenEnergyTab,
}) => {
  const brent = LIVE_BENCHMARKS.brent;
  const wti = LIVE_BENCHMARKS.wti;
  const dubai = LIVE_BENCHMARKS.dubai;
  const vlcc = LIVE_BENCHMARKS.vlcc;

  return (
    <div className="border-b border-slate-800/80 bg-[#070d1a] py-1.5 px-3 sm:px-4 text-xs font-mono">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Horizontally swipeable ticker rail */}
        <div className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-none py-1 gap-3.5 text-slate-300 -mx-3 px-3 sm:mx-0 sm:px-0">
          {/* Brent Crude Pill */}
          <button
            onClick={() => onOpenEnergyTab && onOpenEnergyTab('brent')}
            className="flex items-center space-x-1.5 flex-shrink-0 hover:text-amber-300 transition group"
            title="Click to view 24-Month Brent Price Tracking Graph"
          >
            <span className="text-slate-400 text-[11px] group-hover:underline">BRENT:</span>
            <span className="font-bold text-amber-400">${brent.currentPrice.toFixed(2)}</span>
            <span className="flex items-center text-[10px] text-rose-400 font-bold">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +{brent.changePct24h.toFixed(1)}%
            </span>
          </button>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* WTI Crude Pill */}
          <button
            onClick={() => onOpenEnergyTab && onOpenEnergyTab('wti')}
            className="flex items-center space-x-1.5 flex-shrink-0 hover:text-amber-300 transition group"
            title="Click to view 24-Month WTI Price Tracking Graph"
          >
            <span className="text-slate-400 text-[11px] group-hover:underline">WTI:</span>
            <span className="font-bold text-amber-300">${wti.currentPrice.toFixed(2)}</span>
            <span className="flex items-center text-[10px] text-rose-400 font-bold">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +{wti.changePct24h.toFixed(1)}%
            </span>
          </button>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* Dubai / Oman Crude Pill */}
          <button
            onClick={() => onOpenEnergyTab && onOpenEnergyTab('dubai')}
            className="flex items-center space-x-1.5 flex-shrink-0 hover:text-amber-300 transition group"
            title="Click to view 24-Month Middle East Dubai/Oman Blend Graph"
          >
            <span className="text-slate-400 text-[11px] group-hover:underline">DUBAI/OMAN:</span>
            <span className="font-bold text-slate-200">${dubai.currentPrice.toFixed(2)}</span>
            <span className="flex items-center text-[10px] text-rose-400 font-bold">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +{dubai.changePct24h.toFixed(1)}%
            </span>
          </button>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* VLCC Tanker Day Rate Pill */}
          <button
            onClick={() => onOpenEnergyTab && onOpenEnergyTab('vlcc')}
            className="flex items-center space-x-1.5 flex-shrink-0 hover:text-cyan-300 transition group"
            title="Click to view 24-Month VLCC Tanker Day Rates Graph"
          >
            <span className="text-slate-400 text-[11px] group-hover:underline">VLCC RATE:</span>
            <span className="font-bold text-cyan-400">${(vlcc.currentPrice / 1000).toFixed(1)}k/day</span>
            <span className="flex items-center text-[10px] text-rose-400 font-bold">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              +{vlcc.changePct24h.toFixed(0)}%
            </span>
          </button>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* Red Sea Tanker Rerouting */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <Anchor className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
            <span className="text-slate-400 text-[11px]">RED SEA DIVERSION:</span>
            <span className="font-bold text-rose-400">{CHOKEPOINT_TELEMETRY.redSeaDiversionPct}%</span>
          </div>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* War Risk Insurance */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
            <span className="text-slate-400 text-[11px]">WAR RISK:</span>
            <span className="rounded bg-rose-950/80 px-1.5 py-0.5 font-bold text-rose-300 border border-rose-500/40 text-[10px]">
              {CHOKEPOINT_TELEMETRY.warRiskInsurancePct}% HULL
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800 flex-shrink-0" />

          {/* East-West Petroline */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <Fuel className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-400 text-[11px]">PETROLINE:</span>
            <span className="font-semibold text-emerald-300">{CHOKEPOINT_TELEMETRY.petrolineThroughputBpd}M BPD</span>
          </div>
        </div>

        {/* Action Buttons: 24M History Graph + Quick Energy Filter */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5 md:pt-0">
          {onOpenEnergyTab && (
            <button
              onClick={() => onOpenEnergyTab('brent')}
              className="flex min-h-[34px] items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition active:scale-95 shadow-sm"
              title="Open 24-Month Oil Price Tracking Graph"
            >
              <BarChart2 className="h-3.5 w-3.5 text-amber-400" />
              <span>24M Price History Graph</span>
              <ChevronRight className="h-3 w-3 text-amber-400/70" />
            </button>
          )}

          {onFilterEnergyOnly && (
            <button
              onClick={onFilterEnergyOnly}
              className={`flex min-h-[34px] items-center justify-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition border active:scale-95 ${
                isEnergyFiltered
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow'
                  : 'bg-slate-800/90 text-amber-400 border-amber-500/30 hover:bg-slate-700'
              }`}
            >
              <Fuel className="h-3.5 w-3.5" />
              <span>{isEnergyFiltered ? 'Filtered' : 'Filter Oil'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
