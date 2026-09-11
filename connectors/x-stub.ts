import { Connector, RawEvent } from './types';
import { CredibilityTier } from '../lib/types';
import sourcesConfig from '../config/sources.json';

export interface XCitationMetadata {
  url: string;
  handle: string;
  is_allowlisted: boolean;
  credibility_tier: CredibilityTier;
  entity_name: string;
}

/**
 * Isolated Social Media / X Connector Stub
 *
 * NOTE: X (Twitter) live search API requires a paid enterprise/developer Basic subscription ($100+/mo).
 * Personal X Premium subscriptions do not grant automated programmatic search access.
 *
 * To avoid breaking ingestion, this connector operates in passive citation mode:
 * 1. It extracts referenced tweet URLs embedded inside ingested articles and RSS feeds.
 * 2. It verifies the cited handle against our strict allowlist in config/sources.json.
 * 3. It provides an isolated upgrade point: to enable live API polling in the future,
 *    set `enableLivePolling = true` and populate `X_BEARER_TOKEN` in your environment.
 */
export class XStubConnector implements Connector {
  id = 'x-social-stub';
  name = 'Verified OSINT Allowlist & Citation Resolver';
  type = 'social_stub' as const;
  enabled = true;

  // Toggle for future live API subscription
  private enableLivePolling = false;

  async fetchEvents(): Promise<RawEvent[]> {
    if (!this.enableLivePolling) {
      // Passive citation mode: Live polling is safely disabled.
      return [];
    }

    // Future implementation:
    // const token = process.env.X_BEARER_TOKEN;
    // if (!token) return [];
    // ... query /2/tweets/search/recent with allowlisted handles
    return [];
  }

  /**
   * Matches any X/Twitter URL against the verified allowlist.
   */
  static parseCitation(url: string): XCitationMetadata | null {
    const match = url.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,25})(?:\/status\/\d+)?/i);
    if (!match) return null;

    const handle = match[1].toLowerCase();
    const allowlist = sourcesConfig.social_allowlist || [];
    const matchedEntity = allowlist.find((item) => item.handle.toLowerCase() === handle);

    if (matchedEntity) {
      return {
        url,
        handle: matchedEntity.handle,
        is_allowlisted: true,
        credibility_tier: matchedEntity.credibility_tier as CredibilityTier,
        entity_name: matchedEntity.name,
      };
    }

    return {
      url,
      handle: match[1],
      is_allowlisted: false,
      credibility_tier: 'tier_3',
      entity_name: `@${match[1]}`,
    };
  }

  /**
   * Extracts and validates all X citation links within an article's text.
   */
  static extractVerifiedCitations(text: string): XCitationMetadata[] {
    if (!text) return [];
    const regex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,25})\/status\/(\d+)/gi;
    const foundUrls: string[] = [];
    let m;
    while ((m = regex.exec(text)) !== null) {
      foundUrls.push(m[0]);
    }

    const uniqueUrls = Array.from(new Set(foundUrls));
    const results: XCitationMetadata[] = [];

    for (const u of uniqueUrls) {
      const parsed = this.parseCitation(u);
      if (parsed) {
        results.push(parsed);
      }
    }

    return results;
  }
}
