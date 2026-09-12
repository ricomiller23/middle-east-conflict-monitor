import { HistoricalBackfillConnector } from '../connectors/historical-backfill';
import { RawEvent } from '../connectors/types';
import { SecurityEvent, Country, EventCategory, CredibilityTier } from './types';
import { upsertEvents, getEvents, logIngestion, updateSettings } from './db';
import { XStubConnector } from '../connectors/x-stub';

// Geographic anchor locations for geotagging
const GEO_ANCHORS: Record<string, { lat: number; lng: number; location_name: string; country: Country }> = {
  hodeidah: { lat: 14.7978, lng: 42.9545, location_name: 'Hodeidah, Yemen', country: 'Yemen' },
  sanaa: { lat: 15.3694, lng: 44.191, location_name: "Sana'a, Yemen", country: 'Yemen' },
  aden: { lat: 12.7855, lng: 45.0187, location_name: 'Aden, Yemen', country: 'Yemen' },
  'red sea': { lat: 14.2, lng: 42.6, location_name: 'Southern Red Sea Maritime Corridor', country: 'Yemen' },
  'bab al-mandab': { lat: 12.5833, lng: 43.3333, location_name: 'Bab al-Mandab Strait Chokepoint', country: 'Yemen' },
  'ras isa': { lat: 15.192, lng: 42.753, location_name: 'Ras Isa Oil Terminal, Yemen', country: 'Yemen' },
  marib: { lat: 15.4639, lng: 45.3267, location_name: 'Marib Oil Fields, Yemen', country: 'Yemen' },
  riyadh: { lat: 24.7136, lng: 46.6753, location_name: 'Riyadh, Saudi Arabia', country: 'Saudi Arabia' },
  'ras tanura': { lat: 26.643, lng: 50.158, location_name: 'Ras Tanura Refinery & Crude Export Terminal, Saudi Arabia', country: 'Saudi Arabia' },
  abqaiq: { lat: 25.937, lng: 49.670, location_name: 'Abqaiq Crude Processing Facility (Aramco), Saudi Arabia', country: 'Saudi Arabia' },
  yanbu: { lat: 24.089, lng: 38.063, location_name: 'Yanbu Petroline Terminal, Saudi Arabia', country: 'Saudi Arabia' },
  petroline: { lat: 24.500, lng: 43.500, location_name: 'East-West Petroline Trans-Arabian Pipeline', country: 'Saudi Arabia' },
  jizan: { lat: 16.889, lng: 42.57, location_name: 'Jizan Refinery & Border Sector, Saudi Arabia', country: 'Saudi Arabia' },
  jeddah: { lat: 21.5433, lng: 39.1728, location_name: 'Jeddah, Saudi Arabia', country: 'Saudi Arabia' },
  asir: { lat: 18.2164, lng: 42.5053, location_name: 'Asir Region, Saudi Arabia', country: 'Saudi Arabia' },
  najran: { lat: 17.4924, lng: 44.1277, location_name: 'Najran Sector, Saudi Arabia', country: 'Saudi Arabia' },
  tehran: { lat: 35.6892, lng: 51.389, location_name: 'Tehran, Iran', country: 'Iran' },
  'strait of hormuz': { lat: 26.5667, lng: 56.25, location_name: 'Strait of Hormuz Strategic Chokepoint', country: 'Iran' },
  'persian gulf': { lat: 26.9, lng: 51.5, location_name: 'Persian Gulf', country: 'Iran' },
  'kharg island': { lat: 29.248, lng: 50.316, location_name: 'Kharg Island Crude Export Terminal, Iran', country: 'Iran' },
  'bandar abbas': { lat: 27.1832, lng: 56.2666, location_name: 'Bandar Abbas Naval Base, Iran', country: 'Iran' },
  fujairah: { lat: 25.128, lng: 56.326, location_name: 'Fujairah Crude Storage & Bunkering Hub', country: 'Iran' },
  isfahan: { lat: 32.6546, lng: 51.668, location_name: 'Isfahan, Iran', country: 'Iran' },
};

