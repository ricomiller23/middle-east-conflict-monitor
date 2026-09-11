import { RSSConnector } from '../connectors/rss';
import { GDELTConnector } from '../connectors/gdelt';
import { XStubConnector } from '../connectors/x-stub';
import { RawEvent, Connector } from '../connectors/types';
import { SecurityEvent, Country, EventCategory, CredibilityTier, IngestionLog } from './types';
import { getEvents, upsertEvents, logIngestion, updateSettings, getSettings } from './db';
import { sendEmailDigest } from './email';

// Geographic anchor locations for geotagging
const GEO_ANCHORS: Record<string, { lat: number; lng: number; location_name: string; country: Country }> = {
  hodeidah: { lat: 14.7978, lng: 42.9545, location_name: 'Hodeidah, Yemen', country: 'Yemen' },
  sanaa: { lat: 15.3694, lng: 44.191, location_name: "Sana'a, Yemen", country: 'Yemen' },
  aden: { lat: 12.7855, lng: 45.0187, location_name: 'Aden, Yemen', country: 'Yemen' },
  'red sea': { lat: 14.2, lng: 42.6, location_name: 'Southern Red Sea Maritime Corridor', country: 'Yemen' },
  'bab al-mandab': { lat: 12.5833, lng: 43.3333, location_name: 'Bab al-Mandab Strait', country: 'Yemen' },
  marib: { lat: 15.4639, lng: 45.3267, location_name: 'Marib, Yemen', country: 'Yemen' },
  riyadh: { lat: 24.7136, lng: 46.6753, location_name: 'Riyadh, Saudi Arabia', country: 'Saudi Arabia' },
  jizan: { lat: 16.889, lng: 42.57, location_name: 'Jizan Border Sector, Saudi Arabia', country: 'Saudi Arabia' },
  jeddah: { lat: 21.5433, lng: 39.1728, location_name: 'Jeddah, Saudi Arabia', country: 'Saudi Arabia' },
  asir: { lat: 18.2164, lng: 42.5053, location_name: 'Asir Region, Saudi Arabia', country: 'Saudi Arabia' },
  najran: { lat: 17.4924, lng: 44.1277, location_name: 'Najran Sector, Saudi Arabia', country: 'Saudi Arabia' },
  tehran: { lat: 35.6892, lng: 51.389, location_name: 'Tehran, Iran', country: 'Iran' },
  'strait of hormuz': { lat: 26.5667, lng: 56.25, location_name: 'Strait of Hormuz', country: 'Iran' },
  'persian gulf': { lat: 26.9, lng: 51.5, location_name: 'Persian Gulf', country: 'Iran' },
  'bandar abbas': { lat: 27.1832, lng: 56.2666, location_name: 'Bandar Abbas Naval Base, Iran', country: 'Iran' },
  isfahan: { lat: 32.6546, lng: 51.668, location_name: 'Isfahan, Iran', country: 'Iran' },
};

export async function runIngestionPipeline(): Promise<{
  totalFetched: number;
  totalIngested: number;
  newEventsCount: number;
  digestTriggered: boolean;
  logs: IngestionLog[];
}> {
  const startTime = Date.now();
  console.log('[Ingestion] Commencing 6-hour scheduled ingestion cycle...');

  const connectors: Connector[] = [new RSSConnector(), new GDELTConnector(), new XStubConnector()];
  const allRawEvents: RawEvent[] = [];
  const logs: IngestionLog[] = [];

  // 1. Fetch in parallel from all connectors
  for (const conn of connectors) {
    const connStart = Date.now();
    try {
      const events = await conn.fetchEvents();
      allRawEvents.push(...events);

      const log: IngestionLog = {
        id: `log-${Date.now()}-${conn.id}`,
        timestamp: new Date().toISOString(),
        connector_name: conn.name,
        status: 'success',
        events_fetched: events.length,
        events_ingested: 0, // updated after filtering
        duration_ms: Date.now() - connStart,
      };
      logs.push(log);
      await logIngestion(log);
    } catch (err: any) {
      console.error(`[Ingestion] Connector ${conn.name} failed:`, err);
      const log: IngestionLog = {
        id: `log-${Date.now()}-${conn.id}`,
        timestamp: new Date().toISOString(),
        connector_name: conn.name,
        status: 'error',
        events_fetched: 0,
        events_ingested: 0,
        duration_ms: Date.now() - connStart,
        error_message: err?.message || String(err),
      };
      logs.push(log);
      await logIngestion(log);
    }
  }

  // 2. Geotag, scope to Saudi Arabia / Yemen / Iran, and categorize
  const scopedEvents: SecurityEvent[] = [];
  for (const raw of allRawEvents) {
    const scoped = processRawEvent(raw);
    if (scoped) {
      scopedEvents.push(scoped);
    }
  }

  // 3. Deduplicate and collapse overlapping reports
  const deduplicatedEvents = deduplicateAndCollapse(scopedEvents);

  // 4. Diff against existing database records to find genuinely new events
  const existingEvents = await getEvents({ limit: 300 });
  const existingIdSet = new Set(existingEvents.map((e) => e.id));
  const newEvents: SecurityEvent[] = [];

  for (const ev of deduplicatedEvents) {
    // Check if an existing event has similar title or same ID
    const isNew = !existingIdSet.has(ev.id) && !existingEvents.some((ex) => calculateSimilarity(ex.title, ev.title) > 0.65);
    if (isNew) {
      newEvents.push(ev);
    }
  }

  // 5. Upsert to database
  const ingestedCount = await upsertEvents(deduplicatedEvents);

  // 6. Update system settings
  await updateSettings({
    last_ingestion_at: new Date().toISOString(),
    total_events_tracked: existingEvents.length + newEvents.length,
  });

  // 7. Check if email digest should be sent (only if new events found and digest not paused)
  let digestTriggered = false;
  const settings = await getSettings();
  if (!settings.digest_paused && newEvents.length > 0) {
    try {
      console.log(`[Ingestion] ${newEvents.length} new events detected. Triggering email digest dispatch...`);
      await sendEmailDigest(newEvents);
      digestTriggered = true;
      await updateSettings({ last_digest_sent_at: new Date().toISOString() });
    } catch (emailErr) {
      console.error('[Ingestion] Failed to dispatch email digest:', emailErr);
    }
  } else if (settings.digest_paused) {
    console.log('[Ingestion] Email digest skipped: Digest is currently paused by admin.');
  } else {
    console.log('[Ingestion] Email digest skipped: 0 new events since previous run.');
  }

  console.log(
    `[Ingestion] Cycle completed in ${Date.now() - startTime}ms. Fetched: ${allRawEvents.length}, Ingested: ${ingestedCount}, New: ${newEvents.length}`
  );

  return {
    totalFetched: allRawEvents.length,
    totalIngested: ingestedCount,
    newEventsCount: newEvents.length,
    digestTriggered,
    logs,
  };
}

