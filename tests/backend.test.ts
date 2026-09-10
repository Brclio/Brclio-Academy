import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createGithubStore, createSqliteStore, decryptDatabase, encryptDatabase } from '../src/lib/store';
import { createSeed } from '../src/lib/seed';
import { handleApi } from '../src/lib/api';
import { consumeCode, login, register, resetPassword, sendVerification } from '../src/lib/auth';
import {
  clientKey,
  currentUser,
  hashCode,
  hashPassword,
  isVip,
  safeUser,
  sha256,
  takeRateLimit,
  verifyPassword,
} from '../src/lib/security';
import { courseSchema, emailSchema } from '../src/lib/validation';
import { sendCodeMail } from '../src/lib/mail';
import type { Store } from '../src/lib/store';
import type { Database, User } from '../src/lib/types';

process.env.APP_URL = 'http://localhost:3000';
const email = 'learner@example.com';
const password = 'correct horse battery';
const request = (
  url: string,
  method = 'GET',
  body?: unknown,
  token?: string,
  origin = 'http://localhost:3000',
) =>
  new Request(`http://localhost:3000/api/${url}`, {
    method,
    headers: {
      'content-type': 'application/json',
      origin,
      ...(token ? { cookie: `academy_session=${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const api = (store: Store, url: string, method = 'GET', body?: unknown, token?: string) =>
  handleApi(request(url, method, body, token), store);
async function codeFor(store: Store, purpose: 'register' | 'reset', address = email): Promise<string> {
  let code = '';
  await sendVerification(store, address, purpose, 'tests', async (_email, value) => {
    code = value;
  });
  return code;
}
async function registered(store: Store) {
  const code = await codeFor(store, 'register');
  return register(store, { email, name: '学习者', password, code }, 'tests');
}

test('SQLite commits atomically, rolls back failures, persists on disk, and serializes concurrent writers', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'academy-test-'));
  const filename = path.join(directory, 'state.sqlite');
  const first = await createSqliteStore(filename);
  const second = await createSqliteStore(filename);
  try {
    await assert.rejects(
      first.mutate((data) => {
        data.courses = [];
        throw new Error('cancel');
      }),
      /cancel/,
    );
    assert.ok((await first.read()).courses.length >= 3);
    await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        (i % 2 ? first : second).mutate((data) => {
          data.audit.push({
            id: `event-${i}`,
            actorId: 'tests',
            targetId: 'test',
            action: 'increment',
            at: new Date().toISOString(),
          });
        }),
      ),
    );
    assert.equal((await first.read()).audit.length, 30);
    await assert.rejects(
      first.mutate((data) => {
        data.version = 2 as 1;
      }),
    );
    assert.equal((await second.read()).version, 1);
    assert.ok((await readFile(filename)).length > 0);
  } finally {
    first.close();
    second.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('GitHub encrypted SHA compare-and-swap retries retain concurrent changes and recheck repository privacy', async () => {
  const key = randomBytes(32);
  let current: { content: string; sha: string } | undefined;
  let revision = 0;
  let conflicts = 0;
  let privateRepo = true;
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const address = String(url);
    if (!address.includes('/contents/')) return Response.json({ private: privateRepo });
    if (init?.method !== 'PUT')
      return current
        ? Response.json({ ...current, type: 'file', encoding: 'base64' })
        : Response.json({ message: 'not found' }, { status: 404 });
    const body = JSON.parse(init.body as string);
    if (body.sha !== current?.sha) {
      conflicts++;
      return Response.json({ message: 'conflict' }, { status: 409 });
    }
    current = { content: body.content, sha: `sha-${++revision}` };
    return Response.json({ content: { sha: current.sha } });
  }) as typeof fetch;
  const store = createGithubStore({
    token: 'test',
    owner: 'test',
    repo: 'private-data',
    branch: 'main',
    file: 'academy.enc.json',
    key,
    fetch: fakeFetch,
  });
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      store.mutate((data) => {
        data.audit.push({
          id: `event-${i}`,
          actorId: 'tests',
          targetId: 'test',
          action: 'write',
          at: new Date().toISOString(),
        });
      }),
    ),
  );
  assert.equal((await store.read()).audit.length, 5);
  assert.ok(conflicts > 0);
  const beforeNoop = revision;
  await store.mutate((data) => data.audit.length);
  assert.equal(revision, beforeNoop, 'no-op callbacks do not consume GitHub write quota');
  const envelope = Buffer.from(current!.content, 'base64').toString('utf8');
  assert.ok(!envelope.includes('courses'));
  assert.equal(decryptDatabase(envelope, key).audit.length, 5);
  privateRepo = false;
  await assert.rejects(store.read(), /private/);
  await assert.rejects(
    store.mutate((data) => {
      data.courses = [];
    }),
    /private/,
  );
});

test('AES-GCM rejects wrong keys, tampering, and invalid database schemas', () => {
  const key = randomBytes(32);
  const seed = createSeed();
  const encrypted = encryptDatabase(seed, key);
  assert.deepEqual(decryptDatabase(encrypted, key), seed);
  assert.throws(() => decryptDatabase(encrypted, randomBytes(32)));
  const envelope = JSON.parse(encrypted);
  envelope.tag = Buffer.alloc(16).toString('base64');
  assert.throws(() => decryptDatabase(JSON.stringify(envelope), key));
  assert.throws(() => decryptDatabase(encryptDatabase({ version: 2 } as unknown as Database, key), key));
});

test('registration requires a valid email OTP, caps wrong attempts, persists no pre-verification password, and prevents reuse', async () => {
  const store = await createSqliteStore(':memory:');
  try {
    const code = await codeFor(store, 'register');
    const pending = await store.read();
    assert.equal(pending.users.length, 0);
    assert.ok(!JSON.stringify(pending).includes(password));
    assert.ok(!pending.verifications[0].codeHash.includes(code));
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++)
      await assert.rejects(
        register(store, { email, password, name: 'Tester', code: wrong }, 'tests'),
        /验证码/,
      );
    assert.equal((await store.read()).verifications[0].attempts, 5);
    await assert.rejects(register(store, { email, password, name: 'Tester', code }, 'tests'), /验证码/);
    await store.mutate((data) => {
      data.verifications = [];
    });
    const nextCode = await codeFor(store, 'register');
    const result = await register(store, { email, password, name: 'Tester', code: nextCode }, 'tests');
    assert.equal(result.user.isVip, false);
    assert.equal('passwordHash' in result.user, false);
    assert.ok(result.user.verifiedAt);
    assert.equal((await store.read()).sessions[0].tokenHash, sha256(result.token));
    await assert.rejects(
      register(store, { email, password, name: 'Tester', code: nextCode }, 'tests'),
      /验证码/,
    );
    assert.equal((await store.read()).users.length, 1);
  } finally {
    store.close();
  }
});

test('expired OTPs cannot be used; password reset consumes its OTP and invalidates every old session', async () => {
  const store = await createSqliteStore(':memory:');
  try {
    const member = await registered(store);
    await login(store, { email, password }, 'tests');
    await store.mutate((data) => {
      data.verifications.push({
        email: 'expired@example.com',
        purpose: 'register',
        codeHash: hashCode('123456'),
        sentAt: new Date(0).toISOString(),
        expiresAt: new Date(1).toISOString(),
        attempts: 0,
      });
    });
    assert.equal(
      await store.mutate((data) => consumeCode(data, 'expired@example.com', 'register', '123456')),
      false,
    );
    const code = await codeFor(store, 'reset');
    const newPassword = 'a different strong password';
    await resetPassword(store, { email, code, password: newPassword }, 'tests');
    assert.equal((await store.read()).sessions.length, 0);
    assert.equal(currentUser(await store.read(), request('me', 'GET', undefined, member.token)), null);
    await assert.rejects(resetPassword(store, { email, code, password }, 'tests'), /验证码/);
    await assert.rejects(login(store, { email, password }, 'tests'), /邮箱或密码/);
    assert.ok((await login(store, { email, password: newPassword }, 'tests')).token);
  } finally {
    store.close();
  }
});

test('catalog and protected routes never return lesson bodies/video IDs before active VIP; expiration and revocation are immediate', async () => {
  const store = await createSqliteStore(':memory:');
  try {
    const original = await store.read();
    const course = original.courses.find((c) => c.published)!;
    const lesson = course.chapters[0].lessons[0];
    const catalog = await (await api(store, 'catalog')).json();
    const publicLesson = catalog.courses.find((c: { id: string }) => c.id === course.id).chapters[0]
      .lessons[0];
    assert.deepEqual(Object.keys(publicLesson).sort(), ['duration', 'id', 'kind', 'title']);
    assert.ok(catalog.articles.every((a: object) => !('content' in a)));
    const url = `lessons/${course.id}/${lesson.id}`;
    assert.equal((await api(store, url)).status, 401);
    const member = await registered(store);
    assert.equal((await api(store, url, 'GET', undefined, member.token)).status, 403);
    await store.mutate((data) => {
      data.users[0].vipExpiresAt = new Date(Date.now() + 60000).toISOString();
    });
    const unlocked = await api(store, url, 'GET', undefined, member.token);
    assert.equal(unlocked.status, 200);
    assert.deepEqual((await unlocked.json()).lesson.videos, lesson.videos);
    await store.mutate((data) => {
      data.users[0].vipExpiresAt = new Date(Date.now() - 1).toISOString();
    });
    assert.equal((await api(store, url, 'GET', undefined, member.token)).status, 403);
    await store.mutate((data) => {
      data.users[0].role = 'admin';
      data.users[0].vipExpiresAt = null;
    });
    assert.equal(
      (await api(store, url, 'GET', undefined, member.token)).status,
      403,
      'admin preview also needs explicit VIP',
    );
    const adminResponse = await api(store, 'admin', 'GET', undefined, member.token);
    assert.equal(adminResponse.status, 200);
    const adminData = await adminResponse.json();
    assert.ok(adminData.users.every((u: object) => !('passwordHash' in u)));
  } finally {
    store.close();
  }
});

test('learning records are user-scoped; VIP changes are audited; drafts and draft-column articles stay hidden', async () => {
  const store = await createSqliteStore(':memory:');
  try {
    const member = await registered(store);
    const seed = await store.read();
    const course = seed.courses[0];
    const lesson = course.chapters[0].lessons[0];
    const progressBody = {
      courseId: course.id,
      lessonId: lesson.id,
      videoIndex: 0,
      seconds: 123,
      completed: true,
    };
    assert.equal((await api(store, 'admin', 'GET', undefined, member.token)).status, 403);
    assert.equal((await api(store, 'progress', 'POST', progressBody, member.token)).status, 403);
    await store.mutate((data) => {
      data.users[0].role = 'admin';
    });
    const vip = await api(
      store,
      'admin/vip',
      'POST',
      { userId: member.user.id, vipExpiresAt: new Date(Date.now() + 86400000).toISOString() },
      member.token,
    );
    assert.equal(vip.status, 200);
    assert.equal((await api(store, 'progress', 'POST', progressBody, member.token)).status, 200);
    const staleAutosave = await (
      await api(store, 'progress', 'POST', { ...progressBody, completed: false }, member.token)
    ).json();
    assert.equal(staleAutosave.progress.completed, true, 'ordinary autosave cannot undo completion');
    const explicitReset = await (
      await api(
        store,
        'progress',
        'POST',
        { ...progressBody, completed: false, resetCompleted: true },
        member.token,
      )
    ).json();
    assert.equal(explicitReset.progress.completed, false, 'explicit user toggle can clear completion');
    assert.equal('resetCompleted' in explicitReset.progress, false, 'action flag is not stored as progress');
    assert.equal((await store.read()).progress[0].completed, false);
    const completedAgain = await (
      await api(store, 'progress', 'POST', { ...progressBody, completed: true }, member.token)
    ).json();
    assert.equal(completedAgain.progress.completed, true);
    assert.equal(
      (
        await api(
          store,
          'notes',
          'POST',
          { courseId: course.id, lessonId: lesson.id, body: '重点记录' },
          member.token,
        )
      ).status,
      200,
    );
    assert.deepEqual(
      await (await api(store, 'bookmarks', 'POST', { courseId: course.id }, member.token)).json(),
      { bookmarked: true },
    );
    const dashboard = await (await api(store, 'dashboard', 'GET', undefined, member.token)).json();
    assert.equal(dashboard.progress[0].seconds, 123);
    assert.equal(dashboard.notes[0].body, '重点记录');
    const otherEmail = 'another@example.com';
    const otherCode = await codeFor(store, 'register', otherEmail);
    const other = await register(
      store,
      { email: otherEmail, name: '另一位', password, code: otherCode },
      'tests',
    );
    assert.deepEqual(await (await api(store, 'dashboard', 'GET', undefined, other.token)).json(), {
      progress: [],
      notes: [],
      bookmarks: [],
    });
    assert.equal(
      (await api(store, 'admin/vip', 'POST', { userId: member.user.id, vipExpiresAt: null }, member.token))
        .status,
      200,
    );
    assert.equal((await api(store, 'progress', 'POST', progressBody, member.token)).status, 403);
    assert.equal((await store.read()).audit[0].action, 'vip.revoke');
    const column = seed.columns[0];
    const draftArticle = seed.articles.find((a) => a.columnId === column.id);
    await store.mutate((data) => {
      data.courses[0].published = false;
      data.columns.find((c) => c.id === column.id)!.published = false;
    });
    const catalog = await (await api(store, 'catalog')).json();
    assert.ok(!catalog.courses.some((c: { id: string }) => c.id === course.id));
    if (draftArticle)
      assert.equal(
        (await api(store, `articles/${draftArticle.id}`, 'GET', undefined, member.token)).status,
        404,
      );
  } finally {
    store.close();
  }
});

test('CSRF, request size, URL schemes, sessions, passwords, and durable rate limits are enforced', async () => {
  const store = await createSqliteStore(':memory:');
  try {
    const crossSite = await handleApi(
      request('auth/login', 'POST', { email, password }, undefined, 'https://evil.example'),
      store,
    );
    assert.equal(crossSite.status, 403);
    assert.equal((await api(store, 'auth/register', 'POST', { email, password: 'short' })).status, 400);
    assert.equal((await api(store, 'auth/login', 'POST', { email, password: 'x'.repeat(6000) })).status, 413);
    const course = structuredClone(createSeed().courses[0]);
    course.chapters[0].lessons[0].resources = [{ title: 'bad', url: 'javascript:alert(1)' }];
    assert.equal(courseSchema.safeParse(course).success, false);
    assert.equal(emailSchema.parse(' TEST@Example.com '), 'test@example.com');
    const hash = await hashPassword(password);
    assert.equal(await verifyPassword(password, hash), true);
    assert.equal(await verifyPassword('wrong', hash), false);
    assert.equal(await verifyPassword(password, 'malformed'), false);
    assert.equal(await store.mutate((data) => takeRateLimit(data, 'limit', 1, 60000)), true);
    assert.equal(await store.mutate((data) => takeRateLimit(data, 'limit', 1, 60000)), false);
    const member = await registered(store);
    const user = (await store.read()).users[0];
    assert.equal(isVip({ ...user, vipExpiresAt: new Date(Date.now()).toISOString() }, Date.now()), false);
    assert.ok(!('passwordHash' in safeUser(user)));
    await store.mutate((data) => {
      data.sessions[0].expiresAt = new Date(0).toISOString();
    });
    assert.equal(currentUser(await store.read(), request('me', 'GET', undefined, member.token)), null);
  } finally {
    store.close();
  }
});

test('console mail cannot silently run in production and SQLite refuses Vercel', async () => {
  const previous = {
    node: process.env.NODE_ENV,
    mail: process.env.MAIL_TRANSPORT,
    vercel: process.env.VERCEL,
  };
  try {
    Object.assign(process.env, { NODE_ENV: 'production', MAIL_TRANSPORT: 'console' });
    await assert.rejects(sendCodeMail(email, '123456', 'register'), /生产环境/);
    process.env.VERCEL = '1';
    await assert.rejects(createSqliteStore(':memory:'), /Vercel/);
  } finally {
    for (const [name, value] of [
      ['NODE_ENV', previous.node],
      ['MAIL_TRANSPORT', previous.mail],
      ['VERCEL', previous.vercel],
    ]) {
      if (value === undefined) delete process.env[name!];
      else process.env[name!] = value;
    }
  }
});

test('admin bootstrap preserves existing accounts; encrypted export/import restores content and revokes sessions', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'academy-cli-'));
  const filename = path.join(directory, 'state.sqlite');
  const backup = path.join(directory, 'backup.enc.json');
  const env = {
    ...process.env,
    DATA_DRIVER: 'sqlite',
    SQLITE_PATH: filename,
    DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    ADMIN_PASSWORD: 'local-test-password-only',
  };
  const run = (script: string, args: string[]) =>
    promisify(execFile)(
      process.execPath,
      [path.resolve('node_modules/tsx/dist/cli.mjs'), `scripts/${script}.ts`, ...args],
      { env },
    );
  let store: Awaited<ReturnType<typeof createSqliteStore>> | undefined;
  try {
    await run('admin', ['--email', 'admin@example.com', '--name', 'Admin']);
    store = await createSqliteStore(filename);
    const user = (await store.read()).users[0];
    assert.equal(user.role, 'admin');
    assert.equal(user.vipExpiresAt, null);
    assert.ok(user.verifiedAt);
    await assert.rejects(run('admin', ['--email', 'admin@example.com']), /账号已存在/);
    await store.mutate((data) => {
      data.users[0].role = 'user';
      data.sessions.push({
        tokenHash: 'test-token-hash',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });
    });
    await run('admin', ['--email', 'admin@example.com', '--promote']);
    assert.equal((await store.read()).users[0].passwordHash, user.passwordHash);
    await run('data', ['export', '--file', backup]);
    assert.ok(!(await readFile(backup, 'utf8')).includes('admin@example.com'));
    await assert.rejects(run('data', ['export', '--file', backup]), /EEXIST/);
    await store.mutate((data) => {
      data.courses = [];
    });
    await assert.rejects(run('data', ['import', '--file', backup]), /--replace/);
    await run('data', ['import', '--file', backup, '--replace']);
    const restored = await store.read();
    assert.ok(restored.courses.length > 0);
    assert.equal(restored.sessions.length, 0);
    assert.equal(restored.verifications.length, 0);
  } finally {
    store?.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('concurrent OTP guesses cannot lose attempt counts or verify the same code twice', async () => {
  const store = await createSqliteStore(':memory:');
  try {
    const code = await codeFor(store, 'register');
    const wrong = code === '000000' ? '111111' : '000000';
    const guesses = await Promise.all(
      Array.from({ length: 8 }, () => store.mutate((data) => consumeCode(data, email, 'register', wrong))),
    );
    assert.ok(guesses.every((value) => value === false));
    assert.equal((await store.read()).verifications[0].attempts, 5);
    await store.mutate((data) => {
      data.verifications[0].attempts = 0;
    });
    const duplicate = await Promise.all(
      Array.from({ length: 2 }, () => store.mutate((data) => consumeCode(data, email, 'register', code))),
    );
    assert.equal(duplicate.filter(Boolean).length, 1);
    assert.equal((await store.read()).verifications.length, 0);
  } finally {
    store.close();
  }
});

test('blocked clients cannot allocate unlimited per-email rate-limit records', async () => {
  const store = await createSqliteStore(':memory:');
  try {
    await store.mutate((data) => {
      data.rateLimits.push({
        key: 'send:ip:blocked',
        count: 30,
        resetAt: new Date(Date.now() + 60000).toISOString(),
      });
    });
    for (let i = 0; i < 20; i++)
      await assert.rejects(
        sendVerification(store, `random-${i}@example.com`, 'register', 'blocked', async () => {
          assert.fail('blocked requests must not send mail');
        }),
        /频繁/,
      );
    assert.equal((await store.read()).rateLimits.length, 1);
    assert.equal((await store.read()).verifications.length, 0);
  } finally {
    store.close();
  }
});

test('client rate-limit identity ignores spoofed headers by default and honors only configured proxy boundary', () => {
  const previous = { trust: process.env.TRUST_PROXY, vercel: process.env.VERCEL };
  const forwardedRequest = (headers: Record<string, string>) =>
    new Request('http://localhost:3000/api/me', { headers });
  try {
    delete process.env.VERCEL;
    process.env.TRUST_PROXY = '0';
    assert.equal(
      clientKey(forwardedRequest({ 'x-forwarded-for': '203.0.113.9' })),
      clientKey(forwardedRequest({ 'x-forwarded-for': '198.51.100.8' })),
    );
    process.env.TRUST_PROXY = '1';
    assert.equal(
      clientKey(forwardedRequest({ 'x-forwarded-for': '198.51.100.8, 203.0.113.9' })),
      sha256('203.0.113.9'),
    );
    assert.equal(clientKey(forwardedRequest({ 'x-forwarded-for': 'garbage' })), sha256('unknown'));
    process.env.VERCEL = '1';
    assert.equal(
      clientKey(
        forwardedRequest({ 'x-forwarded-for': '198.51.100.8', 'x-vercel-forwarded-for': '203.0.113.9' }),
      ),
      sha256('203.0.113.9'),
    );
  } finally {
    if (previous.trust === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous.trust;
    if (previous.vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous.vercel;
  }
});

test('GitHub CAS retries preserve OTP attempt limits and allow only one concurrent consumption', async () => {
  const key = randomBytes(32);
  const initial = createSeed();
  const code = '735281';
  initial.verifications.push({
    email,
    purpose: 'register',
    codeHash: hashCode(code),
    sentAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    attempts: 0,
  });
  let revision = 1;
  let content = Buffer.from(encryptDatabase(initial, key)).toString('base64');
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (!String(url).includes('/contents/')) return Response.json({ private: true });
    if (init?.method !== 'PUT')
      return Response.json({ type: 'file', encoding: 'base64', content, sha: `sha-${revision}` });
    const body = JSON.parse(init.body as string);
    if (body.sha !== `sha-${revision}`) return Response.json({}, { status: 409 });
    content = body.content;
    revision++;
    return Response.json({});
  }) as typeof fetch;
  const store = createGithubStore({
    token: 'test',
    owner: 'test',
    repo: 'private-data',
    branch: 'main',
    file: 'academy.enc.json',
    key,
    fetch: fakeFetch,
  });
  const failed = await Promise.all(
    Array.from({ length: 6 }, () => store.mutate((data) => consumeCode(data, email, 'register', '000000'))),
  );
  assert.ok(failed.every((value) => value === false));
  assert.equal((await store.read()).verifications[0].attempts, 5);
  assert.equal(await store.mutate((data) => consumeCode(data, email, 'register', code)), false);
  await store.mutate((data) => {
    data.verifications[0].attempts = 0;
  });
  const doubleSubmit = await Promise.all(
    Array.from({ length: 2 }, () => store.mutate((data) => consumeCode(data, email, 'register', code))),
  );
  assert.equal(doubleSubmit.filter(Boolean).length, 1);
});
