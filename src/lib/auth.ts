import { randomBytes, randomInt } from 'node:crypto';
import type { Database, SafeUser, User } from './types';
import type { Store } from './store';
import {
  HttpError,
  hashCode,
  hashPassword,
  matchesCode,
  newId,
  safeUser,
  sha256,
  takeRateLimit,
  verifyPassword,
} from './security';
import { sendCodeMail } from './mail';

export const SESSION_SECONDS = 60 * 60 * 24 * 30;
const AUTH_ERROR = '验证码无效、已过期或账号状态不适用，请重新获取';
async function rate(store: Store, action: string, email: string, client: string): Promise<void> {
  const accepted = await store.mutate((data) => {
    const ipOk = takeRateLimit(data, `${action}:ip:${client}`, action === 'send' ? 30 : 120, 60 * 60 * 1000);
    // Do not allocate unlimited per-email records after the caller is blocked.
    if (!ipOk) return false;
    return takeRateLimit(
      data,
      `${action}:email:${sha256(email)}`,
      action === 'send' ? 6 : 20,
      60 * 60 * 1000,
    );
  });
  if (!accepted) throw new HttpError(429, '操作过于频繁，请稍后再试');
}
export async function sendVerification(
  store: Store,
  email: string,
  purpose: 'register' | 'reset',
  client: string,
  deliver = sendCodeMail,
): Promise<void> {
  await rate(store, 'send', email, client);
  const code = randomInt(0, 1000000).toString().padStart(6, '0');
  const codeHash = hashCode(code);
  const now = Date.now();
  const accepted = await store.mutate((data) => {
    const recent = data.verifications.find((v) => v.email === email && v.purpose === purpose);
    if (recent && now - new Date(recent.sentAt).getTime() < 60000) return false;
    data.verifications = data.verifications.filter(
      (v) => new Date(v.expiresAt).getTime() > now && !(v.email === email && v.purpose === purpose),
    );
    data.verifications.push({
      email,
      purpose,
      codeHash,
      attempts: 0,
      sentAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
    });
    return true;
  });
  if (!accepted) throw new HttpError(429, '请等待 60 秒后重新获取验证码');
  // Both existing and unknown emails receive the same verification message.
  // Account eligibility is checked only when the submitted code is verified.
  try {
    await deliver(email, code, purpose);
  } catch (error) {
    await store.mutate((data) => {
      data.verifications = data.verifications.filter(
        (v) => !(v.email === email && v.purpose === purpose && v.codeHash === codeHash),
      );
    });
    console.error('Verification mail failed:', error instanceof Error ? error.message : 'unknown error');
    throw new HttpError(503, '邮件发送失败，请稍后重试或联系管理员');
  }
}
export function consumeCode(
  data: Database,
  email: string,
  purpose: 'register' | 'reset',
  code: string,
): boolean {
  const item = data.verifications.find((v) => v.email === email && v.purpose === purpose);
  if (!item || new Date(item.expiresAt).getTime() <= Date.now() || item.attempts >= 5) return false;
  item.attempts++;
  if (!matchesCode(code, item.codeHash)) return false;
  data.verifications = data.verifications.filter((v) => v !== item);
  return true;
}
function addSession(data: Database, user: User, token: string): void {
  data.sessions = data.sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now());
  const existing = data.sessions.filter((s) => s.userId === user.id);
  // Keep the most recent ten devices; tokens are never persisted in plaintext.
  if (existing.length >= 10) {
    const oldest = new Set(existing.slice(0, existing.length - 9).map((s) => s.tokenHash));
    data.sessions = data.sessions.filter((s) => !oldest.has(s.tokenHash));
  }
  data.sessions.push({
    userId: user.id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
  });
}
export async function register(
  store: Store,
  input: { email: string; name: string; password: string; code: string },
  client: string,
): Promise<{ user: SafeUser; token: string }> {
  await rate(store, 'register', input.email, client);
  const passwordHash = await hashPassword(input.password);
  const token = randomBytes(32).toString('hex');
  const id = newId();
  const now = new Date().toISOString();
  const result = await store.mutate((data) => {
    const valid = consumeCode(data, input.email, 'register', input.code);
    if (!valid || data.users.some((u) => u.email === input.email)) return null;
    const user: User = {
      id,
      email: input.email,
      name: input.name,
      passwordHash,
      role: 'user',
      verifiedAt: now,
      vipExpiresAt: null,
      createdAt: now,
    };
    data.users.push(user);
    addSession(data, user, token);
    return safeUser(user);
  });
  if (!result) throw new HttpError(400, AUTH_ERROR);
  return { user: result, token };
}
export async function login(
  store: Store,
  input: { email: string; password: string },
  client: string,
): Promise<{ user: SafeUser; token: string }> {
  await rate(store, 'login', input.email, client);
  const data = await store.read();
  const user = data.users.find((u) => u.email === input.email && u.verifiedAt);
  // Perform a scrypt operation for missing users too.
  const valid = user
    ? await verifyPassword(input.password, user.passwordHash)
    : (await hashPassword(input.password), false);
  if (!valid || !user) throw new HttpError(401, '邮箱或密码不正确');
  const token = randomBytes(32).toString('hex');
  const result = await store.mutate((state) => {
    const fresh = state.users.find(
      (u) => u.id === user.id && u.passwordHash === user.passwordHash && u.verifiedAt,
    );
    if (!fresh) return null;
    addSession(state, fresh, token);
    return safeUser(fresh);
  });
  if (!result) throw new HttpError(401, '账号状态已变化，请重新登录');
  return { user: result, token };
}
export async function resetPassword(
  store: Store,
  input: { email: string; code: string; password: string },
  client: string,
): Promise<void> {
  await rate(store, 'reset', input.email, client);
  const passwordHash = await hashPassword(input.password);
  const accepted = await store.mutate((data) => {
    const valid = consumeCode(data, input.email, 'reset', input.code);
    const user = data.users.find((u) => u.email === input.email && u.verifiedAt);
    if (!valid || !user) return false;
    user.passwordHash = passwordHash;
    data.sessions = data.sessions.filter((s) => s.userId !== user.id);
    return true;
  });
  if (!accepted) throw new HttpError(400, AUTH_ERROR);
}
