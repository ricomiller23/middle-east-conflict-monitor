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

  // Verify Bearer token against CRON_SECRET
  if (cronSecret) {
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const urlSecret = req.nextUrl.searchParams.get('key');

    if (bearerToken !== cronSecret && urlSecret !== cronSecret) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Invalid or missing Bearer token matching CRON_SECRET.',
          hint: 'Provide Authorization: Bearer <CRON_SECRET> header in your request.',
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