export interface BackfillResult {
  totalFetched: number;
  totalIngested: number;
  durationMs: number;
  monthlyBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  warfrontsCount: number;
  events: SecurityEvent[];
}

export async function executeSixMonthBackfill(): Promise<BackfillResult> {
  const startTime = Date.now();
  console.log('[Backfill Runner] Initiating 6-month historical intelligence ingestion...');

  const connector = new HistoricalBackfillConnector();
  const rawEvents = await connector.fetchEvents();

  const processedEvents: SecurityEvent[] = [];
  for (const raw of rawEvents) {
    const ev = processRawBackfillEvent(raw);
    if (ev) processedEvents.push(ev);
  }

  // Deduplicate and collapse
  const deduplicated = deduplicateAndCollapse(processedEvents);
  // Ensure strict descending chronological order (most recent first)
  deduplicated.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());

  // Upsert into database
  const ingestedCount = await upsertEvents(deduplicated);

  // Aggregate monthly breakdown
  const monthlyBreakdown: Record<string, number> = {
    '2026-03': 0,
    '2026-04': 0,
    '2026-05': 0,
    '2026-06': 0,
    '2026-07': 0,
    '2026-08': 0,
    '2026-09': 0,
  };

  const countryBreakdown: Record<string, number> = {
    'Saudi Arabia': 0,
    'Yemen': 0,
    'Iran': 0,
  };

  const categoryBreakdown: Record<string, number> = {};
  let warfrontsCount = 0;

  for (const ev of deduplicated) {
    const ym = ev.published_at.slice(0, 7);
    if (monthlyBreakdown[ym] !== undefined) {
      monthlyBreakdown[ym]++;
    } else {
      monthlyBreakdown[ym] = 1;
    }

    if (countryBreakdown[ev.country] !== undefined) {
      countryBreakdown[ev.country]++;
    }

    categoryBreakdown[ev.category] = (categoryBreakdown[ev.category] || 0) + 1;

    if (ev.is_podcast_analysis || ev.primary_source.includes('Warfronts')) {
      warfrontsCount++;
    }
  }

  await logIngestion({
    id: `log-backfill-${Date.now()}`,
    timestamp: new Date().toISOString(),
    connector_name: '6-Month Historical Backfill Engine',
    status: 'success',
    events_fetched: rawEvents.length,
    events_ingested: ingestedCount,
    duration_ms: Date.now() - startTime,
  });

  await updateSettings({
    total_events_tracked: (await getEvents({ limit: 1000 })).length,
  });

  console.log(`[Backfill Runner] Completed in ${Date.now() - startTime}ms. Ingested ${deduplicated.length} unique events across 6 months.`);

  return {
    totalFetched: rawEvents.length,
    totalIngested: ingestedCount,
    durationMs: Date.now() - startTime,
    monthlyBreakdown,
    countryBreakdown,
    categoryBreakdown,
    warfrontsCount,
    events: deduplicated,
  };
}