function processRawEvent(raw: RawEvent): SecurityEvent | null {
  const text = `${raw.title} ${raw.summary}`.toLowerCase();

  // Determine Country (strict filter: must tie to Saudi Arabia, Yemen, or Iran)
  let country: Country | null = null;
  if (text.includes('yemen') || text.includes('houthi') || text.includes("sana'a") || text.includes('hodeidah') || text.includes('bab al-mandab')) {
    country = 'Yemen';
  } else if (text.includes('saudi') || text.includes('riyadh') || text.includes('jizan') || text.includes('jeddah') || text.includes('ksa')) {
    country = 'Saudi Arabia';
  } else if (text.includes('iran') || text.includes('tehran') || text.includes('irgc') || text.includes('strait of hormuz') || text.includes('persian gulf')) {
    country = 'Iran';
  }

  // If no clear link to the three target countries, discard per requirements
  if (!country) return null;

  // Determine Category
  let category: EventCategory = 'military';
  if (text.match(/strike|missile|drone|uav|intercept|bomb|explosion|shelling|attack/i)) {
    category = 'strike';
  } else if (text.match(/talks|diplomat|envoy|ceasefire|treaty|muscat|un envoy|de-escalat/i)) {
    category = 'diplomatic';
  } else if (text.match(/statement|spokesperson|warns|vows|announced|threatened|condemn/i)) {
    category = 'statement';
  } else if (text.match(/military|patrol|drills|exercise|corps|navy|warship|air defense|troops/i)) {
    category = 'military';
  } else {
    category = 'other';
  }

  // Geotag coordinates
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

  // Extract external X citations
  const citations = XStubConnector.extractVerifiedCitations(`${raw.title} ${raw.summary}`);
  const xUrls = citations.map((c) => c.url);

  // Generate deterministic ID from normalized title and country
  const cleanTitleForId = raw.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32);
  const id = `evt-${country.slice(0, 2).toLowerCase()}-${cleanTitleForId}`;

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
        x_citation_url: xUrls[0] || undefined,
      },
    ],
    x_citations: xUrls,
    is_verified: raw.credibility_tier === 'tier_1',
    raw_keywords: [country, category],
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

        // Merge sources
        for (const s of ev.sources) {
          if (!existing.sources.some((exs) => exs.source_url === s.source_url)) {
            existing.sources.push(s);
          }
        }

        // Merge citations
        for (const cit of ev.x_citations) {
          if (!existing.x_citations.includes(cit)) {
            existing.x_citations.push(cit);
          }
        }

        // If newly matched report has tier_1 credibility, elevate existing card
        if (ev.credibility_tier === 'tier_1') {
          existing.credibility_tier = 'tier_1';
          existing.is_verified = true;
        }

        // Keep the more descriptive summary
        if (ev.summary.length > existing.summary.length && ev.summary.length <= 450) {
          existing.summary = ev.summary;
        }

        existing.updated_at = new Date().toISOString();
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
