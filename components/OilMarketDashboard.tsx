'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  LIVE_BENCHMARKS,
  CHOKEPOINT_TELEMETRY,
  HISTORICAL_24M_PRICES,
  CONFLICT_MILESTONES,
  EnergyBenchmark,
  HistoricalPricePoint,
  ConflictMilestone,
} from '@/lib/energy-data';
import {
  TrendingUp,
  TrendingDown,
  Fuel,
  Anchor,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  Info,
  Maximize2,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Flame,
} from 'lucide-react';

interface OilMarketDashboardProps {
  initialBenchmark?: string;
  onSelectEventTag?: (searchTerm: string) => void;
}

export const OilMarketDashboard: React.FC<OilMarketDashboardProps> = ({
  initialBenchmark = 'brent',
  onSelectEventTag,
}) => {
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>(initialBenchmark);
  const [timeframe, setTimeframe] = useState<'24m' | '12m' | '6m' | '3m' | '1m'>('24m');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [compareWti, setCompareWti] = useState<boolean>(false);
  const [compareVlcc, setCompareVlcc] = useState<boolean>(false);
  const [selectedMilestone, setSelectedMilestone] = useState<ConflictMilestone | null>(null);

  const benchmark = LIVE_BENCHMARKS[selectedBenchmarkId] || LIVE_BENCHMARKS.brent;

  // Filter historical points by timeframe
  const filteredHistory = useMemo(() => {
    const total = HISTORICAL_24M_PRICES.length;
    if (timeframe === '1m') return HISTORICAL_24M_PRICES.slice(-4);
    if (timeframe === '3m') return HISTORICAL_24M_PRICES.slice(-9);
    if (timeframe === '6m') return HISTORICAL_24M_PRICES.slice(-16);
    if (timeframe === '12m') return HISTORICAL_24M_PRICES.slice(-27);
    return HISTORICAL_24M_PRICES; // 24m
  }, [timeframe]);

  // Extract series values
  const seriesValues = useMemo(() => {
    return filteredHistory.map((p) => {
      if (selectedBenchmarkId === 'wti') return p.wti;
      if (selectedBenchmarkId === 'dubai') return p.dubai;
      if (selectedBenchmarkId === 'murban') return p.murban;
      if (selectedBenchmarkId === 'gasoil') return p.gasoil;
      if (selectedBenchmarkId === 'vlcc') return p.vlcc;
      return p.brent;
    });
  }, [filteredHistory, selectedBenchmarkId]);

  const minVal = useMemo(() => Math.min(...seriesValues) * 0.96, [seriesValues]);
  const maxVal = useMemo(() => Math.max(...seriesValues) * 1.04, [seriesValues]);
  const valRange = maxVal - minVal || 1;

  // Calculate SVG Coordinates
  const chartWidth = 960;
  const chartHeight = 320;
  const paddingX = 45;
  const paddingY = 25;
  const drawWidth = chartWidth - paddingX * 2;
  const drawHeight = chartHeight - paddingY * 2;

  const points = useMemo(() => {
    return filteredHistory.map((item, idx) => {
      const val = seriesValues[idx];
      const x = paddingX + (idx / Math.max(filteredHistory.length - 1, 1)) * drawWidth;
      const y = paddingY + drawHeight - ((val - minVal) / valRange) * drawHeight;
      return { x, y, val, item };
    });
  }, [filteredHistory, seriesValues, minVal, valRange, drawWidth, drawHeight]);

  // SVG path for line
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');
  }, [points]);

  // SVG path for filled gradient area
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = paddingY + drawHeight;
    return `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [linePath, points, paddingY, drawHeight]);

  // Active or hovered point
  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1424] p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="flex items-center space-x-1 rounded bg-amber-950/60 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-400 border border-amber-500/40">
                <Fuel className="h-3.5 w-3.5 mr-1" />
                <span>24-MONTH CRUDE & ENERGY MARKET RADAR</span>
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                Real-Time Spot + 24M Geopolitical History
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center space-x-2">
              <span>{benchmark.name}</span>
              <span className="text-sm font-mono text-slate-400 font-normal">({benchmark.unit})</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {benchmark.description} <span className="text-amber-400 font-semibold">{benchmark.chokepointRelevance}</span>
            </p>
          </div>

          {/* Big Live Price Display */}
          <div className="flex items-baseline space-x-3 sm:text-right">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                {selectedBenchmarkId === 'vlcc' ? `$${benchmark.currentPrice.toLocaleString()}` : `$${benchmark.currentPrice.toFixed(2)}`}
              </div>
              <div className="flex items-center sm:justify-end space-x-2 mt-0.5">
                <span
                  className={`inline-flex items-center text-xs font-mono font-bold ${
                    benchmark.change24h >= 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {benchmark.change24h >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 mr-1" />
                  )}
                  {benchmark.change24h >= 0 ? '+' : ''}
                  {selectedBenchmarkId === 'vlcc' ? `$${benchmark.change24h.toLocaleString()}` : `$${benchmark.change24h.toFixed(2)}`} (
                  {benchmark.changePct24h >= 0 ? '+' : ''}
                  {benchmark.changePct24h.toFixed(2)}%)
                </span>
                <span className="text-[10px] font-mono text-slate-500">24H SPOT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chokepoint Telemetry Micro-Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="rounded bg-[#080e1a] p-2.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">RED SEA DIVERSION</span>
            <div className="flex items-center space-x-1.5">
              <Anchor className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-sm font-bold text-rose-400">{CHOKEPOINT_TELEMETRY.redSeaDiversionPct}%</span>
              <span className="text-[10px] text-rose-400">(+{CHOKEPOINT_TELEMETRY.redSeaDiversionChange24h}%)</span>
            </div>
          </div>

          <div className="rounded bg-[#080e1a] p-2.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">PETROLINE BYPASS FLOW</span>
            <div className="flex items-center space-x-1.5">
              <Fuel className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-300">{CHOKEPOINT_TELEMETRY.petrolineThroughputBpd}M BPD</span>
              <span className="text-[10px] text-emerald-400">({CHOKEPOINT_TELEMETRY.petrolineCapacityPct}%)</span>
            </div>
          </div>

          <div className="rounded bg-[#080e1a] p-2.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">WAR RISK HULL PREMIUM</span>
            <div className="flex items-center space-x-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-sm font-bold text-rose-300">{CHOKEPOINT_TELEMETRY.warRiskInsurancePct}%</span>
              <span className="text-[10px] text-slate-400">(~$950k/transit)</span>
            </div>
          </div>

          <div className="rounded bg-[#080e1a] p-2.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">EST. CONFLICT PREMIUM</span>
            <div className="flex items-center space-x-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">{benchmark.riskPremiumEstimate.split(' ')[0]}</span>
              <span className="text-[10px] text-amber-400">Risk Factor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Benchmark Quick Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {Object.values(LIVE_BENCHMARKS).map((b) => {
          const isSelected = b.id === selectedBenchmarkId;
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBenchmarkId(b.id)}
              className={`text-left p-3 rounded-xl border transition-all active:scale-95 ${
                isSelected
                  ? 'border-amber-500 bg-amber-950/30 shadow-md ring-1 ring-amber-500/50'
                  : 'border-slate-800 bg-[#0d1424] hover:border-slate-700 hover:bg-[#111a2f]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1">
                <span>{b.ticker}</span>
                <span className={b.change24h >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {b.changePct24h >= 0 ? '+' : ''}
                  {b.changePct24h.toFixed(1)}%
                </span>
              </div>
              <div className="font-mono text-sm sm:text-base font-bold text-white truncate">
                {b.id === 'vlcc' ? `$${(b.currentPrice / 1000).toFixed(1)}k/d` : `$${b.currentPrice.toFixed(2)}`}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{b.name}</div>
            </button>
          );
        })}
      </div>

      {/* Main Chart Section */}
      <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4 sm:p-6 shadow-xl space-y-4">
        {/* Controls Row: Timeframe & Overlays */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 font-mono text-xs text-slate-300">
            <BarChart3 className="h-4 w-4 text-amber-400" />
            <span className="font-bold">24-Month Tracking History Graph</span>
            <span className="text-[10px] text-slate-400 hidden md:inline">
              (Hover/drag across curve for dates & conflict milestones)
            </span>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center space-x-1 rounded-lg border border-slate-700/80 bg-[#080d1a] p-1 self-start sm:self-auto">
            {(['24m', '12m', '6m', '3m', '1m'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded px-2.5 py-1 text-xs font-mono font-semibold transition ${
                  timeframe === tf
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Active Inspection Header Bar */}
        {activePoint && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#080e1b] rounded-lg border border-slate-800/80 p-2.5 sm:px-4 font-mono text-xs">
            <div className="flex items-center space-x-3">
              <span className="text-slate-400">Date:</span>
              <span className="font-bold text-cyan-300">{activePoint.item.label}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Price:</span>
              <span className="font-bold text-amber-400 text-sm">
                {selectedBenchmarkId === 'vlcc' ? `$${activePoint.val.toLocaleString()}/day` : `$${activePoint.val.toFixed(2)}`}
              </span>
            </div>

            {activePoint.item.eventMilestone ? (
              <div className="flex items-center space-x-2 text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-rose-400 animate-pulse" />
                <span className="font-semibold">{activePoint.item.eventMilestone.title}</span>
              </div>
            ) : (
              <span className="text-slate-500 text-[11px]">Hover over highlighted markers to inspect incident links</span>
            )}
          </div>
        )}

        {/* Responsive SVG Chart */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto select-none overflow-visible"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="oilGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.38" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Price Labels */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
              const y = paddingY + drawHeight * ratio;
              const price = maxVal - ratio * valRange;
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {selectedBenchmarkId === 'vlcc' ? `$${Math.round(price / 1000)}k` : `$${price.toFixed(1)}`}
                  </text>
                </g>
              );
            })}

            {/* Filled Area Gradient */}
            <path d={areaPath} fill="url(#oilGradient)" />

            {/* Main Price Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Geopolitical Event Milestone Dots */}
            {points.map((pt, idx) => {
              if (!pt.item.eventMilestone) return null;
              const isCrit = pt.item.eventMilestone.impact === 'critical';
              return (
                <g
                  key={idx}
                  className="cursor-pointer group"
                  onClick={() => setSelectedMilestone({
                    date: pt.item.date,
                    title: pt.item.eventMilestone!.title,
                    impact: pt.item.eventMilestone!.impact,
                    location: pt.item.eventMilestone!.location,
                    brentPrice: pt.item.brent,
                    vlccRate: pt.item.vlcc,
                    summary: pt.item.eventMilestone!.description,
                  })}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    fill={isCrit ? '#ef4444' : '#f59e0b'}
                    fillOpacity="0.25"
                    className="animate-ping origin-center"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill={isCrit ? '#ef4444' : '#f59e0b'}
                    stroke="#080e1a"
                    strokeWidth="2"
                  />
                </g>
              );
            })}

            {/* Interactive Vertical Cursor / Crosshair */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  y1={paddingY}
                  x2={activePoint.x}
                  y2={paddingY + drawHeight}
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="5"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Transparent Overlay Rectangles for Smooth Mouse Scrubbing */}
            {points.map((pt, idx) => {
              const stepWidth = drawWidth / Math.max(points.length - 1, 1);
              return (
                <rect
                  key={idx}
                  x={pt.x - stepWidth / 2}
                  y={paddingY}
                  width={stepWidth}
                  height={drawHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIndex(idx)}
                />
              );
            })}

            {/* Date Labels on X-Axis */}
            {points.map((pt, idx) => {
              // Only render periodic dates to avoid clutter
              const interval = Math.max(1, Math.floor(points.length / 7));
              if (idx % interval !== 0 && idx !== points.length - 1) return null;
              return (
                <text
                  key={idx}
                  x={pt.x}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {pt.item.label.split(' ')[0]}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Milestone Detail Card Modal / Popover */}
        {selectedMilestone && (
          <div className="rounded-lg border border-rose-500/50 bg-rose-950/30 p-3 sm:p-4 mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="rounded bg-rose-900/80 text-rose-200 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                  CONFLICT MILESTONE
                </span>
                <span className="font-mono text-xs text-slate-300 font-bold">{selectedMilestone.date}</span>
                <span className="font-mono text-xs text-amber-400">📍 {selectedMilestone.location}</span>
              </div>
              <h4 className="text-sm font-semibold text-white">{selectedMilestone.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{selectedMilestone.summary}</p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => setSelectedMilestone(null)}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Geopolitical Incident & Price Correlation Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm sm:text-base font-bold text-white font-mono">
              Chronological 24-Month Conflict Incident & Price Correlation Log
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {CONFLICT_MILESTONES.length} Strategic Milestones Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800/80 text-[11px] text-slate-500 uppercase">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Geopolitical Event & Chokepoint Incident</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Brent Price</th>
                <th className="py-2.5 px-3">VLCC Day Rate</th>
                <th className="py-2.5 px-3 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {CONFLICT_MILESTONES.map((m, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedMilestone(m)}
                  className="hover:bg-slate-800/40 cursor-pointer transition"
                >
                  <td className="py-2.5 px-3 font-semibold text-cyan-300 whitespace-nowrap">{m.date}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-100">{m.title}</div>
                    <div className="text-[11px] text-slate-400 font-sans line-clamp-1">{m.summary}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{m.location}</td>
                  <td className="py-2.5 px-3 font-bold text-amber-400 whitespace-nowrap">${m.brentPrice.toFixed(2)}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-200 whitespace-nowrap">${m.vlccRate.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${
                        m.impact === 'critical'
                          ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                          : 'bg-amber-950 text-amber-300 border-amber-500/50'
                      }`}
                    >
                      {m.impact}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
