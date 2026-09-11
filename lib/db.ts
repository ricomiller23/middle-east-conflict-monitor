import { Pool } from 'pg';
import { SecurityEvent, IngestionLog, SystemSettings, Country, EventCategory, CredibilityTier } from './types';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;
let isPostgresAvailable = false;

// In-memory / file fallback store for local development preview when no remote DB is linked
let inMemoryEvents: SecurityEvent[] = [];
let inMemoryLogs: IngestionLog[] = [];
let inMemorySettings: SystemSettings = {
  digest_paused: false,
  last_digest_sent_at: null,
  last_ingestion_at: null,
  auto_ingest_enabled: true,
  total_events_tracked: 0,
  brent_crude_usd: 84.15,
  wti_crude_usd: 79.80,
  maritime_war_risk_level: 'DEFCON 1 (CRITICAL)',
  tanker_reroute_pct: 68.5,
};

function getConnectionString(): string | null {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || null;
}

export function getPool(): Pool | null {
  const connStr = getConnectionString();
  if (!connStr) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: connStr,
      ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function initDatabase(): Promise<boolean> {
  const p = getPool();
  if (!p) {
    console.log('[DB] No POSTGRES_URL provided. Utilizing resilient in-memory local fallback store.');
    seedFallbackData();
    return false;
  }

  try {
    const client = await p.connect();
    try {
      const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(sql);
      }
      isPostgresAvailable = true;
      console.log('[DB] PostgreSQL connected & schema verified with tsvector index.');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn('[DB] Failed to connect to PostgreSQL, falling back to local memory store:', error);
    isPostgresAvailable = false;
    seedFallbackData();
    return false;
  }
}

export async function getEvents(filters?: {
  country?: string;
  category?: string;
  credibility_tier?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SecurityEvent[]> {
  const p = getPool();
  const limit = filters?.limit ?? 500;
  const offset = filters?.offset || 0;

  if (inMemoryEvents.length === 0) {
    seedFallbackData();
  }

  if (p && isPostgresAvailable) {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (filters?.country && filters.country !== 'all') {
        conditions.push(`e.country = $${idx++}`);
        values.push(filters.country);
      }
      if (filters?.category && filters.category !== 'all') {
        conditions.push(`e.category = $${idx++}`);
        values.push(filters.category);
      }
      if (filters?.credibility_tier && filters.credibility_tier !== 'all') {
        conditions.push(`e.credibility_tier = $${idx++}`);
        values.push(filters.credibility_tier);
      }
      if (filters?.search && filters.search.trim()) {
        conditions.push(`e.tsv @@ plainto_tsquery('english', $${idx++})`);
        values.push(filters.search.trim());
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT 
          e.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', s.id,
                'source_name', s.source_name,
                'source_url', s.source_url,
                'published_at', s.published_at,
                'credibility_tier', s.credibility_tier,
                'snippet', s.snippet,
                'x_citation_url', s.x_citation_url
              )
            ) FILTER (WHERE s.id IS NOT NULL), '[]'
          ) as sources
        FROM events e
        LEFT JOIN event_sources s ON e.id = s.event_id
        ${whereClause}
        GROUP BY e.id
        ORDER BY e.published_at DESC
        LIMIT $${idx++} OFFSET $${idx++};
      `;
      values.push(limit, offset);

      const res = await p.query(query, values);
      return res.rows.map(mapRowToEvent);
    } catch (err) {
      console.error('[DB] PostgreSQL query failed, using in-memory store:', err);
    }
  }

  // Fallback memory filtering
  let results = [...inMemoryEvents];
  if (filters?.country && filters.country !== 'all') {
    results = results.filter((e) => e.country.toLowerCase() === filters.country!.toLowerCase());
  }
  if (filters?.category && filters.category !== 'all') {
    results = results.filter((e) => e.category.toLowerCase() === filters.category!.toLowerCase());
  }
  if (filters?.credibility_tier && filters.credibility_tier !== 'all') {
    results = results.filter((e) => e.credibility_tier === filters.credibility_tier);
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        (e.location_name && e.location_name.toLowerCase().includes(q))
    );
  }

  return results.slice(offset, offset + limit);
}

export async function upsertEvents(events: SecurityEvent[]): Promise<number> {
  const p = getPool();
  let insertedCount = 0;

  if (p && isPostgresAvailable) {
    try {
      const client = await p.connect();
      try {
        await client.query('BEGIN');
        for (const ev of events) {
          const res = await client.query(
            `
            INSERT INTO events (
              id, title, summary, country, category, primary_source, primary_url,
              published_at, credibility_tier, lat, lng, location_name, x_citations, is_verified,
              oil_market_impact, affected_infrastructure, vessel_name, barrel_risk_estimate,
              audio_url, podcast_duration, is_podcast_analysis, synopsis
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            ON CONFLICT (id) DO UPDATE SET
              summary = EXCLUDED.summary,
              category = EXCLUDED.category,
              x_citations = EXCLUDED.x_citations,
              oil_market_impact = EXCLUDED.oil_market_impact,
              affected_infrastructure = EXCLUDED.affected_infrastructure,
              vessel_name = EXCLUDED.vessel_name,
              barrel_risk_estimate = EXCLUDED.barrel_risk_estimate,
              audio_url = COALESCE(EXCLUDED.audio_url, events.audio_url),
              podcast_duration = COALESCE(EXCLUDED.podcast_duration, events.podcast_duration),
              is_podcast_analysis = COALESCE(EXCLUDED.is_podcast_analysis, events.is_podcast_analysis),
              synopsis = COALESCE(EXCLUDED.synopsis, events.synopsis),
              updated_at = NOW()
            RETURNING id;
          `,
            [
              ev.id,
              ev.title,
              ev.summary,
              ev.country,
              ev.category,
              ev.primary_source,
              ev.primary_url,
              ev.published_at,
              ev.credibility_tier,
              ev.lat,
              ev.lng,
              ev.location_name,
              JSON.stringify(ev.x_citations || []),
              ev.is_verified,
              ev.oil_market_impact || 'neutral',
              JSON.stringify(ev.affected_infrastructure || []),
              ev.vessel_name || null,
              ev.barrel_risk_estimate || null,
              ev.audio_url || null,
              ev.podcast_duration || null,
              Boolean(ev.is_podcast_analysis),
              ev.synopsis || null,
            ]
          );

          if (res.rowCount && res.rowCount > 0) {
            insertedCount++;
          }

          if (ev.sources && ev.sources.length > 0) {
            for (const s of ev.sources) {
              await client.query(
                `
                INSERT INTO event_sources (
                  id, event_id, source_name, source_url, published_at, credibility_tier, snippet, x_citation_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO NOTHING;
              `,
                [
                  s.id || `${ev.id}-${Math.random().toString(36).substring(2, 8)}`,
                  ev.id,
                  s.source_name,
                  s.source_url,
                  s.published_at,
                  s.credibility_tier,
                  s.snippet || null,
                  s.x_citation_url || null,
                ]
              );
            }
          }
        }
        await client.query('COMMIT');
        return insertedCount;
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('[DB] Transaction error in upsertEvents:', e);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[DB] Postgres connection error in upsertEvents:', err);
    }
  }

  // In-memory fallback upsert
  for (const ev of events) {
    const existingIdx = inMemoryEvents.findIndex((e) => e.id === ev.id);
    if (existingIdx >= 0) {
      inMemoryEvents[existingIdx] = { ...inMemoryEvents[existingIdx], ...ev };
    } else {
      inMemoryEvents.unshift(ev);
      insertedCount++;
    }
  }
  inMemorySettings.total_events_tracked = inMemoryEvents.length;
  return insertedCount;
}

export async function logIngestion(log: IngestionLog): Promise<void> {
  const p = getPool();
  if (p && isPostgresAvailable) {
    try {
      await p.query(
        `
        INSERT INTO ingestion_logs (
          id, timestamp, connector_name, status, events_fetched, events_ingested, duration_ms, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          log.id,
          log.timestamp,
          log.connector_name,
          log.status,
          log.events_fetched,
          log.events_ingested,
          log.duration_ms,
          log.error_message || null,
        ]
      );
      return;
    } catch (err) {
      console.error('[DB] Error recording ingestion log in Postgres:', err);
    }
  }

  inMemoryLogs.unshift(log);
  if (inMemoryLogs.length > 100) inMemoryLogs.pop();
}

export async function getIngestionLogs(limit = 20): Promise<IngestionLog[]> {
  const p = getPool();
  if (p && isPostgresAvailable) {
    try {
      const res = await p.query('SELECT * FROM ingestion_logs ORDER BY timestamp DESC LIMIT $1', [limit]);
      return res.rows;
    } catch (err) {
      console.error('[DB] Error getting logs from Postgres:', err);
    }
  }
  return inMemoryLogs.slice(0, limit);
}

export async function getSettings(): Promise<SystemSettings> {
  const p = getPool();
  if (p && isPostgresAvailable) {
    try {
      const res = await p.query("SELECT value FROM settings WHERE key = 'digest_settings'");
      if (res.rows.length > 0) {
        return {
          ...inMemorySettings,
          ...res.rows[0].value,
        };
      }
    } catch (err) {
      console.error('[DB] Error reading settings from Postgres:', err);
    }
  }
  return inMemorySettings;
}

export async function updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  inMemorySettings = { ...inMemorySettings, ...settings };
  const p = getPool();
  if (p && isPostgresAvailable) {
    try {
      await p.query(
        `
        INSERT INTO settings (key, value, updated_at)
        VALUES ('digest_settings', $1, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
      `,
        [JSON.stringify(inMemorySettings)]
      );
    } catch (err) {
      console.error('[DB] Error updating settings in Postgres:', err);
    }
  }
  return inMemorySettings;
}