function processRawBackfillEvent(raw: RawEvent): SecurityEvent | null {
  const text = `${raw.title} ${raw.summary}`.toLowerCase();

  // Determine Country (strict filter: must tie to Saudi Arabia, Yemen, or Iran)
  let country: Country | null = raw.country || null;
  if (!country) {
    if (text.includes('yemen') || text.includes('houthi') || text.includes("sana'a") || text.includes('hodeidah') || text.includes('bab al-mandab') || text.includes('aden')) {
      country = 'Yemen';
    } else if (text.includes('saudi') || text.includes('riyadh') || text.includes('jizan') || text.includes('jeddah') || text.includes('ksa') || text.includes('aramco')) {
      country = 'Saudi Arabia';
    } else if (text.includes('iran') || text.includes('tehran') || text.includes('irgc') || text.includes('strait of hormuz') || text.includes('persian gulf') || text.includes('kharg')) {
      country = 'Iran';
    }
  }

  if (!country) return null;

  // Determine Category
  let category: EventCategory = raw.category || 'military';
  const isMaritime = text.match(/tanker|vessel|commercial ship|bulk carrier|cargo ship|container ship|usv|sea drone|boarding|maritime|anti-ship|ukmto|ambrey|cargo|aframax|suezmax|vlcc/i);
  const isAttack = text.match(/strike|missile|drone|uav|intercept|bomb|explosion|shelling|attack|fire|hit|boarded|hijack|seiz/i);

  if (isMaritime && isAttack) {
    category = 'tanker_attack';
  } else if (text.match(/pipeline|petroline|pumping station|crude line|goureh|marib-ras isa/i)) {
    category = 'pipeline_infrastructure';
  } else if (text.match(/refinery|ras tanura|abqaiq|processing plant|storage tank|oil depot|yanbu terminal|kharg island/i)) {
    category = 'refinery_disruption';
  } else if (text.match(/brent|wti|crude oil|opec|barrel|insurance premium|war risk|oil price|bunkering|rerout|cape of good hope/i)) {
    category = 'energy_market';
  } else if (isAttack) {
    category = 'strike';
  } else if (text.match(/talks|diplomat|envoy|ceasefire|treaty|muscat|un envoy|de-escalat/i)) {
    category = 'diplomatic';
  } else if (text.match(/statement|spokesperson|warns|vows|announced|threatened|condemn/i)) {
    category = 'statement';
  }

  // Assess Oil Market Impact
  let oilMarketImpact: 'critical' | 'high' | 'moderate' | 'low' | 'neutral' = 'neutral';
  if (category === 'tanker_attack' || category === 'refinery_disruption' || text.match(/explosion|fire|sunk|burning|spill/i)) {
    oilMarketImpact = 'critical';
  } else if (category === 'pipeline_infrastructure' || text.match(/strait of hormuz|insurance|rerout|bypass|closed/i)) {
    oilMarketImpact = 'high';
  } else if (category === 'energy_market' || text.match(/opec|crude|brent|wti|barrel/i)) {
    oilMarketImpact = 'moderate';
  }

  // Affected Infrastructure
  const affectedInfra: string[] = [];
  if (text.includes('petroline') || text.includes('east-west')) affectedInfra.push('East-West Petroline (Abqaiq-Yanbu)');
  if (text.includes('bab al-mandab') || text.includes('red sea')) affectedInfra.push('Bab al-Mandab Chokepoint');
  if (text.includes('hormuz') || text.includes('bandar abbas')) affectedInfra.push('Strait of Hormuz Chokepoint');
  if (text.includes('ras tanura')) affectedInfra.push('Ras Tanura Export Terminal');
  if (text.includes('abqaiq')) affectedInfra.push('Abqaiq Processing Facility');
  if (text.includes('kharg')) affectedInfra.push('Kharg Island Crude Terminal');
  if (text.includes('yanbu')) affectedInfra.push('Yanbu Red Sea Terminal');

  // Vessel identification
  let vesselName: string | null = null;
  const vesselMatch = raw.title.match(/(?:m\/t|mv|tanker|vessel|ship)\s+([A-Z][a-zA-Z0-9\s]{2,20})/i);
  if (vesselMatch) {
    vesselName = vesselMatch[0].trim();
  }

  // Barrel Risk Estimate
  let barrelRiskEstimate: string | null = null;
  if (category === 'tanker_attack') {
    barrelRiskEstimate = text.includes('vlcc') ? '~2,000,000 Barrels Crude Cargo' : '~1,000,000 Barrels Crude Cargo';
  } else if (category === 'pipeline_infrastructure') {
    barrelRiskEstimate = '5,000,000 BPD Pipeline Capacity';
  } else if (category === 'energy_market') {
    barrelRiskEstimate = '~3,200,000 BPD Transit Volume Diverted';
  }

  // Coordinates
  let lat: number | null = null;
  let lng: number | null = null;
  let locationName: string | null = null;

  for (const [kw, geo] of Object.entries(GEO_ANCHORS)) {
    if (text.includes(kw)) {
      lat = geo.lat;
      lng = geo.lng;
      locationName = geo.location_name;
      break;
    }
  }

  if (!lat) {
    if (country === 'Saudi Arabia') {
      lat = 24.7136;
      lng = 46.6753;
      locationName = 'Riyadh (National Sector)';
    } else if (country === 'Yemen') {
      lat = 15.3694;
      lng = 44.191;
      locationName = "Sana'a (Regional Sector)";
    } else if (country === 'Iran') {
      lat = 35.6892;
      lng = 51.389;
      locationName = 'Tehran (National Sector)';
    }
  }

  const citations = XStubConnector.extractVerifiedCitations(`${raw.title} ${raw.summary}`);
  const xUrls = citations.map((c) => c.url);

  // Deterministic ID
  const cleanTitleForId = raw.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32);
  const id = `hist-${country.slice(0, 2).toLowerCase()}-${cleanTitleForId}`;

  return {
    id,
    title: raw.title,
    summary: raw.summary,
    country,
    category,
    primary_source: raw.source_name,
    primary_url: raw.source_url,
    published_at: raw.published_at,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    credibility_tier: raw.credibility_tier,
    lat,
    lng,
    location_name: locationName,
    sources: [
      {
        id: `src-${Math.random().toString(36).substring(2, 9)}`,
        source_name: raw.source_name,
        source_url: raw.source_url,
        published_at: raw.published_at,
        credibility_tier: raw.credibility_tier,
        snippet: raw.snippet || raw.summary.slice(0, 200),
      },
    ],
    x_citations: xUrls,
    is_verified: raw.credibility_tier === 'tier_1',
    raw_keywords: [country, category],
    oil_market_impact: oilMarketImpact,
    affected_infrastructure: affectedInfra,
    vessel_name: vesselName,
    barrel_risk_estimate: barrelRiskEstimate,
    audio_url: raw.audio_url || null,
    podcast_duration: raw.podcast_duration || null,
    is_podcast_analysis: Boolean(raw.is_podcast_analysis),
    synopsis: raw.synopsis || null,
  };
}

