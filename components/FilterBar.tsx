'use client';

import React from 'react';
import { Search, SlidersHorizontal, LayoutGrid, Clock, MapPin, X } from 'lucide-react';
import { Country, EventCategory, CredibilityTier } from '@/lib/types';

interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedCountry: string;
  onCountryChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (val: string) => void;
  selectedTier: string;
  onTierChange: (val: string) => void;
  currentView: 'feed' | 'timeline' | 'map';
  onViewChange: (view: 'feed' | 'timeline' | 'map') => void;
  totalFiltered: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  onSearchChange,
  selectedCountry,
  onCountryChange,
  selectedCategory,
  onCategoryChange,
  selectedTier,
  onTierChange,
  currentView,
  onViewChange,
  totalFiltered,
}) => {
  const countries = [
    { id: 'all', label: 'All Theaters' },
    { id: 'Yemen', label: '🇾🇪 Yemen' },
    { id: 'Saudi Arabia', label: '🇸🇦 Saudi Arabia' },
    { id: 'Iran', label: '🇮🇷 Iran' },
  ];

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'tanker_attack', label: '🚢 Commercial Tanker Attacks' },
    { id: 'pipeline_infrastructure', label: '⚡ Pipelines & Terminals' },
    { id: 'energy_market', label: '🛢️ Oil & Energy Markets' },
    { id: 'refinery_disruption', label: '⛽ Refineries & Processing' },
    { id: 'strike', label: '🎯 Strikes & Intercepts' },
    { id: 'military', label: '⚔️ Military & Naval Ops' },
    { id: 'diplomatic', label: '🕊️ Diplomatic / Talks' },
    { id: 'statement', label: '📢 Official Statements' },
  ];

  return (
    <div className="border-b border-slate-800 bg-[#090e1a]/95 py-3">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-3">
        {/* Top row: Search Bar & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Full-text search (tsvector: 'Houthi', 'Red Sea', 'IRGC', 'drone', 'Jizan')..."
              className="w-full rounded-md border border-slate-700/80 bg-[#0c1424] py-2 pl-9 pr-8 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center rounded-lg border border-slate-700/80 bg-[#0c1424] p-0.5">
            <button
              onClick={() => onViewChange('feed')}
              className={`flex items-center space-x-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
                currentView === 'feed'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Feed</span>
            </button>
            <button
              onClick={() => onViewChange('timeline')}
              className={`flex items-center space-x-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
                currentView === 'timeline'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => onViewChange('map')}
              className={`flex items-center space-x-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
                currentView === 'map'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Tactical Map</span>
            </button>
          </div>
        </div>

        {/* Second row: Filter Pills & Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          {/* Country Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {countries.map((c) => (
              <button
                key={c.id}
                onClick={() => onCountryChange(c.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedCountry === c.id
                    ? 'bg-slate-200 text-slate-900 font-semibold shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Category & Credibility Tier Selectors */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="Filter by category"
              className="rounded-md border border-slate-700/80 bg-[#0c1424] px-2.5 py-1 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-slate-900 text-slate-200">
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={selectedTier}
              onChange={(e) => onTierChange(e.target.value)}
              aria-label="Filter by credibility tier"
              className="rounded-md border border-slate-700/80 bg-[#0c1424] px-2.5 py-1 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Credibility Tiers
              </option>
              <option value="tier_1" className="bg-slate-900 text-slate-200">
                🟢 Tier 1: Verified Outlets & Official MoD
              </option>
              <option value="tier_2" className="bg-slate-900 text-slate-200">
                🟡 Tier 2: Regional Trackers & Analysts
              </option>
            </select>

            <span className="font-mono text-[11px] text-slate-400 pl-1">
              ({totalFiltered} results)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
