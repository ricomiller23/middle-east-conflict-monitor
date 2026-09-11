import { NextRequest, NextResponse } from 'next/server';
import { getIngestionLogs, getSettings, initDatabase } from '@/lib/db';
import sourcesConfig from '@/config/sources.json';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await initDatabase();

  const authHeader = req.headers.get('authorization');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminPassword) {
    const token = authHeader?.replace('Bearer ', '');
    if (token !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized: Invalid admin credentials' }, { status: 401 });
    }
  }

  try {
    const logs = await getIngestionLogs(25);
    const settings = await getSettings();

    return NextResponse.json({
      success: true,
      settings,
      logs,
      sources: sourcesConfig,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