function mapRowToEvent(row: any): SecurityEvent {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    country: row.country as Country,
    category: row.category as EventCategory,
    primary_source: row.primary_source,
    primary_url: row.primary_url,
    published_at: typeof row.published_at === 'string' ? row.published_at : row.published_at?.toISOString?.() || new Date().toISOString(),
    created_at: typeof row.created_at === 'string' ? row.created_at : row.created_at?.toISOString?.() || new Date().toISOString(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : row.updated_at?.toISOString?.() || new Date().toISOString(),
    credibility_tier: row.credibility_tier as CredibilityTier,
    lat: row.lat ? parseFloat(row.lat) : null,
    lng: row.lng ? parseFloat(row.lng) : null,
    location_name: row.location_name,
    sources: Array.isArray(row.sources) ? row.sources : [],
    x_citations: Array.isArray(row.x_citations) ? row.x_citations : typeof row.x_citations === 'string' ? JSON.parse(row.x_citations) : [],
    is_verified: Boolean(row.is_verified),
    raw_keywords: [],
    oil_market_impact: row.oil_market_impact || 'neutral',
    affected_infrastructure: Array.isArray(row.affected_infrastructure)
      ? row.affected_infrastructure
      : typeof row.affected_infrastructure === 'string'
      ? JSON.parse(row.affected_infrastructure)
      : [],
    vessel_name: row.vessel_name || null,
    barrel_risk_estimate: row.barrel_risk_estimate || null,
    audio_url: row.audio_url || null,
    podcast_duration: row.podcast_duration || null,
    is_podcast_analysis: Boolean(row.is_podcast_analysis),
    synopsis: row.synopsis || null,
  };
}

