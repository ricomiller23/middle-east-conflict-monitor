import { NextRequest, NextResponse } from 'next/server';
import { getEvents, initDatabase, upsertEvents } from '@/lib/db';
import { LiveNewsConnector } from '@/connectors/live-news';
import { SecurityEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let lastLiveSync = 0;

async function syncFreshNewsIfStale(newestTimestamp?: string, force = false): Promise<void> {
  const now = Date.now();
  // Throttle: don't hit external wires more than once every 2 minutes unless forced
  if (!force && now - lastLiveSync < 2 * 60 * 1000) return;

  const ageMs = newestTimestamp ? now - new Date(newestTimestamp).getTime() : Infinity;
  // If data is older than 10 minutes, or container just booted, or forced
  if (force || ageMs > 10 * 60 * 1000 || lastLiveSync === 0) {
    lastLiveSync = now;
    try {
      const connector = new LiveNewsConnector();
      const rawEvents = await connector.fetchEvents();
      if (!rawEvents || rawEvents.length === 0) return;

      const freshEvents: SecurityEvent[] = [];
      for (const raw of rawEvents) {
        const text = (raw.title + ' ' + raw.summary).toLowerCase();
        const isYemen = text.includes('yemen') || text.includes('houthi') || text.includes('red sea') || text.includes('aden') || text.includes('bab al-mandab') || text.includes('bab el-mandeb') || text.includes('hodeidah');
        const isSaudi = text.includes('saudi') || text.includes('riyadh') || text.includes('aramco') || text.includes('petroline') || text.includes('jazan') || text.includes('jizan') || text.includes('yanbu') || text.includes('abqaiq');
        const isIran = text.includes('iran') || text.includes('tehran') || text.includes('irgc') || text.includes('hormuz') || text.includes('persian gulf') || text.includes('kharg');

        let country: any = 'Iran';
        if (isYemen) country = 'Yemen';
        else if (isSaudi) country = 'Saudi Arabia';

        let category: any = 'military';
        if (text.includes('tanker') || text.includes('ship') || text.includes('vessel') || text.includes('vlcc') || text.includes('aframax') || text.includes('boarding') || text.includes('struck in strait')) category = 'tanker_attack';
        else if (text.includes('pipeline') || text.includes('petroline') || text.includes('refinery')) category = 'pipeline_infrastructure';
        else if (text.includes('crude') || text.includes('oil price') || text.includes('brent') || text.includes('energy market') || text.includes('rates') || text.includes('bpd') || text.includes('opec')) category = 'energy_market';
        else if (text.includes('strike') || text.includes('attack') || text.includes('drone') || text.includes('missile') || text.includes('bomb') || text.includes('wound') || text.includes('killed') || text.includes('kill box')) category = 'strike';
        else if (text.includes('talks') || text.includes('meeting') || text.includes('summit') || text.includes('diplomacy') || text.includes('envoy') || text.includes('peace') || text.includes('postpone')) category = 'diplomatic';
        else if (text.includes('warn') || text.includes('threat') || text.includes('claim') || text.includes('vow') || text.includes('says') || text.includes('defiance')) category = 'statement';

        let oil_impact: any = undefined;
        if (category === 'tanker_attack' || category === 'pipeline_infrastructure' || category === 'energy_market') {
          oil_impact = text.includes('ballistic') || text.includes('blockade') || text.includes('close') || text.includes('loss') || text.includes('surge') || text.includes('shut') ? 'critical' : 'high';
        }

        // Geolocation
        let lat = isYemen ? 15.3694 : isSaudi ? 24.7136 : 26.5667;
        let lng = isYemen ? 44.191 : isSaudi ? 46.6753 : 56.25;
        let location_name = isYemen ? 'Yemen / Bab al-Mandab Sector' : isSaudi ? 'Saudi Arabia / Petroline Corridor' : 'Strait of Hormuz / Gulf Sector';

        if (text.includes('hormuz') || text.includes('persian gulf')) {
          lat = 26.5667; lng = 56.25; location_name = 'Strait of Hormuz / Gulf Sector';
        } else if (text.includes('hodeidah')) {
          lat = 14.7978; lng = 42.9545; location_name = 'Hodeidah, Yemen';
        } else if (text.includes('bab al-mandab') || text.includes('bab el-mandeb')) {
          lat = 12.5833; lng = 43.3333; location_name = 'Bab al-Mandab Strait Chokepoint';
        } else if (text.includes('red sea')) {
          lat = 14.2; lng = 42.6; location_name = 'Southern Red Sea Maritime Corridor';
        } else if (text.includes('yanbu')) {
          lat = 24.089; lng = 38.063; location_name = 'Yanbu Petroline Terminal, Saudi Arabia';
        } else if (text.includes('abqaiq')) {
          lat = 25.937; lng = 49.670; location_name = 'Abqaiq Crude Processing Facility, Saudi Arabia';
        } else if (text.includes('petroline')) {
          lat = 24.5; lng = 43.5; location_name = 'East-West Petroline Trans-Arabian Pipeline';
        } else if (text.includes('tehran')) {
          lat = 35.6892; lng = 51.389; location_name = 'Tehran, Iran';
        } else if (text.includes('sana')) {
          lat = 15.3694; lng = 44.191; location_name = "Sana'a, Yemen";
        } else if (text.includes('aden')) {
          lat = 12.7855; lng = 45.0187; location_name = 'Aden, Yemen';
        } else if (text.includes('riyadh')) {
          lat = 24.7136; lng = 46.6753; location_name = 'Riyadh, Saudi Arabia';
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
          lat,
          lng,
          location_name,
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
  const isForce = searchParams.get('force') === 'true' || searchParams.get('sync') === 'true';

  try {
    let events = await getEvents({
      country,
      category,
      credibility_tier,
      search,
      limit: limitParam ? Math.max(limit * 4, 200) : 2500,
      offset: 0,
    });

    const newestTime = events[0]?.published_at;
    const now = Date.now();
    const isStale = !newestTime || (now - new Date(newestTime).getTime() > 10 * 60 * 1000);

    if (isForce || (isStale && (now - lastLiveSync > 2 * 60 * 1000))) {
      await syncFreshNewsIfStale(newestTime, isForce);
      // Re-fetch with fresh items included
      events = await getEvents({
        country,
        category,
        credibility_tier,
        search,
        limit: limitParam ? Math.max(limit * 4, 200) : 2500,
        offset: 0,
      });
    }

    // Ensure strict descending chronological order (most recent first)
    events.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());

    // Deduplicate by normalized alphanumeric title
    const seenTitles = new Set<string>();
    const uniqueEvents: SecurityEvent[] = [];
    for (const ev of events) {
      const norm = ev.title.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!seenTitles.has(norm)) {
        seenTitles.add(norm);
        uniqueEvents.push(ev);
      }
    }

    const pagedEvents = limitParam ? uniqueEvents.slice(0, limit) : uniqueEvents;

    return NextResponse.json(
      {
        success: true,
        count: pagedEvents.length,
        total: uniqueEvents.length,
        events: pagedEvents,
        synced_at: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    console.error('[API /api/events] Error fetching events:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve events' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
