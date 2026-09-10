import { createHash, randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { isIP } from 'node:net';
import type { Database, SafeUser, User } from './types';

const scryptAsync = promisify(scrypt);
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const newId = () => randomBytes(12).toString('hex');
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, value] = encoded.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(value ?? ''))
    return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(derived, Buffer.from(value, 'hex'));
}
export function hashCode(code: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(code, salt, 32).toString('hex')}`;
}
export function matchesCode(code: string, encoded: string): boolean {
  const [salt, digest] = encoded.split(':');
  if (!/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{64}$/.test(digest ?? '')) return false;
  return timingSafeEqual(scryptSync(code, salt, 32), Buffer.from(digest, 'hex'));
}
export function isVip(user: User, now = Date.now()): boolean {
  return !!user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() > now;
}
export function safeUser(user: User): SafeUser {
  const { passwordHash: _secret, ...safe } = user;
  return { ...safe, isVip: isVip(user) };
}
export function sessionHash(request: Request): string | null {
  const raw = request.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('academy_session='))
    ?.slice('academy_session='.length);
  return raw && /^[a-f0-9]{64}$/.test(raw) ? sha256(raw) : null;
}
export function currentUser(data: Database, request: Request): User | null {
  const tokenHash = sessionHash(request);
  if (!tokenHash) return null;
  const session = data.sessions.find(
    (s) => s.tokenHash === tokenHash && new Date(s.expiresAt).getTime() > Date.now(),
  );
  return session ? (data.users.find((u) => u.id === session.userId && !!u.verifiedAt) ?? null) : null;
}
export function requireUser(data: Database, request: Request, permission?: 'vip' | 'admin'): User {
  const user = currentUser(data, request);
  if (!user) throw new HttpError(401, '请先登录');
  if (permission === 'admin' && user.role !== 'admin') throw new HttpError(403, '需要管理员权限');
  if (permission === 'vip' && !isVip(user))
    throw new HttpError(403, '需要有效的 VIP 权限，请联系管理员开通或续期');
  return user;
}
export function takeRateLimit(
  data: Database,
  key: string,
  maximum: number,
  durationMs: number,
  now = Date.now(),
): boolean {
  data.rateLimits = data.rateLimits.filter((row) => new Date(row.resetAt).getTime() > now);
  data.sessions = data.sessions.filter((row) => new Date(row.expiresAt).getTime() > now);
  let row = data.rateLimits.find((row) => row.key === key);
  if (!row) {
    row = { key, count: 0, resetAt: new Date(now + durationMs).toISOString() };
    data.rateLimits.push(row);
  }
  if (row.count >= maximum) return false;
  row.count++;
  return true;
}
export function assertOrigin(request: Request): void {
  let expected: string;
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) throw new Error('APP_URL required');
    expected = new URL(process.env.APP_URL ?? request.url).origin;
  } catch {
    throw new HttpError(503, '服务地址未配置，请设置 APP_URL');
  }
  const origin = request.headers.get('origin');
  if (origin !== expected || request.headers.get('sec-fetch-site') === 'cross-site')
    throw new HttpError(403, '请求来源校验失败');
}
export function clientKey(request: Request): string {
  if (!process.env.VERCEL && process.env.TRUST_PROXY !== '1') return sha256('direct');
  // Vercel's platform header avoids a proxy overriding the generic XFF header.
  // Self-hosting supports one trusted reverse proxy: use its rightmost entry,
  // never an attacker-controlled address prepended to an appended XFF chain.
  const forwarded = process.env.VERCEL
    ? (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for'))
    : request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',').at(-1)?.trim() ?? '';
  return sha256(isIP(ip) ? ip : 'unknown');
}
export async function readJson(request: Request, maximum = 500000): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new HttpError(415, '请使用 application/json');
  if (Number(request.headers.get('content-length') ?? 0) > maximum) throw new HttpError(413, '请求内容过大');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, '缺少请求内容');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new HttpError(413, '请求内容过大');
    }
    chunks.push(part.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'JSON 格式不正确');
  }
}
export function sessionCookie(token: string, maxAge: number): string {
  return `academy_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' || process.env.APP_URL?.startsWith('https://') ? '; Secure' : ''}`;
}
