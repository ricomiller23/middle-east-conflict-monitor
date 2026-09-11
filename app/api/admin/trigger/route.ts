import { NextRequest, NextResponse } from 'next/server';
import { runIngestionPipeline } from '@/lib/ingestion';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminPassword) {
    const token = authHeader?.replace('Bearer ', '');
    if (token !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized: Invalid admin credentials' }, { status: 401 });
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
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
