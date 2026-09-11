import { XMLParser } from 'fast-xml-parser';
import { Connector, RawEvent } from './types';
import { Country, EventCategory } from '../lib/types';
import sourcesConfig from '../config/sources.json';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

export class WarfrontsConnector implements Connector {
  id = 'warfronts-podcast';
  name = "Warfronts Podcast (Simon Whistler)";
  type = 'rss' as const;
  enabled = true;

  private feedUrl = 'https://feeds.megaphone.fm/warfronts';

  async fetchEvents(): Promise<RawEvent[]> {
    const rawEvents: RawEvent[] = [];

    try {
      const resp = await fetch(this.feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MiddleEastConflictMonitor/1.0; +https://middle-east-conflict-monitor.vercel.app)',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} while fetching Warfronts feed`);
      }

      const xmlText = await resp.text();
      if (!xmlText) return [];

      const parsed = parser.parse(xmlText);
      const items = this.extractItems(parsed);

      for (const item of items) {
        const normalized = this.normalizeEpisode(item);
        if (normalized) {
          rawEvents.push(normalized);
        }
      }
    } catch (err) {
      console.warn('[Warfronts Connector] Error fetching or parsing feed:', err);
    }

    return rawEvents;
  }

  private extractItems(parsed: any): any[] {
    if (parsed?.rss?.channel?.item) {
      return Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
    }
    return [];
  }

  private normalizeEpisode(item: any): RawEvent | null {
    const rawTitle = item.title?.['#text'] || item.title || '';
    const title = this.cleanText(rawTitle);
    if (!title || title.length < 5) return null;

    const rawDescription =
      item.description?.['#text'] ||
      item.description ||
      item['itunes:summary']?.['#text'] ||
      item['itunes:summary'] ||
      item['content:encoded']?.['#text'] ||
      item['content:encoded'] ||
      '';

    const synopsis = this.cleanSynopsis(rawDescription);
    const combinedText = `${title} ${synopsis}`.toLowerCase();

    // Strict Middle East Conflict Scope Filter (Saudi Arabia, Yemen, Iran + Red Sea / Hormuz)
    const yemenMatch = combinedText.match(/yemen|houthi|sana'?a|hodeidah|aden|bab al-mandeb|red sea/);
    const saudiMatch = combinedText.match(/saudi|riyadh|aramco|petroline|abqaiq|yanbu|jizan/);
    const iranMatch = combinedText.match(/iran|tehran|irgc|strait of hormuz|persian gulf|kharg/);

    if (!yemenMatch && !saudiMatch && !iranMatch) {
      // Not relevant to the Saudi Arabia / Yemen / Iran theater
      return null;
    }

    let country: Country = 'Yemen';
    if (yemenMatch) {
      country = 'Yemen';
    } else if (saudiMatch) {
      country = 'Saudi Arabia';
    } else if (iranMatch) {
      country = 'Iran';
    }

    // Determine category
    let category: EventCategory = 'military';
    if (combinedText.match(/tanker|ship|carrier|maritime|boat|vessel|boarding/)) {
      category = 'tanker_attack';
    } else if (combinedText.match(/oil|sanction|economy|crude|barrel|pipeline/)) {
      category = 'energy_market';
    } else if (combinedText.match(/strike|missile|drone|bomb|offensive|invad|attack/)) {
      category = 'strike';
    } else if (combinedText.match(/diplomat|treaty|negotiat|accord/)) {
      category = 'diplomatic';
    }

    // Audio Enclosure URL
    let audioUrl: string | null = null;
    if (item.enclosure?.['@_url']) {
      audioUrl = item.enclosure['@_url'];
    } else if (item.enclosure?.url) {
      audioUrl = item.enclosure.url;
    }

    // Duration formatting (seconds to MMm SSs or HH:MM)
    const rawDuration = item['itunes:duration']?.['#text'] || item['itunes:duration'] || '';
    const formattedDuration = this.formatDuration(rawDuration);

    // Publication Date
    const rawDate = item.pubDate || item.published;
    let publishedAt = new Date().toISOString();
    if (rawDate) {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate.toISOString();
      }
    }

    // Link
    const rawLink =
      typeof item.link === 'string'
        ? item.link
        : item.link?.['@_href'] || item.link?.['#text'] || audioUrl || 'https://feeds.megaphone.fm/warfronts';

    return {
      title,
      summary: synopsis || title,
      synopsis,
      source_name: 'Warfronts (Simon Whistler)',
      source_url: typeof rawLink === 'string' ? rawLink.trim() : 'https://feeds.megaphone.fm/warfronts',
      published_at: publishedAt,
      credibility_tier: 'tier_2',
      country,
      category,
      audio_url: audioUrl,
      podcast_duration: formattedDuration,
      is_podcast_analysis: true,
      snippet: `Simon Whistler analyzes: ${synopsis.slice(0, 180)}...`,
      keywords: ['Warfronts', 'Simon Whistler', 'Podcast', country, category],
    };
  }

  private cleanSynopsis(text: string): string {
    if (!text) return '';
    let cleaned = text
      .replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"');

    // Strip Megaphone / podcast ad choices boilerplate
    cleaned = cleaned
      .replace(/Learn more about your ad choices[\s\S]*$/i, '')
      .replace(/Visit megaphone\.fm\/adchoices[\s\S]*$/i, '')
      .replace(/To advertise on this podcast[\s\S]*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  private cleanText(str: string): string {
    if (!str) return '';
    return str
      .replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatDuration(duration: string | number): string {
    if (!duration) return '';
    const num = Number(duration);
    if (!isNaN(num) && num > 0) {
      const minutes = Math.floor(num / 60);
      const seconds = Math.floor(num % 60);
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remMins = minutes % 60;
        return `${hours}h ${remMins}m`;
      }
      return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    }

    // Already in HH:MM:SS or MM:SS format
    if (typeof duration === 'string' && duration.includes(':')) {
      return duration.trim();
    }

    return String(duration);
  }
}
