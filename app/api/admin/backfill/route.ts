import { NextRequest, NextResponse } from 'next/server';
import { executeSixMonthBackfill } from '@/lib/backfill';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow sufficient time for 6-month historical backfill

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
    const result = await executeSixMonthBackfill();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
      events: undefined, // Don't serialize massive array in response summary
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
