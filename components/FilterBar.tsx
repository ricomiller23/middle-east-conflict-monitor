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
    <div className="border-b border-slate-800 bg-[#090e1a]/95 py-2.5 sm:py-3">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 space-y-2.5 sm:space-y-3">
        {/* Top row: Search Bar & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Search Input with Touch Clear Button */}
          <div className="relative flex-1 w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search incidents, vessels, or assets..."
              className="w-full min-h-[40px] rounded-lg border border-slate-700/80 bg-[#0c1424] py-2 pl-9 pr-9 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-2.5 min-h-[28px] min-w-[28px] flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* View Mode Segmented Controls */}
          <div className="grid grid-cols-3 sm:flex items-center rounded-lg border border-slate-700/80 bg-[#0c1424] p-1 w-full sm:w-auto">
            <button
              onClick={() => onViewChange('feed')}
              className={`flex min-h-[38px] items-center justify-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                currentView === 'feed'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Feed</span>
            </button>
            <button
              onClick={() => onViewChange('timeline')}
              className={`flex min-h-[38px] items-center justify-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                currentView === 'timeline'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => onViewChange('map')}
              className={`flex min-h-[38px] items-center justify-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                currentView === 'map'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Radar Map</span>
            </button>
          </div>
        </div>

        {/* Second row: Swipeable Country Pills & Filter Dropdowns */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-0.5 text-xs">
          {/* Country Pills (Horizontally Swipeable on Mobile) */}
          <div className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-none gap-1.5 pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {countries.map((c) => (
              <button
                key={c.id}
                onClick={() => onCountryChange(c.id)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition min-h-[34px] active:scale-95 ${
                  selectedCountry === c.id
                    ? 'bg-slate-200 text-slate-900 font-semibold shadow'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Category & Credibility Tier Selectors */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="Filter by category"
              className="min-h-[38px] rounded-lg border border-slate-700/80 bg-[#0c1424] px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
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
              className="min-h-[38px] rounded-lg border border-slate-700/80 bg-[#0c1424] px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Credibility Tiers
              </option>
              <option value="tier_1" className="bg-slate-900 text-slate-200">
                🟢 Tier 1: Verified Outlets & MoD
              </option>
              <option value="tier_2" className="bg-slate-900 text-slate-200">
                🟡 Tier 2: Analysts & Trackers
              </option>
            </select>

            <div className="flex items-center justify-between sm:justify-start font-mono text-[11px] text-slate-400 sm:pl-1">
              <span>{totalFiltered} incidents</span>
              {(selectedCountry !== 'all' || selectedCategory !== 'all' || selectedTier !== 'all' || search) && (
                <button
                  onClick={() => {
                    onSearchChange('');
                    onCountryChange('all');
                    onCategoryChange('all');
                    onTierChange('all');
                  }}
                  className="sm:ml-2 text-cyan-400 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
