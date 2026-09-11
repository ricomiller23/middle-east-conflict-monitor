export type Country = 'Saudi Arabia' | 'Yemen' | 'Iran';

export type EventCategory = 'military' | 'strike' | 'diplomatic' | 'statement' | 'other';

export type CredibilityTier = 'tier_1' | 'tier_2' | 'tier_3';

export interface EventSource {
  id?: string;
  event_id?: string;
  source_name: string;
  source_url: string;
  published_at: string;
  credibility_tier: CredibilityTier;
  snippet?: string;
  x_citation_url?: string;
  author_handle?: string;
}

export interface SecurityEvent {
  id: string;
  title: string;
  summary: string;
  country: Country;
  category: EventCategory;
  primary_source: string;
  primary_url: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  credibility_tier: CredibilityTier;
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  sources: EventSource[];
  x_citations: string[];
  is_verified: boolean;
  raw_keywords: string[];
}

export interface IngestionLog {
  id: string;
  timestamp: string;
  connector_name: string;
  status: 'success' | 'warning' | 'error';
  events_fetched: number;
  events_ingested: number;
  duration_ms: number;
  error_message?: string | null;
}

export interface SystemSettings {
  digest_paused: boolean;
  last_digest_sent_at: string | null;
  last_ingestion_at: string | null;
  auto_ingest_enabled: boolean;
  total_events_tracked: number;
}
