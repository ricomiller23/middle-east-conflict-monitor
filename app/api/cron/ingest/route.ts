import { NextRequest, NextResponse } from 'next/server';
import { runIngestionPipeline } from '@/lib/ingestion';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleIngest(req);
}

export async function POST(req: NextRequest) {
  return handleIngest(req);
}

async function handleIngest(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const urlSecret = req.nextUrl.searchParams.get('key');

  // Hardened security gate: Require valid CRON_SECRET in production
  if (process.env.VERCEL === '1' || cronSecret) {
    if (!cronSecret || (bearerToken !== cronSecret && urlSecret !== cronSecret)) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Invalid or missing Bearer token matching CRON_SECRET.',
          hint: 'Configure CRON_SECRET in Vercel environment variables and pass Authorization: Bearer <CRON_SECRET>.',
        },
        { status: 401 }
      );
    }
  }

  try {
    const result = await runIngestionPipeline();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error('[API /api/cron/ingest] Ingestion pipeline failure:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Unknown ingestion pipeline error',
      },
      { status: 500 }
    );
  }
}