function seedFallbackData() {
  if (inMemoryEvents.length > 0) return;
  const now = new Date();

  let historicalEvents: SecurityEvent[] = [];
  try {
    const seedPath = path.join(process.cwd(), 'lib', 'historical_seed.json');
    if (fs.existsSync(seedPath)) {
      const rawData = fs.readFileSync(seedPath, 'utf8');
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        historicalEvents = parsed;
        console.log(`[DB Fallback] Loaded ${parsed.length} historical events spanning 6 months from seed archive.`);
      }
    }
  } catch (err) {
    console.warn('[DB Fallback] Could not read historical_seed.json:', err);
  }

  const baseItems: SecurityEvent[] = [
    {
      id: 'sec-wf-houthi-yemen-01',
      title: 'Warfronts: Are the Houthi Rebels About to Conquer Yemen?',
      summary: "Yemen's Houthi rebels have launched a devastating offensive, seizing the entire western coastline and capturing the strategic Bab al-Mandeb Strait. With control over ten percent of global maritime trade routes, the Houthis now hold unprecedented leverage over international shipping.",
      synopsis: "Yemen's Houthi rebels have launched a devastating offensive, seizing the entire western coastline and capturing the strategic Bab al-Mandeb Strait. Saudi-backed forces collapsed amid coalition infighting and betrayal by resurgent separatists. With control over ten percent of global maritime trade routes, the Houthis now hold unprecedented leverage over international shipping.",
      country: 'Yemen',
      category: 'tanker_attack',
      primary_source: 'Warfronts (Simon Whistler)',
      primary_url: 'https://feeds.megaphone.fm/warfronts',
      audio_url: 'https://traffic.megaphone.fm/CTL1417361991.mp3',
      podcast_duration: '20m 07s',
      is_podcast_analysis: true,
      published_at: new Date(now.getTime() - 0.5 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_2',
      lat: 12.5833,
      lng: 43.3333,
      location_name: 'Bab al-Mandab Strait Chokepoint',
      oil_market_impact: 'critical',
      affected_infrastructure: ['Bab al-Mandab Chokepoint', 'Southern Red Sea Maritime Lane'],
      barrel_risk_estimate: '~4,800,000 BPD Global Chokepoint Flow',
      sources: [
        {
          id: 'src-wf-1',
          source_name: 'Warfronts (Simon Whistler)',
          source_url: 'https://feeds.megaphone.fm/warfronts',
          published_at: new Date(now.getTime() - 0.5 * 3600000).toISOString(),
          credibility_tier: 'tier_2',
          snippet: "Military synopsis: Houthi consolidation of western coastline and Bab al-Mandeb control gives the group unprecedented leverage over 10% of global seaborne oil trade.",
        },
      ],
      x_citations: [],
      is_verified: true,
      raw_keywords: ['Warfronts', 'Simon Whistler', 'Houthi', 'Yemen', 'Bab al-Mandeb', 'Red Sea'],
    },
    {
      id: 'sec-wf-houthi-ground-02',
      title: 'Warfronts: The Houthi Rebels Just Launched a Major Ground Campaign…And It Backfired',
      summary: "Yemen's Houthi rebels launched a major ground offensive toward Taiz and the strategic Red Sea coastline, but Saudi-backed Yemeni forces responded with a swift, coordinated counterattack from multiple directions. With over 500 fighters killed and oil prices nearing $100 per barrel, both sides believe this battle could decide Yemen's future.",
      synopsis: "Yemen's Houthi rebels launched a major ground offensive toward Taiz and the strategic Red Sea coastline, but Saudi-backed Yemeni forces responded with a swift, coordinated counterattack from multiple directions. With over 500 fighters killed and oil prices nearing $100 per barrel, both sides believe this battle could decide Yemen's future.",
      country: 'Yemen',
      category: 'energy_market',
      primary_source: 'Warfronts (Simon Whistler)',
      primary_url: 'https://feeds.megaphone.fm/warfronts',
      audio_url: 'https://traffic.megaphone.fm/CTL7322897876.mp3',
      podcast_duration: '18m 40s',
      is_podcast_analysis: true,
      published_at: new Date(now.getTime() - 2.5 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_2',
      lat: 13.579,
      lng: 44.020,
      location_name: 'Taiz / Southern Coastal Flank, Yemen',
      oil_market_impact: 'high',
      affected_infrastructure: ['Red Sea Coastal Sector', 'Taiz Ground Corridor'],
      barrel_risk_estimate: 'Oil Markets Nearing $100/bbl on Escalation',
      sources: [
        {
          id: 'src-wf-2',
          source_name: 'Warfronts (Simon Whistler)',
          source_url: 'https://feeds.megaphone.fm/warfronts',
          published_at: new Date(now.getTime() - 2.5 * 3600000).toISOString(),
          credibility_tier: 'tier_2',
          snippet: "Strategic analysis: The Houthi high command overextended ground lines toward southern oil hubs, triggering coalition counter-offensives and oil market risk premiums.",
        },
      ],
      x_citations: [],
      is_verified: true,
      raw_keywords: ['Warfronts', 'Simon Whistler', 'Taiz', 'Saudi Coalition', 'Oil Price'],
    },
    {
      id: 'sec-wf-iran-economy-03',
      title: "Warfronts: Iran's Economy Is Facing Severe Strain Amid Escalation",
      summary: "Iran's economy is collapsing under war, sanctions, soaring inflation, currency turmoil, fuel shortages, and industrial damage. Simon Whistler analyzes how Iranians are coping, why protests threaten Tehran, and whether pressure on strategic oil export facilities will succeed.",
      synopsis: "Iran's economy is collapsing under war, sanctions, soaring inflation, currency turmoil, fuel shortages, and industrial damage. Explore how Iranians are coping, why protests threaten Tehran, and whether pressure will work.",
      country: 'Iran',
      category: 'energy_market',
      primary_source: 'Warfronts (Simon Whistler)',
      primary_url: 'https://feeds.megaphone.fm/warfronts',
      audio_url: 'https://traffic.megaphone.fm/CTL8697234370.mp3',
      podcast_duration: '21m 49s',
      is_podcast_analysis: true,
      published_at: new Date(now.getTime() - 4.2 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_2',
      lat: 35.6892,
      lng: 51.389,
      location_name: 'Tehran / National Sector',
      oil_market_impact: 'high',
      affected_infrastructure: ['Kharg Island Crude Terminal', 'Domestic Refining Grid'],
      barrel_risk_estimate: '1,500,000 BPD Iranian Export Capacity Exposed',
      sources: [
        {
          id: 'src-wf-3',
          source_name: 'Warfronts (Simon Whistler)',
          source_url: 'https://feeds.megaphone.fm/warfronts',
          published_at: new Date(now.getTime() - 4.2 * 3600000).toISOString(),
          credibility_tier: 'tier_2',
          snippet: "Economic and military assessment of Iranian domestic resilience, sanctions bypass corridors, and domestic fuel supply chokepoints.",
        },
      ],
      x_citations: [],
      is_verified: true,
      raw_keywords: ['Warfronts', 'Simon Whistler', 'Iran Economy', 'Sanctions', 'Kharg Island'],
    },
    {
      id: 'sec-ye-tanker-01',
      title: 'Crude Oil Tanker Struck by Multiple USV Drone Boats Off Hodeidah in Red Sea Transit',
      summary: 'UKMTO and Ambrey report commercial crude carrier sustained hits from explosive USVs 77NM west of Hodeidah. Crew evacuated as salvage teams mobilize. Incident threatens 1M barrels of crude cargo and triggers immediate Brent crude prompt-month spike.',
      country: 'Yemen',
      category: 'tanker_attack',
      primary_source: 'UKMTO Maritime Trade Operations',
      primary_url: 'https://www.ukmto.org',
      published_at: new Date(now.getTime() - 1 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_1',
      lat: 14.750,
      lng: 42.450,
      location_name: 'Bab al-Mandab / Hodeidah Transit Lane',
      vessel_name: 'M/T Sounion (Suezmax Crude Tanker)',
      oil_market_impact: 'critical',
      affected_infrastructure: ['Bab al-Mandab Chokepoint', 'Southern Red Sea Maritime Lane'],
      barrel_risk_estimate: '1,000,000 Barrels Crude Cargo',
      sources: [
        {
          id: 'src-tanker-1',
          source_name: 'UKMTO Warning 064/2026',
          source_url: 'https://www.ukmto.org',
          published_at: new Date(now.getTime() - 1 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Vessel attacked by two small craft, projectile struck starboard quarter, secondary USV explosion reported.',
          x_citation_url: 'https://x.com/UK_MTO/status/1833920123456789012',
          author_handle: 'UK_MTO',
        },
        {
          id: 'src-tanker-2',
          source_name: 'Ambrey Maritime Threat Intelligence',
          source_url: 'https://ambrey.com',
          published_at: new Date(now.getTime() - 0.9 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Commercial vessel was unladen Greek-flagged crude carrier in ballast to Ras Isa terminal.',
          x_citation_url: 'https://x.com/Ambrey_Intel/status/1833921123456789012',
          author_handle: 'Ambrey_Intel',
        },
        {
          id: 'src-tanker-3',
          source_name: 'TankerTrackers Satellite Telemetry',
          source_url: 'https://tankertrackers.com',
          published_at: new Date(now.getTime() - 0.7 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'AIS transponder lost position lock following impact; plume confirmed by European Sentinel satellite.',
          x_citation_url: 'https://x.com/TankerTrackers/status/1833924123456789012',
          author_handle: 'TankerTrackers',
        },
      ],
      x_citations: [
        'https://x.com/UK_MTO/status/1833920123456789012',
        'https://x.com/Ambrey_Intel/status/1833921123456789012',
        'https://x.com/TankerTrackers/status/1833924123456789012',
      ],
      is_verified: true,
      raw_keywords: ['Tanker Attack', 'USV', 'Red Sea', 'Sounion', 'UKMTO', 'Ambrey'],
    },
    {
      id: 'sec-sa-pipeline-02',
      title: 'Saudi Aramco Ramps East-West Petroline Pumping Capacity to 5M BPD Bypassing Strait of Hormuz',
      summary: 'Saudi Aramco energized auxiliary gas-turbine booster stations along the 1,200km East-West Petroline connecting Abqaiq to Yanbu on the Red Sea, enabling 5.0 million barrels per day of crude to bypass Strait of Hormuz maritime risks.',
      country: 'Saudi Arabia',
      category: 'pipeline_infrastructure',
      primary_source: 'S&P Global Commodity Insights',
      primary_url: 'https://www.spglobal.com/commodityinsights',
      published_at: new Date(now.getTime() - 3.5 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_1',
      lat: 24.089,
      lng: 38.063,
      location_name: 'Yanbu Terminal & East-West Petroline Terminal',
      vessel_name: null,
      oil_market_impact: 'high',
      affected_infrastructure: ['East-West Petroline (Abqaiq-Yanbu)', 'Yanbu Crude Export Terminal'],
      barrel_risk_estimate: '5,000,000 BPD Pipeline Capacity',
      sources: [
        {
          id: 'src-pipe-1',
          source_name: 'S&P Global Commodity Insights',
          source_url: 'https://www.spglobal.com/commodityinsights',
          published_at: new Date(now.getTime() - 3.5 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Saudi Arabia shifting crude export mix westwards to shield Asian customers from Hormuz disruptions.',
        },
        {
          id: 'src-pipe-2',
          source_name: 'Javier Blas (Bloomberg Energy)',
          source_url: 'https://www.bloomberg.com/opinion',
          published_at: new Date(now.getTime() - 3.1 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Petroline is the most critical bypass valve in global energy logistics.',
          x_citation_url: 'https://x.com/JavierBlas/status/1833870123456789012',
          author_handle: 'JavierBlas',
        },
      ],
      x_citations: ['https://x.com/JavierBlas/status/1833870123456789012'],
      is_verified: true,
      raw_keywords: ['Petroline', 'Pipeline', 'Aramco', 'Yanbu', 'Abqaiq', 'Bypass'],
    },
    {
      id: 'sec-ir-tanker-03',
      title: 'IRGC Navy Boarding Commandos Intercept Commercial Products Tanker in Strait of Hormuz',
      summary: 'Islamic Revolutionary Guard Corps fast-attack craft and helicopter boarding teams seized an Aframax oil products carrier in international waters approaching the Strait of Hormuz, citing environmental inspection directives.',
      country: 'Iran',
      category: 'tanker_attack',
      primary_source: 'Ambrey Maritime Threat Intelligence',
      primary_url: 'https://ambrey.com',
      published_at: new Date(now.getTime() - 6 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_1',
      lat: 26.350,
      lng: 56.400,
      location_name: 'Strait of Hormuz Inbound Traffic Lane',
      vessel_name: 'St. Nikolas (Aframax)',
      oil_market_impact: 'high',
      affected_infrastructure: ['Strait of Hormuz Chokepoint', 'Bandar Abbas Naval Sector'],
      barrel_risk_estimate: '750,000 Barrels Gasoil Cargo',
      sources: [
        {
          id: 'src-ir-1',
          source_name: 'Ambrey Intelligence',
          source_url: 'https://ambrey.com',
          published_at: new Date(now.getTime() - 6 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Armed personnel boarded vessel from speedboats and redirected heading toward Bandar Abbas anchorage.',
          x_citation_url: 'https://x.com/Ambrey_Intel/status/1833840123456789012',
          author_handle: 'Ambrey_Intel',
        },
      ],
      x_citations: ['https://x.com/Ambrey_Intel/status/1833840123456789012'],
      is_verified: true,
      raw_keywords: ['Hormuz', 'IRGC', 'Tanker Seizure', 'St. Nikolas', 'Ambrey'],
    },
    {
      id: 'sec-ye-market-04',
      title: 'Lloyd\'s Joint War Committee Hikes Red Sea Tanker Insurance to 0.75%; 68% of Tankers Diverting Around Africa',
      summary: 'Marine hull underwriters raised additional war risk premiums to 0.75% of vessel value. Global shipping intelligence confirms over 68% of laden crude and product tankers are rerouting via the Cape of Good Hope, adding 10-14 days transit and tying up ~3.2M bpd of global fleet capacity.',
      country: 'Yemen',
      category: 'energy_market',
      primary_source: 'Reuters Energy',
      primary_url: 'https://www.reuters.com/business/energy/',
      published_at: new Date(now.getTime() - 8 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_1',
      lat: 12.800,
      lng: 43.150,
      location_name: 'Bab al-Mandab Maritime Exclusion Sector',
      vessel_name: null,
      oil_market_impact: 'critical',
      affected_infrastructure: ['Bab al-Mandab Strait', 'Suez Maritime Transit Corridor'],
      barrel_risk_estimate: '3,200,000 BPD Rerouted Around Africa',
      sources: [
        {
          id: 'src-mkt-1',
          source_name: 'Reuters Energy',
          source_url: 'https://www.reuters.com/business/energy/',
          published_at: new Date(now.getTime() - 8 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'War risk insurance premiums surged tenfold since initial missile engagements, forcing shipping lines to abandon Suez.',
        },
        {
          id: 'src-mkt-2',
          source_name: 'OilPrice.com',
          source_url: 'https://oilprice.com',
          published_at: new Date(now.getTime() - 7.6 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Brent crude spread widens as floating storage and diversion times consume global tanker supply.',
        },
      ],
      x_citations: [],
      is_verified: true,
      raw_keywords: ['War Risk Insurance', 'Tanker Rerouting', 'Cape of Good Hope', 'Brent', 'Suez'],
    },
    {
      id: 'sec-ye-20260911-01',
      title: 'U.S. Central Command Intercepts Houthi Anti-Ship Cruise Missiles Over Southern Red Sea',
      summary: 'CENTCOM forces successfully engaged and destroyed two anti-ship cruise missiles launched from Houthi-controlled territory in Yemen toward international maritime shipping corridors.',
      country: 'Yemen',
      category: 'strike',
      primary_source: 'CENTCOM Official Dispatch',
      primary_url: 'https://www.centcom.mil/MEDIA/PRESS-RELEASES/',
      published_at: new Date(now.getTime() - 2 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_1',
      lat: 14.802,
      lng: 42.951,
      location_name: 'Hodeidah / Red Sea Corridor',
      sources: [
        {
          id: 'src-1',
          source_name: 'CENTCOM',
          source_url: 'https://www.centcom.mil/MEDIA/PRESS-RELEASES/',
          published_at: new Date(now.getTime() - 2 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'U.S. forces neutralized incoming projectile with no civilian casualties reported.',
          x_citation_url: 'https://x.com/CENTCOM/status/1833890123456789012',
          author_handle: 'CENTCOM',
        },
        {
          id: 'src-2',
          source_name: 'Reuters World',
          source_url: 'https://www.reuters.com/world/middle-east/',
          published_at: new Date(now.getTime() - 1.8 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Maritime security company Ambrey confirmed interception flashes off Hodeidah.',
        },
      ],
      x_citations: ['https://x.com/CENTCOM/status/1833890123456789012'],
      is_verified: true,
      raw_keywords: ['Houthi', 'Red Sea', 'CENTCOM', 'missile'],
    },
    {
      id: 'sec-sa-20260911-02',
      title: 'Saudi Royal Air Defense Forces Conduct Joint Interception Drills Across Southern Border Sector',
      summary: 'Saudi Armed Forces command completed joint live-fire radar integration exercises along the Jizan and Asir defense perimeters to counter low-altitude UAV threats.',
      country: 'Saudi Arabia',
      category: 'military',
      primary_source: 'Saudi Ministry of Defense',
      primary_url: 'https://mod.gov.sa',
      published_at: new Date(now.getTime() - 5 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_1',
      lat: 16.889,
      lng: 42.570,
      location_name: 'Jizan Defense Sector',
      sources: [
        {
          id: 'src-3',
          source_name: 'Saudi Press Agency',
          source_url: 'https://www.spa.gov.sa',
          published_at: new Date(now.getTime() - 5 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'High-readiness defensive air patrols executed across southern sector boundaries.',
          x_citation_url: 'https://x.com/modgovksa/status/1833854123456789012',
          author_handle: 'modgovksa',
        },
      ],
      x_citations: ['https://x.com/modgovksa/status/1833854123456789012'],
      is_verified: true,
      raw_keywords: ['Saudi', 'Air Defense', 'Jizan', 'UAV'],
    },
    {
      id: 'sec-ir-20260911-03',
      title: 'IRGC Navy Commences Multi-Day Coastal Patrol Exercises in Strait of Hormuz',
      summary: 'Islamic Revolutionary Guard Corps Navy deployed missile fast-attack craft and coastal electronic warfare units along the Hormuz maritime chokepoint.',
      country: 'Iran',
      category: 'military',
      primary_source: 'ISW Iran Intelligence Update',
      primary_url: 'https://www.understandingwar.org',
      published_at: new Date(now.getTime() - 9 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_1',
      lat: 26.566,
      lng: 56.250,
      location_name: 'Strait of Hormuz / Bandar Abbas',
      sources: [
        {
          id: 'src-4',
          source_name: 'Institute for the Study of War',
          source_url: 'https://www.understandingwar.org',
          published_at: new Date(now.getTime() - 9 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Naval assets tracked conducting staged interdiction maneuvers.',
          x_citation_url: 'https://x.com/TheStudyofWar/status/1833790123456789012',
          author_handle: 'TheStudyofWar',
        },
        {
          id: 'src-5',
          source_name: 'Associated Press',
          source_url: 'https://apnews.com',
          published_at: new Date(now.getTime() - 8.5 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Commercial maritime traffic notified of exclusion zone drills.',
        },
      ],
      x_citations: ['https://x.com/TheStudyofWar/status/1833790123456789012'],
      is_verified: true,
      raw_keywords: ['IRGC', 'Hormuz', 'Iran', 'Navy'],
    },
    {
      id: 'sec-ye-20260911-04',
      title: 'Diplomatic Envoys Convene in Muscat on UN-Brokered Yemen Maritime De-escalation Protocol',
      summary: 'Special envoys discussed framework proposals aimed at safeguarding civilian commercial transit and establishing demilitarized zones around key ports.',
      country: 'Yemen',
      category: 'diplomatic',
      primary_source: 'Al Jazeera English',
      primary_url: 'https://www.aljazeera.com',
      published_at: new Date(now.getTime() - 14 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_1',
      lat: 15.369,
      lng: 44.191,
      location_name: 'Sana\'a / Muscat Channel',
      sources: [
        {
          id: 'src-6',
          source_name: 'Al Jazeera',
          source_url: 'https://www.aljazeera.com',
          published_at: new Date(now.getTime() - 14 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Talks focused on port access and unfreezing maritime trade corridors.',
        },
      ],
      x_citations: [],
      is_verified: true,
      raw_keywords: ['Yemen', 'UN', 'Muscat', 'Diplomacy'],
    },
    {
      id: 'sec-ir-20260911-05',
      title: 'Tehran Foreign Ministry Issues Statement on Regional Security Architecture and Gulf Transit',
      summary: 'Iran foreign ministry spokesperson issued a formal warning regarding foreign military naval presence in the Persian Gulf, proposing an indigenous collective security pact.',
      country: 'Iran',
      category: 'statement',
      primary_source: 'Agence France-Presse (AFP)',
      primary_url: 'https://www.afp.com',
      published_at: new Date(now.getTime() - 20 * 3600000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      credibility_tier: 'tier_1',
      lat: 35.689,
      lng: 51.389,
      location_name: 'Tehran',
      sources: [
        {
          id: 'src-7',
          source_name: 'AFP',
          source_url: 'https://www.afp.com',
          published_at: new Date(now.getTime() - 20 * 3600000).toISOString(),
          credibility_tier: 'tier_1',
          snippet: 'Spokesperson reiterated opposition to non-littoral task force deployments.',
        },
      ],
      x_citations: [],
      is_verified: true,
      raw_keywords: ['Tehran', 'Foreign Ministry', 'Gulf', 'Security'],
    },
  ];

  const existingIds = new Set(baseItems.map((e) => e.id));
  const merged = [...baseItems];
  for (const hist of historicalEvents) {
    if (!existingIds.has(hist.id)) {
      merged.push(hist);
      existingIds.add(hist.id);
    }
  }

  inMemoryEvents = merged;

  inMemoryLogs = [
    {
      id: 'log-seed-1',
      timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
      connector_name: 'RSS Feeds (Reuters, AP, Al Jazeera, ISW)',
      status: 'success',
      events_fetched: 42,
      events_ingested: 3,
      duration_ms: 1140,
    },
    {
      id: 'log-seed-2',
      timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
      connector_name: 'GDELT Project API',
      status: 'success',
      events_fetched: 68,
      events_ingested: 2,
      duration_ms: 1820,
    },
    {
      id: 'log-seed-3',
      timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
      connector_name: 'Social Media Citations Stub',
      status: 'success',
      events_fetched: 9,
      events_ingested: 0,
      duration_ms: 45,
    },
  ];

  inMemorySettings.total_events_tracked = inMemoryEvents.length;
  inMemorySettings.last_ingestion_at = inMemoryLogs[0].timestamp;
}
