import { Connector, RawEvent } from './types';
import { CredibilityTier } from '../lib/types';
import sourcesConfig from '../config/sources.json';

export class GDELTConnector implements Connector {
  id = 'gdelt-api';
  name = 'GDELT Project Global Event API';
  type = 'api' as const;
  enabled = true;

  async fetchEvents(): Promise<RawEvent[]> {
    const gdeltConfig = sourcesConfig.gdelt_config;
    if (!gdeltConfig.enabled) return [];

    const url = new URL(gdeltConfig.api_base);
    url.searchParams.set('query', gdeltConfig.query);
    url.searchParams.set('mode', 'ArtList');
    url.searchParams.set('format', 'json');
    url.searchParams.set('maxrecords', String(gdeltConfig.max_records || 50));
    url.searchParams.set('sort', 'DateDesc');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MiddleEastConflictMonitor/1.0; +https://middle-east-conflict-monitor.vercel.app)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`GDELT HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.articles)) {
        return [];
      }

      return data.articles
        .map((art: any) => this.normalizeArticle(art, gdeltConfig.credibility_tier as CredibilityTier))
        .filter((ev: RawEvent | null): ev is RawEvent => ev !== null);
    } catch (err) {
      console.warn('[GDELT Connector] Query failed or timed out:', err);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeArticle(art: any, credibilityTier: CredibilityTier): RawEvent | null {
    if (!art.title || art.title.length < 10 || !art.url) return null;

    let publishedAt = new Date().toISOString();
    if (art.seendate) {
      // GDELT seendate format: YYYYMMDDTHHMMSSZ
      try {
        const dStr = art.seendate;
        if (dStr.length >= 15) {
          const formatted = `${dStr.substring(0, 4)}-${dStr.substring(4, 6)}-${dStr.substring(6, 8)}T${dStr.substring(9, 11)}:${dStr.substring(11, 13)}:${dStr.substring(13, 15)}Z`;
          publishedAt = new Date(formatted).toISOString();
        }
      } catch (e) {
        // use fallback publishedAt
      }
    }

    const domain = art.domain || 'GDELT Global News Feed';
    const sourceName = domain.replace(/^www\./, '');

    return {
      title: art.title.trim(),
      summary: art.title.trim(),
      source_name: `GDELT (${sourceName})`,
      source_url: art.url,
      published_at: publishedAt,
      credibility_tier: credibilityTier,
      snippet: art.title.trim(),
      extracted_x_urls: [],
    };
  }
}
