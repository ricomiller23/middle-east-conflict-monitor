import { NextRequest, NextResponse } from 'next/server';
import { updateSettings, getSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'pause';
  const shouldPause = action !== 'resume';

  await updateSettings({ digest_paused: shouldPause });
  const settings = await getSettings();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '/';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Digest Preferences - Middle East Conflict Monitor</title>
  <style>
    body {
      background-color: #080c14;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background-color: #0d1424;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .paused { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
    .active { background: #dcfce7; color: #166534; border: 1px solid #4ade80; }
    h1 { font-size: 20px; margin: 0 0 12px 0; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    .btn-primary { background-color: #0284c7; color: #ffffff; margin-right: 10px; }
    .btn-secondary { background-color: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge ${settings.digest_paused ? 'paused' : 'active'}">
      ${settings.digest_paused ? 'Digest Paused' : 'Digest Active'}
    </div>
    <h1>${settings.digest_paused ? 'Email Digests Paused' : 'Email Digests Resumed'}</h1>
    <p>
      ${
        settings.digest_paused
          ? 'You have successfully paused 6-hour email digest deliveries. The system will continue monitoring incidents on the dashboard without sending emails.'
          : 'You have resumed email digests. You will receive notifications when new verified incidents are detected in Saudi Arabia, Yemen, or Iran.'
      }
    </p>
    <div>
      <a href="${appUrl}" class="btn btn-primary">Return to Dashboard</a>
      <a href="/api/digest/pause?action=${settings.digest_paused ? 'resume' : 'pause'}" class="btn btn-secondary">
        ${settings.digest_paused ? 'Resume Alerts' : 'Pause Alerts'}
      </a>
    </div>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const shouldPause = body.paused !== false;

  await updateSettings({ digest_paused: shouldPause });
  const settings = await getSettings();

  return NextResponse.json({
    success: true,
    digest_paused: settings.digest_paused,
  });
}
