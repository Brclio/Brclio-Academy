import { access, cp, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standalone = path.join(root, '.next', 'standalone');
const entry = path.join(standalone, 'server.js');

try {
  await access(entry, constants.R_OK);
  await access(path.join(root, '.next', 'static'), constants.R_OK);
} catch {
  console.error('找不到完整的生产构建。请先在项目目录执行 npm run build，再执行 npm start。');
  process.exit(1);
}

// Next's standalone entry changes cwd. Load the project-root environment first,
// and preserve the original meaning of a relative SQLite location.
process.env.NODE_ENV = 'production';
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(root, false);
if ((process.env.DATA_DRIVER ?? 'sqlite') === 'sqlite') {
  const configured = process.env.SQLITE_PATH ?? '.data/academy.sqlite';
  process.env.SQLITE_PATH = configured === ':memory:' ? configured : path.resolve(root, configured);
}

await mkdir(path.join(standalone, 'public'), { recursive: true });
await mkdir(path.join(standalone, '.next', 'static'), { recursive: true });
await cp(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true, force: true });
await cp(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), {
  recursive: true,
  force: true,
});

const child = spawn(process.execPath, [entry], {
  cwd: root,
  env: { ...process.env, HOSTNAME: process.env.HOSTNAME ?? '0.0.0.0', PORT: process.env.PORT ?? '3000' },
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    child.kill(signal);
  });
child.once('error', (error) => {
  console.error(`无法启动服务：${error.message}`);
  process.exitCode = 1;
});
child.once('exit', (code, signal) => {
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1);
});
