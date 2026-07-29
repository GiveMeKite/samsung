import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  return clearAdminSessionCookie(response);
}
