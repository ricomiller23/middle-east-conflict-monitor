# Middle East Conflict Monitor 🛡️
### Saudi Arabia • Yemen • Iran Military & Security Intelligence Aggregator

A full-stack OSINT and news aggregation dashboard tracking defense, naval, missile, and security events across Saudi Arabia, Yemen, and Iran. The platform ingests multi-outlet reporting on a 6-hour cron schedule, geotags and deduplicates incidents into unified cards with multiple source citations, stores events in PostgreSQL with native `tsvector` full-text search, renders a high-density security-ops interface (Feed, Timeline, and Tactical Map views), and dispatches automated HTML intelligence digests via Resend.

---

## ⚡ Key Features

- **Multi-Source Connectors**: Pluggable connectors for RSS news (Reuters, AP, Al Jazeera, Middle East Eye, ISW, Yemen Monitor, AFP), GDELT 2.0 API, and verified OSINT allowlists.
- **Deduplication Engine**: Automatically identifies identical reports across multiple agencies using title similarity and temporal clustering, collapsing them into unified cards with merged citations.
- **Geotagged Tactical Map**: Visual interactive map centered on the Arabian Peninsula, Red Sea corridor, Bab al-Mandab, Persian Gulf, and Strait of Hormuz.
- **PostgreSQL Full-Text Search**: Powered by native `tsvector` and GIN index for sub-millisecond keyword and entity queries.
- **Vercel Cron Automation**: Runs automatically 4x/day (`0 */6 * * *`) hitting `/api/cron/ingest` protected by a high-entropy `CRON_SECRET` Bearer token.
- **Email Digest via Resend**: Beautiful, responsive HTML email grouped by country dispatched after each run whenever new incidents are detected.
- **Admin Ops Center (`/admin`)**: Protected operations console to trigger manual runs, inspect live connector execution logs, pause/resume email digests, and audit the source allowlist.

---

## 🚀 Environment Variables

Copy `.env.example` to `.env.local` for local development. **Never commit real keys or secrets to git.**

```bash
# Database Configuration (Vercel Postgres, Supabase, or Neon)
POSTGRES_URL=postgres://username:password@ep-example.region.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=postgres://username:password@ep-example.region.aws.neon.tech/neondb?sslmode=require

# Vercel Cron Security Secret (Bearer token for /api/cron/ingest)
CRON_SECRET=06724c8f8f6f89f4e72b375d849ca83f0ce603f9f4e5cd1b682decf27bc0cfa1

# Resend API Configuration for Email Digests
RESEND_API_KEY=re_your_api_key_here

# Digest Recipients
DIGEST_RECIPIENT_EMAIL=your-email@domain.com
DIGEST_SENDER_EMAIL=alerts@yourdomain.com

# Admin Portal Protection
ADMIN_PASSWORD=your_secure_admin_password

# Public Web URL
NEXT_PUBLIC_APP_URL=https://middle-east-conflict-monitor.vercel.app
```

---

## ✉️ Resend Email Setup Guide

If you do not have an existing Resend account:
1. Navigate to [resend.com](https://resend.com) and create a free account (includes 3,000 emails/month free).
2. Go to **API Keys** → click **Create API Key**. Name it `Middle East Monitor` and copy the generated key (`re_...`).
3. Set `RESEND_API_KEY` in your Vercel Project Settings (Environment Variables).
4. Set `DIGEST_RECIPIENT_EMAIL` to the email address where you want to receive alerts.
5. In development, you can send test emails using `onboarding@resend.dev` as `DIGEST_SENDER_EMAIL`. For production, verify your custom domain in Resend DNS settings.

---

## 🔌 How to Add a New Source Connector

All connectors implement the standardized `Connector` interface located in [`connectors/types.ts`](connectors/types.ts):

```typescript
export interface Connector {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'social_stub';
  enabled: boolean;
  fetchEvents(): Promise<RawEvent[]>;
}
```

### Steps:
1. Create a new file in `connectors/` (e.g. `connectors/telegram.ts`).
2. Implement the `Connector` interface, mapping items to `RawEvent` (title, summary, source_name, source_url, published_at, credibility_tier).
3. Import and register your connector in [`lib/ingestion.ts`](lib/ingestion.ts):
   ```typescript
   const connectors: Connector[] = [
     new RSSConnector(),
     new GDELTConnector(),
     new TelegramConnector(), // <-- add here
   ];
   ```
4. If it is an RSS source, you can simply add it to [`config/sources.json`](config/sources.json) under `"rss_sources"` without writing code!

---

## ⏱️ How to Change the Cron Schedule

The ingestion cron is configured in [`vercel.json`](vercel.json):

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- **Every 6 hours (Default)**: `0 */6 * * *`
- **Every 3 hours**: `0 */3 * * *`
- **Once daily at 08:00 UTC**: `0 8 * * *`
- **Twice daily (08:00 and 20:00 UTC)**: `0 8,20 * * *`

After updating `vercel.json`, deploy or push to GitHub to apply the schedule on Vercel Pro.

---

## 𝕏 Upgrading the X / Twitter Connector

The platform uses an isolated module at [`connectors/x-stub.ts`](connectors/x-stub.ts):
- **Current Mode (Passive Citations)**: Ingested articles referencing X/Twitter posts extract citation badges on event cards and match handles against the verified allowlist in `config/sources.json`.
- **To Enable Live X Polling**:
  1. Acquire an X API Developer account (Basic tier or above).
  2. Add `X_BEARER_TOKEN` to `.env.local` and Vercel Environment Variables.
  3. Open `connectors/x-stub.ts`, set `private enableLivePolling = true;`, and uncomment the direct endpoint fetch:
     ```typescript
     const resp = await fetch('https://api.twitter.com/2/tweets/search/recent?query=...', {
       headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` }
     });
     ```
  4. The rest of the pipeline (geotagging, deduplication, email digest, UI) will automatically handle the streamed tweets without any other code changes.

---

## 🔒 Security & Pre-Commit Verification

Before any commit or deployment:
- Verify `.gitignore` excludes all `.env*` files except `.env.example`.
- Run secret scanner: `grep -rE "sk-|re_[a-zA-Z0-9]{20,}|postgres://.*:.*@" .`
- Ensure `CRON_SECRET` is a 64-character random hex string.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production build validation
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the live dashboard.
