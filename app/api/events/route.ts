import { NextRequest, NextResponse } from 'next/server';
import { getEvents, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await initDatabase();

  const searchParams = req.nextUrl.searchParams;
  const country = searchParams.get('country') || undefined;
  const category = searchParams.get('category') || undefined;
  const credibility_tier = searchParams.get('credibility_tier') || undefined;
  const search = searchParams.get('search') || undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 500, 1), 2500) : 500;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

  try {
    const events = await getEvents({
      country,
      category,
      credibility_tier,
      search,
      limit,
      offset,
    });

    // Ensure strict descending chronological order (most recent first)
    events.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (err: any) {
    console.error('[API /api/events] Error fetching events:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve events' },
      { status: 500 }
    );
  }
}
