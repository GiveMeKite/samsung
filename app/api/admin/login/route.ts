import { NextResponse } from 'next/server';
import { applyAdminSessionCookie, createAdminSessionToken, getSessionExpiryFromToken, validateAdminPassword } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!password || !validateAdminPassword(password)) {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const token = createAdminSessionToken();
    const response = NextResponse.json({
      authenticated: true,
      expiresAt: getSessionExpiryFromToken(token),
    });
    return applyAdminSessionCookie(response, token);
  } catch {
    return NextResponse.json({ error: '로그인에 실패했습니다.' }, { status: 500 });
  }
}
