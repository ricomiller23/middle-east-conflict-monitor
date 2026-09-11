import { Country, EventCategory, CredibilityTier } from '../lib/types';

export interface RawEvent {
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_at: string;
  credibility_tier: CredibilityTier;
  country?: Country | null;
  category?: EventCategory;
  lat?: number | null;
  lng?: number | null;
  location_name?: string | null;
  snippet?: string;
  extracted_x_urls?: string[];
  author_handle?: string;
  keywords?: string[];
  audio_url?: string | null;
  podcast_duration?: string | null;
  is_podcast_analysis?: boolean;
  synopsis?: string | null;
}

export interface Connector {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'social_stub';
  enabled: boolean;
  fetchEvents(): Promise<RawEvent[]>;
}
