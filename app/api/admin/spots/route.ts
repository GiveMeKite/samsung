import { NextResponse } from 'next/server';
import { createMapOptions, readRestSpots } from '@/lib/rest-spot-store';
import { isAdminRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const spots = await readRestSpots();
  return NextResponse.json({ spots, mapOptions: createMapOptions(spots) });
}
