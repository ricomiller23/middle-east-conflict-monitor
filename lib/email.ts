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

  // Extract high-impact energy and tanker incidents for the top briefing banner
  const energyEvents = events.filter(
    (ev) =>
      ['tanker_attack', 'pipeline_infrastructure', 'energy_market', 'refinery_disruption'].includes(ev.category) ||
      ['critical', 'high', 'moderate'].includes(ev.oil_market_impact || '')
  );

  const htmlContent = buildDigestHtml(grouped, energyEvents, dateStr, appUrl, events.length);

  // If no API key or placeholder key, simulate delivery gracefully
  if (!apiKey || apiKey.startsWith('re_placeholder') || apiKey.length < 15) {
    console.log(
      `[Email Digest - Simulation] Resend API key is not configured or placeholder. Simulating email dispatch of ${events.length} events (${energyEvents.length} energy/tanker impacts) to ${recipient}.`
    );
    return { success: true, simulated: true };
  }

  try {
    const resend = new Resend(apiKey);
    const energySubjectTag = energyEvents.some((e) => e.oil_market_impact === 'critical' || e.oil_market_impact === 'high')
      ? ' 🛢️ CRITICAL ENERGY ALERT'
      : '';
    const result = await resend.emails.send({
      from: sender,
      to: recipient,
      subject: `🚨 [OSINT Digest]${energySubjectTag} ${events.length} New Security Event${events.length > 1 ? 's' : ''} - ${dateStr}`,
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
  energyEvents: SecurityEvent[],
  dateStr: string,
  appUrl: string,
  totalCount: number
): string {
  const pauseUrl = `${appUrl}/api/digest/pause?action=pause`;

  const renderEventItem = (ev: SecurityEvent) => {
    const tierColor = ev.credibility_tier === 'tier_1' ? '#10b981' : '#f59e0b';
    const tierLabel = ev.credibility_tier === 'tier_1' ? 'VERIFIED (TIER 1)' : 'ANALYST (TIER 2)';
    const categoryBadge = ev.category.replace('_', ' ').toUpperCase();

    // Oil Impact Badge
    let oilImpactBadge = '';
    if (ev.oil_market_impact && ev.oil_market_impact !== 'neutral' && ev.oil_market_impact !== 'low') {
      const impactColor = ev.oil_market_impact === 'critical' ? '#ef4444' : ev.oil_market_impact === 'high' ? '#f97316' : '#eab308';
      oilImpactBadge = `<span style="background-color: ${impactColor}20; color: ${impactColor}; border: 1px solid ${impactColor}50; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 6px; letter-spacing: 0.5px;">🛢️ ${ev.oil_market_impact.toUpperCase()} OIL IMPACT</span>`;
    }

    // Energy / Maritime Metadata
    let energyDetailsHtml = '';
    if (ev.vessel_name || ev.affected_infrastructure || ev.barrel_risk_estimate) {
      energyDetailsHtml = `
        <div style="margin: 8px 0; padding: 8px 12px; background-color: #1a2234; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 12px;">
          ${ev.vessel_name ? `<div style="color: #f8fafc;"><strong>Vessel / Target:</strong> ${ev.vessel_name}</div>` : ''}
          ${ev.affected_infrastructure ? `<div style="color: #cbd5e1;"><strong>Affected Asset:</strong> ${ev.affected_infrastructure}</div>` : ''}
          ${ev.barrel_risk_estimate ? `<div style="color: #fde047;"><strong>Supply Exposure:</strong> ${ev.barrel_risk_estimate}</div>` : ''}
        </div>
      `;
    }

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
          ${oilImpactBadge}
          ${ev.location_name ? `<span style="color: #64748b; font-size: 11px; margin-left: 8px;">📍 ${ev.location_name}</span>` : ''}
        </div>
        <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #f8fafc; line-height: 1.4;">
          <a href="${ev.primary_url}" target="_blank" style="color: #f8fafc; text-decoration: none;">${ev.title}</a>
        </h3>
        <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">${ev.summary}</p>
        ${energyDetailsHtml}
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

  // Render Energy Market & Maritime Security Section if present
  let energySectionHtml = '';
  if (energyEvents.length > 0) {
    energySectionHtml = `
      <div style="margin-top: 24px; background: linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%); border: 1px solid #4338ca; border-radius: 10px; padding: 18px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 18px; margin-right: 8px;">🛢️</span>
          <div>
            <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #e0e7ff; letter-spacing: 0.5px;">
              MARITIME & ENERGY MARKET IMPACT BRIEF
            </h2>
            <div style="font-size: 11px; color: #a5b4fc;">
              ${energyEvents.length} critical infrastructure, pipeline, or commercial vessel event${energyEvents.length > 1 ? 's' : ''} detected
            </div>
          </div>
        </div>
        <div style="background-color: #0b0f19; border: 1px solid #312e81; border-radius: 6px; padding: 10px; margin-bottom: 14px; font-size: 12px; color: #c7d2fe;">
          <strong>Market Chokepoints Monitored:</strong> Bab el-Mandeb (Red Sea), Strait of Hormuz, Petroline (Abqaiq-Yanbu), Goureh-Jask, Ras Tanura & Kharg Terminals.
        </div>
        ${energyEvents.map(renderEventItem).join('')}
      </div>
    `;
  }

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
        <span style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #10b981; text-transform: uppercase;">DEFENSE & ENERGY INTELLIGENCE AUTOMATION</span>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px;">
        Middle East Conflict & Energy Security Digest
      </h1>
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">
        Target Theater: <strong>Saudi Arabia / Yemen / Iran</strong> • Dispatched: <strong>${dateStr}</strong>
      </p>
      <div style="margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap;">
        <span style="background-color: #1e293b; border-radius: 6px; padding: 6px 12px; font-size: 12px; color: #38bdf8; font-weight: 600;">
          ⚡ ${totalCount} Security Incident${totalCount > 1 ? 's' : ''}
        </span>
        ${
          energyEvents.length > 0
            ? `<span style="background-color: #312e81; border-radius: 6px; padding: 6px 12px; font-size: 12px; color: #fbbf24; font-weight: 700;">
                🛢️ ${energyEvents.length} Oil/Maritime Impact${energyEvents.length > 1 ? 's' : ''}
              </span>`
            : ''
        }
      </div>
    </div>

    <!-- Maritime & Energy Market Section (High Visibility) -->
    ${energySectionHtml}

    <!-- Regional Theater Sections -->
    ${renderCountrySection('Yemen', '🇾🇪')}
    ${renderCountrySection('Saudi Arabia', '🇸🇦')}
    ${renderCountrySection('Iran', '🇮🇷')}

    <!-- Footer & Unsubscribe/Pause -->
    <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b;">
      <p style="margin: 0 0 8px 0;">
        This automated intelligence brief was compiled by <a href="${appUrl}" target="_blank" style="color: #38bdf8; text-decoration: none;">Middle East Conflict & Energy Monitor</a>.
      </p>
      <p style="margin: 0 0 16px 0;">
        Ingestion Frequency: Every 6 Hours • Connectors: UKMTO, Ambrey, OilPrice, S&P Platts, GDELT 2.0, Defense OSINT.
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
