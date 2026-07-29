import { NextResponse } from 'next/server';
import { getAdminCookieValue, getSessionExpiryFromToken, verifyAdminSessionToken } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const token = getAdminCookieValue(request);
  const authenticated = verifyAdminSessionToken(token);

  return NextResponse.json({
    authenticated,
    expiresAt: authenticated ? getSessionExpiryFromToken(token) : null,
  });
}
