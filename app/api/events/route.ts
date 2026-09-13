import { NextRequest, NextResponse } from 'next/server';
import { getEvents, initDatabase, upsertEvents } from '@/lib/db';
import { LiveNewsConnector } from '@/connectors/live-news';
import { SecurityEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

let lastLiveSync = 0;

async function syncFreshNewsIfStale(newestTimestamp?: string): Promise<void> {
  const now = Date.now();
  // Throttle: don't hit external wires more than once every 3 minutes
  if (now - lastLiveSync < 3 * 60 * 1000) return;

  const ageMs = newestTimestamp ? now - new Date(newestTimestamp).getTime() : Infinity;
  // If data is older than 15 minutes, or container just booted
  if (ageMs > 15 * 60 * 1000 || lastLiveSync === 0) {
    lastLiveSync = now;
    try {
      const connector = new LiveNewsConnector();
      const rawEvents = await connector.fetchEvents();
      if (!rawEvents || rawEvents.length === 0) return;

      const freshEvents: SecurityEvent[] = [];
      for (const raw of rawEvents) {
        const text = (raw.title + ' ' + raw.summary).toLowerCase();
        const isYemen = text.includes('yemen') || text.includes('houthi') || text.includes('red sea') || text.includes('aden') || text.includes('bab al-mandab') || text.includes('bab el-mandeb');
        const isSaudi = text.includes('saudi') || text.includes('riyadh') || text.includes('aramco') || text.includes('petroline') || text.includes('jazan') || text.includes('yanbu');
        const isIran = text.includes('iran') || text.includes('tehran') || text.includes('irgc') || text.includes('hormuz') || text.includes('persian gulf') || text.includes('kharg');

        let country: any = 'Iran';
        if (isYemen) country = 'Yemen';
        else if (isSaudi) country = 'Saudi Arabia';

        let category: any = 'military';
        if (text.includes('tanker') || text.includes('ship') || text.includes('vessel') || text.includes('vlcc') || text.includes('boarding')) category = 'tanker_attack';
        else if (text.includes('strike') || text.includes('attack') || text.includes('drone') || text.includes('missile') || text.includes('bomb') || text.includes('wound') || text.includes('killed')) category = 'strike';
        else if (text.includes('pipeline') || text.includes('refinery') || text.includes('oil') || text.includes('crude') || text.includes('rates') || text.includes('bpd')) category = 'energy_market';
        else if (text.includes('talks') || text.includes('meeting') || text.includes('summit') || text.includes('diplomacy') || text.includes('envoy') || text.includes('peace')) category = 'diplomatic';
        else if (text.includes('warn') || text.includes('threat') || text.includes('claim') || text.includes('vow') || text.includes('says') || text.includes('defiance')) category = 'statement';

        let oil_impact: any = undefined;
        if (category === 'tanker_attack' || category === 'energy_market') {
          oil_impact = text.includes('ballistic') || text.includes('blockade') || text.includes('close') || text.includes('loss') ? 'critical' : 'high';
        }

        const id = `live-${new Date(raw.published_at).getTime()}-${Buffer.from(raw.title).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 14)}`;

        freshEvents.push({
          id,
          title: raw.title,
          summary: raw.summary.slice(0, 350),
          country,
          category,
          primary_source: raw.source_name,
          primary_url: raw.source_url,
          published_at: raw.published_at,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          credibility_tier: raw.credibility_tier,
          lat: isYemen ? 15.3694 : isSaudi ? 24.7136 : 26.5667,
          lng: isYemen ? 44.191 : isSaudi ? 46.6753 : 56.25,
          location_name: isYemen ? 'Yemen / Bab al-Mandab Sector' : isSaudi ? 'Saudi Arabia / Petroline Corridor' : 'Strait of Hormuz / Gulf Sector',
          oil_market_impact: oil_impact,
          sources: [
            {
              id: 'src-' + id,
              source_name: raw.source_name,
              source_url: raw.source_url,
              published_at: raw.published_at,
              credibility_tier: raw.credibility_tier,
              snippet: raw.summary.slice(0, 200),
            }
          ],
          x_citations: [],
          is_verified: true,
          raw_keywords: [country, category],
        });
      }

      if (freshEvents.length > 0) {
        await upsertEvents(freshEvents);
      }
    } catch (e) {
      console.warn('[API /api/events] Background live sync failed:', e);
    }
  }
}

export async function GET(req: NextRequest) {
  await initDatabase();

  const searchParams = req.nextUrl.searchParams;
  const country = searchParams.get('country') || undefined;
  const category = searchParams.get('category') || undefined;
  const credibility_tier = searchParams.get('credibility_tier') || undefined;
  const search = searchParams.get('search') || undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 500, 1), 2500) : 500;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

  try {
    let events = await getEvents({
      country,
      category,
      credibility_tier,
      search,
      limit,
      offset,
    });

    // Check if newest event is stale (> 15 mins), if so sync fresh news
    const newestTime = events[0]?.published_at;
    const now = Date.now();
    const isStale = !newestTime || (now - new Date(newestTime).getTime() > 15 * 60 * 1000);

    if (isStale && (now - lastLiveSync > 3 * 60 * 1000)) {
      await syncFreshNewsIfStale(newestTime);
      // Re-fetch with fresh items included
      events = await getEvents({
        country,
        category,
        credibility_tier,
        search,
        limit,
        offset,
      });
    }

    // Ensure strict descending chronological order (most recent first)
    events.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());

    // Deduplicate by normalized title to prevent identical wire reprints
    const seenTitles = new Set<string>();
    const uniqueEvents: SecurityEvent[] = [];
    for (const ev of events) {
      const norm = ev.title.toLowerCase().trim();
      if (!seenTitles.has(norm)) {
        seenTitles.add(norm);
        uniqueEvents.push(ev);
      }
    }

    return NextResponse.json({
      success: true,
      count: uniqueEvents.length,
      events: uniqueEvents,
    });
  } catch (err: any) {
    console.error('[API /api/events] Error fetching events:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve events' },
      { status: 500 }
    );
  }
}
