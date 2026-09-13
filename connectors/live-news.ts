import { XMLParser } from 'fast-xml-parser';
import { Connector, RawEvent } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

export class LiveNewsConnector implements Connector {
  id = 'live-news-realtime';
  name = 'Real-Time Breaking News & Wire Aggregator';
  type = 'rss' as const;
  enabled = true;

  private queries = [
    { q: 'Houthi+Yemen+Red+Sea', country: 'Yemen' },
    { q: 'Iran+Strait+Hormuz', country: 'Iran' },
    { q: 'Saudi+Arabia+oil+pipeline+Aramco', country: 'Saudi Arabia' },
    { q: 'tanker+attack+Red+Sea+Hormuz', country: 'Yemen' },
    { q: 'Pezeshkian+Iran+Gulf+Houthis', country: 'Iran' },
  ];

  async fetchEvents(): Promise<RawEvent[]> {
    const rawEvents: RawEvent[] = [];

    const fetchPromises = this.queries.map(async ({ q, country }) => {
      try {
        const url = `https://news.google.com/rss/search?q=${q}+when:1d&hl=en-US&gl=US&ceid=US:en`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        });
        clearTimeout(timeout);

        if (!res.ok) return;

        const xml = await res.text();
        const data = parser.parse(xml);
        const items = data?.rss?.channel?.item || [];
        const list = Array.isArray(items) ? items : [items];

        for (const item of list) {
          if (!item.title || !item.pubDate) continue;

          // Clean title and source
          let title = item.title;
          let sourceName = 'Google News Wire';
          if (title.includes(' - ')) {
            const parts = title.split(' - ');
            sourceName = parts.pop()?.trim() || sourceName;
            title = parts.join(' - ').trim();
          }

          const rawDate = new Date(item.pubDate);
          if (isNaN(rawDate.getTime())) continue;

          rawEvents.push({
            title,
            summary: item.description ? item.description.replace(/<[^>]+>/g, '').trim() : title,
            source_name: sourceName,
            source_url: item.link || item.guid || 'https://news.google.com',
            published_at: rawDate.toISOString(),
            credibility_tier: 'tier_1',
            country: country as any,
          });
        }
      } catch (err) {
        console.warn(`[LiveNewsConnector] Failed query ${q}:`, err);
      }
    });

    await Promise.allSettled(fetchPromises);
    return rawEvents;
  }
}