function deduplicateAndCollapse(events: SecurityEvent[]): SecurityEvent[] {
  const collapsed: SecurityEvent[] = [];

  for (const ev of events) {
    let matched = false;

    for (const existing of collapsed) {
      if (existing.country !== ev.country) continue;

      const similarity = calculateSimilarity(existing.title, ev.title);
      const timeDiffHours = Math.abs(new Date(existing.published_at).getTime() - new Date(ev.published_at).getTime()) / 3600000;

      // Collapse if title similarity > 0.48 within a 48h reporting window
      if (similarity >= 0.48 && timeDiffHours <= 48) {
        matched = true;

        for (const s of ev.sources) {
          if (!existing.sources.some((exs) => exs.source_url === s.source_url)) {
            existing.sources.push(s);
          }
        }

        if (ev.credibility_tier === 'tier_1') {
          existing.credibility_tier = 'tier_1';
          existing.is_verified = true;
        }

        if (ev.audio_url && !existing.audio_url) {
          existing.audio_url = ev.audio_url;
          existing.podcast_duration = ev.podcast_duration;
          existing.is_podcast_analysis = ev.is_podcast_analysis;
          existing.synopsis = ev.synopsis;
        }

        if (ev.summary.length > existing.summary.length && ev.summary.length <= 450) {
          existing.summary = ev.summary;
        }

        break;
      }
    }

    if (!matched) {
      collapsed.push(ev);
    }
  }

  return collapsed;
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = tokenize(str1);
  const words2 = tokenize(str2);

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = new Set([...words1, ...words2]).size;
  return intersection / union;
}

function tokenize(str: string): Set<string> {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'over', 'into', 'amid'
  ]);
  const words = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}
