export type Country = 'Saudi Arabia' | 'Yemen' | 'Iran';

export type EventCategory =
  | 'military'
  | 'strike'
  | 'diplomatic'
  | 'statement'
  | 'tanker_attack'
  | 'pipeline_infrastructure'
  | 'energy_market'
  | 'refinery_disruption'
  | 'other';

export type CredibilityTier = 'tier_1' | 'tier_2' | 'tier_3';

export type OilMarketImpact = 'critical' | 'high' | 'moderate' | 'low' | 'neutral';

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
  oil_market_impact?: OilMarketImpact;
  affected_infrastructure?: string[];
  vessel_name?: string | null;
  barrel_risk_estimate?: string | null;
  audio_url?: string | null;
  podcast_duration?: string | null;
  is_podcast_analysis?: boolean;
  synopsis?: string | null;
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
  brent_crude_usd?: number;
  wti_crude_usd?: number;
  maritime_war_risk_level?: string;
  tanker_reroute_pct?: number;
}

