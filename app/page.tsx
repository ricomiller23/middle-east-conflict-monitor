'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { EnergyMarketTicker } from '@/components/EnergyMarketTicker';
import { FilterBar } from '@/components/FilterBar';
import { EventCard } from '@/components/EventCard';
import { TimelineView } from '@/components/TimelineView';
import { TacticalMapView } from '@/components/TacticalMapView';
import { EventDetailDrawer } from '@/components/EventDetailDrawer';
import { SecurityEvent, Country } from '@/lib/types';
import { Shield, AlertCircle, RefreshCw, Flame, Radio, ExternalLink, Anchor, Fuel } from 'lucide-react';

export default function DashboardPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');
  const [isEnergyOnly, setIsEnergyOnly] = useState(false);
  const [currentView, setCurrentView] = useState<'feed' | 'timeline' | 'map'>('feed');
  const [visibleCount, setVisibleCount] = useState(60);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  const fetchEvents = async (force = false) => {
    try {
      setRefreshing(true);
      const url = `/api/events?limit=2500${force ? '&force=true' : ''}&t=${Date.now()}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        const sorted = data.events.sort(
          (a: any, b: any) =>
            new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
        );
        setEvents(sorted);
        setNowTick(Date.now());
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setVisibleCount(60);
  }, [selectedCountry, selectedCategory, selectedTier, isEnergyOnly, search]);

  useEffect(() => {
    fetchEvents(false);
    // Auto-refresh every 60 seconds to stream breaking live wire updates
    const fetchInterval = setInterval(() => {
      fetchEvents(false);
    }, 60000);

    // Live clock ticker every 30 seconds so all relative times re-render live
    const clockInterval = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);

    return () => {
      clearInterval(fetchInterval);
      clearInterval(clockInterval);
    };
  }, []);

  // Country and energy counts calculation
  const countryCounts = useMemo(() => {
    return {
      saudi: events.filter((e) => e.country === 'Saudi Arabia').length,
      yemen: events.filter((e) => e.country === 'Yemen').length,
      iran: events.filter((e) => e.country === 'Iran').length,
      tankers: events.filter((e) => e.category === 'tanker_attack').length,
      energy: events.filter(
        (e) =>
          e.category === 'tanker_attack' ||
          e.category === 'pipeline_infrastructure' ||
          e.category === 'refinery_disruption' ||
          e.category === 'energy_market'
      ).length,
    };
  }, [events]);

  // Client-side filtering with strict descending chronological order (most recent first)
  const filteredEvents = useMemo(() => {
    const matched = events.filter((ev) => {
      if (isEnergyOnly) {
        const isEnergyCat =
          ev.category === 'tanker_attack' ||
          ev.category === 'pipeline_infrastructure' ||
          ev.category === 'refinery_disruption' ||
          ev.category === 'energy_market';
        if (!isEnergyCat) return false;
      }
      if (selectedCountry !== 'all' && ev.country !== selectedCountry) {
        return false;
      }
      if (selectedCategory !== 'all' && ev.category !== selectedCategory) {
        return false;
      }
      if (selectedTier !== 'all' && ev.credibility_tier !== selectedTier) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchSummary = ev.summary.toLowerCase().includes(q);
        const matchLoc = ev.location_name?.toLowerCase().includes(q);
        const matchVessel = ev.vessel_name?.toLowerCase().includes(q);
        const matchSource = ev.sources.some((s) => s.source_name.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchLoc && !matchVessel && !matchSource) {
          return false;
        }
      }
      return true;
    });

    return matched.sort(
      (a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
    );
  }, [events, selectedCountry, selectedCategory, selectedTier, isEnergyOnly, search]);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        totalEvents={events.length}
        countryCounts={countryCounts}
        lastSyncAt={events[0]?.published_at || null}
        onRefresh={() => fetchEvents(true)}
        isRefreshing={refreshing}
      />

      {/* Real-Time Oil & Energy Telemetry Ticker */}
      <EnergyMarketTicker
        onFilterEnergyOnly={() => setIsEnergyOnly(!isEnergyOnly)}
        isEnergyFiltered={isEnergyOnly}
      />

      {/* Filter and View Selection Bar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedTier={selectedTier}
        onTierChange={setSelectedTier}
        currentView={currentView}
        onViewChange={setCurrentView}
        totalFiltered={filteredEvents.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Threat & Energy Situation Bar (2x2 Grid on Mobile, 4-col on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5 font-mono text-xs">
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl">🇾🇪</span>
              <div>
                <div className="font-bold text-amber-400 text-[11px] sm:text-xs">YEMEN</div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 truncate max-w-[85px] sm:max-w-none">Red Sea Lane</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm sm:text-base font-bold text-amber-300">{countryCounts.yemen}</div>
              <div className="text-[8px] sm:text-[9px] text-amber-500/80">INCIDENTS</div>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl">🇸🇦</span>
              <div>
                <div className="font-bold text-emerald-400 text-[11px] sm:text-xs">SAUDI</div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 truncate max-w-[85px] sm:max-w-none">Petroline</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm sm:text-base font-bold text-emerald-300">{countryCounts.saudi}</div>
              <div className="text-[8px] sm:text-[9px] text-emerald-500/80">INCIDENTS</div>
            </div>
          </div>

          <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl">🇮🇷</span>
              <div>
                <div className="font-bold text-rose-400 text-[11px] sm:text-xs">IRAN</div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 truncate max-w-[85px] sm:max-w-none">Hormuz & Kharg</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm sm:text-base font-bold text-rose-300">{countryCounts.iran}</div>
              <div className="text-[8px] sm:text-[9px] text-rose-500/80">INCIDENTS</div>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl">🚢</span>
              <div>
                <div className="font-bold text-rose-400 text-[11px] sm:text-xs">TANKERS</div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 truncate max-w-[85px] sm:max-w-none">Attacks & Pipe</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm sm:text-base font-bold text-rose-300">{countryCounts.energy}</div>
              <div className="text-[8px] sm:text-[9px] text-rose-400">EVENTS</div>
            </div>
          </div>
        </div>

        {/* Dynamic View Mode */}
        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-16 text-center space-y-4">
            <RefreshCw className="mx-auto h-8 w-8 text-cyan-400 animate-spin" />
            <p className="font-mono text-sm text-slate-300">
              Initializing OSINT Ingestion Pipeline & Geospatial Indexes...
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-16 text-center space-y-3">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-300">No Incidents Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No incidents match your active filters or full-text query. Try clearing filters or trigger a live ingest in the Admin portal.
            </p>
          </div>
        ) : currentView === 'feed' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.slice(0, visibleCount).map((ev) => (
                <EventCard key={ev.id} event={ev} onSelect={setSelectedEvent} />
              ))}
            </div>
            {filteredEvents.length > visibleCount && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-6 border-t border-slate-800/80">
                <span className="font-mono text-xs text-slate-400">
                  Displaying {Math.min(visibleCount, filteredEvents.length)} of {filteredEvents.length} incidents
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 60)}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 px-4 py-2 font-mono text-xs font-semibold text-cyan-300 transition active:scale-95 shadow-sm"
                  >
                    Load Next 60 Incidents
                  </button>
                  <button
                    onClick={() => setVisibleCount(filteredEvents.length)}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700/80 px-3.5 py-2 font-mono text-xs text-slate-300 transition active:scale-95"
                  >
                    Show All ({filteredEvents.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : currentView === 'timeline' ? (
          <TimelineView events={filteredEvents} onSelect={setSelectedEvent} />
        ) : (
          <TacticalMapView events={filteredEvents} onSelect={setSelectedEvent} />
        )}
      </main>

      {/* Slide-over Incident Dossier Drawer */}
      <EventDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* Terminal Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#070b14] py-4 text-center text-xs text-slate-500 font-mono">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Middle East Conflict Monitor • Ingestion: RSS • GDELT 2.0 • Verified OSINT Allowlist
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>6-Hour Cron Schedule</span>
            <span>•</span>
            <a href="/admin" className="hover:text-cyan-400 transition">
              Admin Ops Center
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
