import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'smc_admin_session';
const DEFAULT_SESSION_SECRET = 'smc-admin-session-secret';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH?.trim() || '';
}

function getLegacyPassword() {
  return process.env.ADMIN_EDITOR_PASSWORD?.trim() || 'samsung-admin';
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || DEFAULT_SESSION_SECRET;
}

function hmac(value: string) {
  return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

export function validateAdminPassword(password: string) {
  const hash = getPasswordHash();
  if (hash) {
    return bcrypt.compareSync(password, hash);
  }

  return password === getLegacyPassword();
}

export function createAdminSessionToken() {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = crypto.randomBytes(12).toString('base64url');
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifyAdminSessionToken(token: string | null | undefined) {
  if (!token) return false;

  const [expiresAtValue, nonce, signature] = token.split('.');
  if (!expiresAtValue || !nonce || !signature) return false;

  const expiresAt = Number(expiresAtValue);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = hmac(`${expiresAtValue}.${nonce}`);
  const received = Buffer.from(signature);
  const actual = Buffer.from(expected);
  if (received.length !== actual.length) return false;

  return crypto.timingSafeEqual(received, actual);
}

export function getAdminCookieValue(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1) || null;
}

export function isAdminRequest(request: Request) {
  return verifyAdminSessionToken(getAdminCookieValue(request));
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export function applyAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, cookieOptions(Math.floor(SESSION_TTL_MS / 1000)));
  return response;
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export function getSessionExpiryFromToken(token: string | null | undefined) {
  if (!token) return null;
  const expiresAt = Number(token.split('.')[0]);
  return Number.isFinite(expiresAt) ? expiresAt : null;
}
