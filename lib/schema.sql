-- PostgreSQL Schema for Middle East Conflict Monitor

CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(128) PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    country VARCHAR(64) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'military',
    primary_source VARCHAR(128) NOT NULL,
    primary_url TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    credibility_tier VARCHAR(16) NOT NULL DEFAULT 'tier_1',
    lat NUMERIC(9, 6),
    lng NUMERIC(9, 6),
    location_name VARCHAR(128),
    x_citations JSONB DEFAULT '[]'::jsonb,
    is_verified BOOLEAN DEFAULT TRUE,
    oil_market_impact VARCHAR(32) DEFAULT 'neutral',
    affected_infrastructure JSONB DEFAULT '[]'::jsonb,
    vessel_name VARCHAR(128),
    barrel_risk_estimate VARCHAR(128),
    tsv TSVECTOR
);

CREATE TABLE IF NOT EXISTS event_sources (
    id VARCHAR(128) PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    source_name VARCHAR(128) NOT NULL,
    source_url TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    credibility_tier VARCHAR(16) NOT NULL,
    snippet TEXT,
    x_citation_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingestion_logs (
    id VARCHAR(128) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    connector_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    events_fetched INTEGER NOT NULL DEFAULT 0,
    events_ingested INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_events_tsv ON events USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
CREATE INDEX IF NOT EXISTS idx_events_published_at ON events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_event_sources_event_id ON event_sources(event_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_timestamp ON ingestion_logs(timestamp DESC);

-- Automatic tsvector update trigger function
CREATE OR REPLACE FUNCTION events_tsv_trigger() RETURNS trigger AS $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.location_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.vessel_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.category, '')), 'B');
  return new;
end
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_tsv ON events;
CREATE TRIGGER trg_events_tsv BEFORE INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION events_tsv_trigger();

-- Initial default settings
INSERT INTO settings (key, value)
VALUES ('digest_settings', '{"digest_paused": false, "last_digest_sent_at": null, "auto_ingest_enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
