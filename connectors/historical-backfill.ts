import { XMLParser } from 'fast-xml-parser';
import { Connector, RawEvent } from './types';
import { CredibilityTier } from '../lib/types';
import { WarfrontsConnector } from './warfronts';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

export interface MonthlyWindow {
  label: string;
  startDate: string;
  endDate: string;
}

export class HistoricalBackfillConnector implements Connector {
  id = 'historical-6month-backfill';
  name = '6-Month Historical Intelligence Backfill';
  type = 'rss' as const;
  enabled = true;

  // Monthly date windows spanning the past 6 months
  private windows: MonthlyWindow[] = [
    { label: 'September 2026', startDate: '2026-09-01', endDate: '2026-09-12' },
    { label: 'August 2026', startDate: '2026-08-01', endDate: '2026-09-01' },
    { label: 'July 2026', startDate: '2026-07-01', endDate: '2026-08-01' },
    { label: 'June 2026', startDate: '2026-06-01', endDate: '2026-07-01' },
    { label: 'May 2026', startDate: '2026-05-01', endDate: '2026-06-01' },
    { label: 'April 2026', startDate: '2026-04-01', endDate: '2026-05-01' },
    { label: 'March 2026', startDate: '2026-03-01', endDate: '2026-04-01' },
  ];

  async fetchEvents(): Promise<RawEvent[]> {
    const rawEvents: RawEvent[] = [];
    console.log('[Historical Backfill] Commencing 6-month historical intelligence sweep...');

    // 1. Fetch historical Warfronts podcast episodes (covers all 6 months)
    try {
      const warfronts = new WarfrontsConnector();
      const podcastEvents = await warfronts.fetchEvents();
      // Filter strictly within the 6-month window (March 1, 2026 - September 12, 2026)
      const sixMonthStart = new Date('2026-03-01T00:00:00Z').getTime();
      const sixMonthEnd = new Date('2026-09-12T23:59:59Z').getTime();

      const filteredPodcasts = podcastEvents.filter((ev) => {
        const time = new Date(ev.published_at).getTime();
        return time >= sixMonthStart && time <= sixMonthEnd;
      });

      console.log(`[Historical Backfill] Ingested ${filteredPodcasts.length} Warfronts podcast episodes from 6-month window.`);
      rawEvents.push(...filteredPodcasts);
    } catch (podErr) {
      console.warn('[Historical Backfill] Error fetching historical Warfronts episodes:', podErr);
    }

    // 2. Fetch monthly historical news archives across conflict, tanker attacks, and energy markets
    for (const win of this.windows) {
      try {
        const monthlyEvents = await this.fetchMonthWindow(win);
        console.log(`[Historical Backfill] ${win.label}: Retrieved ${monthlyEvents.length} raw events.`);
        rawEvents.push(...monthlyEvents);
      } catch (winErr) {
        console.warn(`[Historical Backfill] Failed to retrieve window ${win.label}:`, winErr);
      }
    }

    console.log(`[Historical Backfill] 6-month sweep completed. Total raw events aggregated: ${rawEvents.length}`);
    return rawEvents;
  }

  private async fetchMonthWindow(win: MonthlyWindow): Promise<RawEvent[]> {
    const queries = [
      // Query A: Kinetic & Military strikes
      `(Saudi Arabia OR Yemen OR Iran OR Houthi OR IRGC) AND (strike OR missile OR drone OR intercept OR attack OR raid) after:${win.startDate} before:${win.endDate}`,
      // Query B: Maritime Tanker Attacks & Chokepoint Security
      `(tanker OR vessel OR "Red Sea" OR "Bab al-Mandeb" OR "Strait of Hormuz" OR UKMTO OR Ambrey) AND (Yemen OR Iran OR Saudi) after:${win.startDate} before:${win.endDate}`,
      // Query C: Energy Logistics, Petroline, Crude Markets & Refineries
      `(Petroline OR Aramco OR "crude oil" OR refinery OR "Ras Tanura" OR "Kharg Island" OR Yanbu OR Abqaiq) AND (Saudi OR Iran OR Yemen) after:${win.startDate} before:${win.endDate}`,
    ];

    const results: RawEvent[] = [];

    for (const q of queries) {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MiddleEastConflictMonitor/1.0; +https://middle-east-conflict-monitor.vercel.app)',
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!resp.ok) continue;

        const xmlText = await resp.text();
        if (!xmlText) continue;

        const parsed = parser.parse(xmlText);
        const items = this.extractItems(parsed);

        for (const it of items) {
          const raw = this.normalizeItem(it, win);
          if (raw) results.push(raw);
        }
      } catch (err) {
        // Continue to next query if one query times out
      }
    }

    return results;
  }

  private extractItems(parsed: any): any[] {
    if (parsed?.rss?.channel?.item) {
      return Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
    }
    return [];
  }

  private normalizeItem(item: any, win: MonthlyWindow): RawEvent | null {
    const rawTitle = item.title?.['#text'] || item.title || '';
    const title = this.cleanText(rawTitle);
    if (!title || title.length < 12) return null;

    // Extract outlet name from title suffix (e.g. "Title - Reuters")
    let sourceName = 'Global Defense Wire';
    let cleanHeadline = title;
    const hyphenIdx = title.lastIndexOf(' - ');
    if (hyphenIdx > 20) {
      sourceName = title.slice(hyphenIdx + 3).trim();
      cleanHeadline = title.slice(0, hyphenIdx).trim();
    }

    const rawSummary = item.description?.['#text'] || item.description || item.summary?.['#text'] || item.summary || '';
    const summary = this.cleanText(rawSummary).slice(0, 450) || cleanHeadline;

    const sourceUrl = typeof item.link === 'string' ? item.link.trim() : item.link?.['#text'] || '';

    // Extract pubDate, ensuring it falls within the monthly window
    const rawDate = item.pubDate || item.published;
    let publishedAt = new Date(win.startDate).toISOString();
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed.toISOString();
      }
    }

    // Determine credibility tier based on primary outlets
    let credibilityTier: CredibilityTier = 'tier_2';
    const lowerSource = sourceName.toLowerCase();
    if (
      lowerSource.includes('reuters') ||
      lowerSource.includes('ap') ||
      lowerSource.includes('associated press') ||
      lowerSource.includes('afp') ||
      lowerSource.includes('al jazeera') ||
      lowerSource.includes('bloomberg') ||
      lowerSource.includes('csis') ||
      lowerSource.includes('ukmto')
    ) {
      credibilityTier = 'tier_1';
    }

    return {
      title: cleanHeadline,
      summary,
      source_name: sourceName,
      source_url: sourceUrl,
      published_at: publishedAt,
      credibility_tier: credibilityTier,
      snippet: summary ? summary.slice(0, 200) : cleanHeadline,
    };
  }

  private cleanText(str: string): string {
    if (!str) return '';
    return str
      .replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
