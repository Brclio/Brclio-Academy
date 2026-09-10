import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmod, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Database } from './types';
import { createSeed } from './seed';
import { databaseSchema } from './validation';

export interface Store {
  read(): Promise<Database>;
  /** Callbacks must be synchronous and side-effect free: GitHub can retry them. */
  mutate<T>(callback: (data: Database) => T): Promise<T>;
}

export function encryptionKey(value = process.env.DATA_ENCRYPTION_KEY): Buffer {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value))
    throw new Error('DATA_ENCRYPTION_KEY 必须是 base64 编码的 32 字节密钥');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY 长度错误');
  return key;
}

export function encryptDatabase(data: Database, key = encryptionKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('brclio-academy-v1'));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return JSON.stringify({
    format: 'brclio-academy-v1',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  });
}

export function decryptDatabase(value: string, key = encryptionKey()): Database {
  const envelope = JSON.parse(value);
  if (envelope.format !== 'brclio-academy-v1') throw new Error('不支持的数据文件格式');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAAD(Buffer.from('brclio-academy-v1'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return databaseSchema.parse(
    JSON.parse(
      Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString(
        'utf8',
      ),
    ),
  );
}

export async function createSqliteStore(
  filename: string,
  seed: () => Database = createSeed,
): Promise<Store & { close(): void }> {
  if (process.env.VERCEL) throw new Error('Vercel 不支持持久化本地 SQLite，请使用 DATA_DRIVER=github');
  // Dynamic import keeps SQLite entirely out of the GitHub / Vercel code path.
  const { DatabaseSync } = await import('node:sqlite');
  if (filename !== ':memory:')
    await mkdir(path.dirname(path.resolve(filename)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  if (filename !== ':memory:') await chmod(filename, 0o600);
  db.exec(
    'PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS academy_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);',
  );
  db.prepare('INSERT OR IGNORE INTO academy_state(id,payload) VALUES(1,?)').run(JSON.stringify(seed()));
  const read = () =>
    databaseSchema.parse(
      JSON.parse(
        (db.prepare('SELECT payload FROM academy_state WHERE id=1').get() as { payload: string }).payload,
      ),
    );
  return {
    async read() {
      return read();
    },
    async mutate<T>(callback: (data: Database) => T): Promise<T> {
      db.exec('BEGIN IMMEDIATE');
      try {
        const state = read();
        const result = callback(state);
        if (result && typeof (result as { then?: unknown }).then === 'function')
          throw new Error('Store mutations must be synchronous');
        db.prepare('UPDATE academy_state SET payload=? WHERE id=1').run(
          JSON.stringify(databaseSchema.parse(state)),
        );
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close() {
      db.close();
    },
  };
}

type GithubOptions = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  file: string;
  key: Buffer;
  fetch?: typeof fetch;
  seed?: () => Database;
};
export function createGithubStore(options: GithubOptions): Store {
  const request = options.fetch ?? fetch;
  const base = `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}`;
  const file = options.file.split('/').map(encodeURIComponent).join('/');
  const headers = {
    Authorization: `Bearer ${options.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
  async function snapshot(): Promise<{ data: Database; sha?: string }> {
    const metadata = await request(base, { headers, cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!metadata.ok) throw new Error(`无法验证 GitHub 数据仓库 (${metadata.status})`);
    if (!(await metadata.json()).private) throw new Error('GitHub 数据仓库必须为 private，已拒绝读写');
    const result = await request(`${base}/contents/${file}?ref=${encodeURIComponent(options.branch)}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (result.status === 404) return { data: (options.seed ?? createSeed)() };
    if (!result.ok) throw new Error(`GitHub 数据读取失败 (${result.status})`);
    const item = await result.json();
    if (item.type !== 'file' || item.encoding !== 'base64' || !item.content)
      throw new Error('GitHub 数据文件格式不正确或已超过 Contents API 限制');
    return {
      data: decryptDatabase(Buffer.from(item.content, 'base64').toString('utf8'), options.key),
      sha: item.sha,
    };
  }
  return {
    async read() {
      return (await snapshot()).data;
    },
    async mutate<T>(callback: (data: Database) => T): Promise<T> {
      for (let attempt = 0; attempt < 7; attempt++) {
        const current = await snapshot();
        const before = JSON.stringify(current.data);
        const result = callback(current.data);
        if (result && typeof (result as { then?: unknown }).then === 'function')
          throw new Error('Store mutations must be synchronous');
        const validated = databaseSchema.parse(current.data);
        // Blocked rate-limit calls and other no-op mutations must not create Git commits.
        if (current.sha && JSON.stringify(validated) === before) return result;
        const encrypted = encryptDatabase(validated, options.key);
        // GitHub content API stops returning embedded base64 beyond 1 MB.
        if (Buffer.byteLength(encrypted) > 950000)
          throw new Error('GitHub 数据接近 1 MB 限制，请导出并迁移到服务器 SQLite');
        const response = await request(`${base}/contents/${file}`, {
          method: 'PUT',
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            message: 'Update encrypted academy data',
            content: Buffer.from(encrypted).toString('base64'),
            branch: options.branch,
            ...(current.sha ? { sha: current.sha } : {}),
          }),
        });
        if (response.ok) return result;
        if (response.status !== 409 && response.status !== 422)
          throw new Error(`GitHub 数据写入失败 (${response.status})`);
        if (attempt < 6)
          await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1) + Math.random() * 80));
      }
      throw new Error('数据同时写入较多，请稍后重试');
    },
  };
}

let singleton: Promise<Store> | undefined;
export function getStore(): Promise<Store> {
  if (!singleton)
    singleton = (async () => {
      const driver = process.env.DATA_DRIVER ?? 'sqlite';
      if (driver === 'sqlite') return createSqliteStore(process.env.SQLITE_PATH ?? '.data/academy.sqlite');
      if (driver !== 'github') throw new Error('DATA_DRIVER 仅支持 sqlite 或 github');
      for (const name of ['GH_DATA_TOKEN', 'GH_DATA_OWNER', 'GH_DATA_REPO'])
        if (!process.env[name]) throw new Error(`缺少 ${name}`);
      return createGithubStore({
        token: process.env.GH_DATA_TOKEN!,
        owner: process.env.GH_DATA_OWNER!,
        repo: process.env.GH_DATA_REPO!,
        branch: process.env.GH_DATA_BRANCH ?? 'main',
        file: process.env.GH_DATA_PATH ?? 'academy.enc.json',
        key: encryptionKey(),
      });
    })().catch((error) => {
      singleton = undefined;
      throw error;
    });
  return singleton;
}
