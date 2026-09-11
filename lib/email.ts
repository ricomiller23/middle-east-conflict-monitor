import { Resend } from 'resend';
import { SecurityEvent, Country } from './types';

export async function sendEmailDigest(events: SecurityEvent[]): Promise<{ success: boolean; id?: string; simulated?: boolean }> {
  if (!events || events.length === 0) {
    console.log('[Email Digest] No events to send. Suppressing empty digest.');
    return { success: true };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.DIGEST_RECIPIENT_EMAIL || 'analyst@example.com';
  const sender = process.env.DIGEST_SENDER_EMAIL || 'Middle East Monitor <onboarding@resend.dev>';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://middle-east-conflict-monitor.vercel.app';

  // Group events by country
  const grouped: Record<Country, SecurityEvent[]> = {
    'Saudi Arabia': [],
    'Yemen': [],
    'Iran': [],
  };

  for (const ev of events) {
    if (grouped[ev.country]) {
      grouped[ev.country].push(ev);
    }
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const htmlContent = buildDigestHtml(grouped, dateStr, appUrl, events.length);

  // If no API key or placeholder key, simulate delivery gracefully
  if (!apiKey || apiKey.startsWith('re_placeholder') || apiKey.length < 15) {
    console.log(
      `[Email Digest - Simulation] Resend API key is not configured or placeholder. Simulating email dispatch of ${events.length} events to ${recipient}.`
    );
    return { success: true, simulated: true };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: sender,
      to: recipient,
      subject: `🚨 [OSINT Digest] ${events.length} New Security Event${events.length > 1 ? 's' : ''} (Saudi Arabia / Yemen / Iran) - ${dateStr}`,
      html: htmlContent,
    });

    if (result.error) {
      console.error('[Email Digest] Resend returned error:', result.error);
      return { success: false };
    }

    console.log(`[Email Digest] Sent successfully via Resend. Message ID: ${result.data?.id}`);
    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error('[Email Digest] Exception during Resend dispatch:', err);
    return { success: false };
  }
}

function buildDigestHtml(
  grouped: Record<Country, SecurityEvent[]>,
  dateStr: string,
  appUrl: string,
  totalCount: number
): string {
  const pauseUrl = `${appUrl}/api/digest/pause?action=pause`;

  const renderEventItem = (ev: SecurityEvent) => {
    const tierColor = ev.credibility_tier === 'tier_1' ? '#10b981' : '#f59e0b';
    const tierLabel = ev.credibility_tier === 'tier_1' ? 'VERIFIED (TIER 1)' : 'ANALYST (TIER 2)';
    const categoryBadge = ev.category.toUpperCase();

    const sourcesHtml = ev.sources
      .map(
        (s) =>
          `<a href="${s.source_url}" target="_blank" style="color: #38bdf8; text-decoration: none; margin-right: 12px; font-size: 12px; font-weight: 500;">↗ ${s.source_name}</a>`
      )
      .join(' ');

    const citationsHtml =
      ev.x_citations && ev.x_citations.length > 0
        ? `<div style="margin-top: 6px;">
            ${ev.x_citations
              .map(
                (xUrl) =>
                  `<a href="${xUrl}" target="_blank" style="display: inline-block; background-color: #1e293b; color: #94a3b8; font-size: 11px; padding: 2px 8px; border-radius: 4px; text-decoration: none; margin-right: 6px;">𝕏 Citation</a>`
              )
              .join(' ')}
          </div>`
        : '';

    return `
      <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="margin-bottom: 8px;">
          <span style="background-color: ${tierColor}20; color: ${tierColor}; border: 1px solid ${tierColor}50; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px;">${tierLabel}</span>
          <span style="background-color: #334155; color: #cbd5e1; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px; letter-spacing: 0.5px;">${categoryBadge}</span>
          ${ev.location_name ? `<span style="color: #64748b; font-size: 11px; margin-left: 8px;">📍 ${ev.location_name}</span>` : ''}
        </div>
        <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #f8fafc; line-height: 1.4;">
          <a href="${ev.primary_url}" target="_blank" style="color: #f8fafc; text-decoration: none;">${ev.title}</a>
        </h3>
        <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">${ev.summary}</p>
        <div style="border-top: 1px solid #1e293b; padding-top: 8px;">
          <span style="color: #64748b; font-size: 12px; margin-right: 8px;">Sources:</span>
          ${sourcesHtml}
          ${citationsHtml}
        </div>
      </div>
    `;
  };

  const renderCountrySection = (country: Country, flag: string) => {
    const list = grouped[country];
    if (list.length === 0) return '';

    return `
      <div style="margin-top: 24px;">
        <div style="display: flex; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #38bdf8; letter-spacing: 0.5px;">
            ${flag} ${country.toUpperCase()} <span style="font-size: 13px; color: #64748b; font-weight: normal;">(${list.length} new)</span>
          </h2>
        </div>
        ${list.map(renderEventItem).join('')}
      </div>
    `;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Middle East Security Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <div style="max-width: 680px; margin: 0 auto; padding: 24px 16px;">
    <!-- Header -->
    <div style="background-color: #0d1424; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; text-align: left;">
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="display: inline-block; width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; margin-right: 8px;"></span>
        <span style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #10b981; text-transform: uppercase;">DEFENSE INTELLIGENCE AUTOMATION</span>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px;">
        Middle East Conflict & Security Digest
      </h1>
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">
        Target Theater: <strong>Saudi Arabia / Yemen / Iran</strong> • Dispatched: <strong>${dateStr}</strong>
      </p>
      <div style="margin-top: 14px; display: inline-block; background-color: #1e293b; border-radius: 6px; padding: 6px 12px; font-size: 12px; color: #38bdf8; font-weight: 600;">
        ⚡ ${totalCount} New Verified Incident${totalCount > 1 ? 's' : ''} Detected
      </div>
    </div>

    <!-- Country Sections -->
    ${renderCountrySection('Yemen', '🇾🇪')}
    ${renderCountrySection('Saudi Arabia', '🇸🇦')}
    ${renderCountrySection('Iran', '🇮🇷')}

    <!-- Footer & Unsubscribe/Pause -->
    <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b;">
      <p style="margin: 0 0 8px 0;">
        This automated intelligence brief was compiled by <a href="${appUrl}" target="_blank" style="color: #38bdf8; text-decoration: none;">Middle East Conflict Monitor</a>.
      </p>
      <p style="margin: 0 0 16px 0;">
        Ingestion Frequency: Every 6 Hours • Connectors: RSS Feeds, GDELT 2.0, OSINT Allowlist.
      </p>
      <p style="margin: 0;">
        <a href="${appUrl}" target="_blank" style="color: #94a3b8; text-decoration: underline; margin-right: 16px;">Open Live Tactical Dashboard</a>
        <a href="${pauseUrl}" target="_blank" style="color: #f43f5e; text-decoration: underline;">Pause / Unsubscribe from Digests</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
