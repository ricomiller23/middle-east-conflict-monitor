import { XMLParser } from 'fast-xml-parser';
import { Connector, RawEvent } from './types';
import { CredibilityTier } from '../lib/types';
import sourcesConfig from '../config/sources.json';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

export class RSSConnector implements Connector {
  id = 'rss-aggregator';
  name = 'RSS Multi-Outlet News Ingestion';
  type = 'rss' as const;
  enabled = true;

  async fetchEvents(): Promise<RawEvent[]> {
    const rawEvents: RawEvent[] = [];
    const feeds = sourcesConfig.rss_sources || [];

    await Promise.allSettled(
      feeds.map(async (feed) => {
        if (!feed.enabled) return;

        try {
          const events = await this.fetchFeed(feed.name, feed.feed_url, feed.credibility_tier as CredibilityTier, feed.fallback_url);
          rawEvents.push(...events);
        } catch (err) {
          console.warn(`[RSS Connector] Error fetching ${feed.name}:`, err);
        }
      })
    );

    return rawEvents;
  }

  private async fetchFeed(
    sourceName: string,
    url: string,
    credibilityTier: CredibilityTier,
    fallbackUrl?: string
  ): Promise<RawEvent[]> {
    let xmlText = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MiddleEastConflictMonitor/1.0; +https://middle-east-conflict-monitor.vercel.app)',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      xmlText = await resp.text();
    } catch (fetchErr) {
      if (fallbackUrl) {
        try {
          const fallbackResp = await fetch(fallbackUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MiddleEastConflictMonitor/1.0)' },
            signal: AbortSignal.timeout(8000),
          });
          if (fallbackResp.ok) {
            xmlText = await fallbackResp.text();
          }
        } catch (fbErr) {
          throw fetchErr;
        }
      } else {
        throw fetchErr;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!xmlText) return [];

    const parsed = parser.parse(xmlText);
    const items = this.extractItems(parsed);

    return items
      .map((item: any) => this.normalizeItem(item, sourceName, credibilityTier))
      .filter((ev): ev is RawEvent => ev !== null);
  }

  private extractItems(parsed: any): any[] {
    if (parsed?.rss?.channel?.item) {
      return Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
    }
    if (parsed?.feed?.entry) {
      return Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
    }
    return [];
  }

  private normalizeItem(item: any, sourceName: string, credibilityTier: CredibilityTier): RawEvent | null {
    const rawTitle = item.title?.['#text'] || item.title || '';
    const title = this.cleanText(rawTitle);
    if (!title || title.length < 10) return null;

    const rawSummary =
      item.description?.['#text'] ||
      item.description ||
      item.summary?.['#text'] ||
      item.summary ||
      item['content:encoded']?.['#text'] ||
      item['content:encoded'] ||
      '';
    const summary = this.cleanText(rawSummary).slice(0, 450);

    const rawLink =
      typeof item.link === 'string'
        ? item.link
        : item.link?.['@_href'] || item.link?.['#text'] || item.guid?.['#text'] || item.guid || '';
    const sourceUrl = typeof rawLink === 'string' ? rawLink.trim() : '';

    const rawDate = item.pubDate || item.published || item.updated || item['dc:date'];
    let publishedAt = new Date().toISOString();
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed.toISOString();
      }
    }

    // Extract any referenced X / Twitter status links
    const combinedContent = `${rawTitle} ${rawSummary} ${item['content:encoded'] || ''}`;
    const extractedXUrls = this.extractXCitations(combinedContent);

    return {
      title,
      summary: summary || title,
      source_name: sourceName,
      source_url: sourceUrl,
      published_at: publishedAt,
      credibility_tier: credibilityTier,
      extracted_x_urls: extractedXUrls,
      snippet: summary ? summary.slice(0, 200) : title,
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

  private extractXCitations(text: string): string[] {
    if (!text) return [];
    const tweetRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,25})\/status\/(\d+)/gi;
    const matches: string[] = [];
    let match;
    while ((match = tweetRegex.exec(text)) !== null) {
      matches.push(match[0]);
    }
    return Array.from(new Set(matches));
  }
}
