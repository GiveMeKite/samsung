import { NextResponse } from 'next/server';
import { readRestSpots } from '@/lib/rest-spot-store';
import { restSpotToChair } from '@/types/chair';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const spots = await readRestSpots();
  const chairs = spots.map(restSpotToChair);

  return NextResponse.json(
    { chairs },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
