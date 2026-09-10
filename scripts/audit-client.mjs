import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.next', 'static');
// Acceptance canaries: supplied video IDs and names of server-only credentials.
// This audits browser assets, not the private server bundle or the source seed.
const needles = [
  'u13DKz6cnbo',
  'QqvgGFEr1j0',
  'hJJ-gBs-xSg',
  'fCwJtJnDw1s',
  '0RCQsNCF2Ag',
  'cRjBvVDkCNU',
  'CJQdwZZJWko',
  'PDDhRaSVh2A',
  '7U6_pmCI3xw',
  'Zu0w5HIb8tI',
  'wEJsQWCvTTc',
  'dg0xrWk6P5M',
  'MjlCEPIPHks',
  'yofJ2wmht6o',
  '91pIByAevSQ',
  '3U7j6oRsVgY',
  'UZaiN03ilFg',
  'wjTz6ywBGz8',
  'J-VpB3F0LI4',
  'GH_DATA_TOKEN',
  'DATA_ENCRYPTION_KEY',
  'SMTP_PASS',
  'RESEND_API_KEY',
];
let scanned = 0;
const failures = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filename);
    else if (/\.(?:js|map|json)$/.test(entry.name)) {
      scanned++;
      const content = await readFile(filename, 'utf8');
      const found = needles.filter((needle) => content.includes(needle));
      if (found.length) failures.push({ file: path.relative(root, filename), canaries: found });
    }
  }
}
try {
  await walk(output);
  if (!scanned) throw new Error('没有可检查的浏览器 JavaScript，请先执行 npm run build。');
  if (failures.length) {
    console.error('浏览器构建发现仅应在服务端出现的内容：');
    for (const failure of failures) console.error(`${failure.file}: ${failure.canaries.join(', ')}`);
    process.exitCode = 1;
  } else console.info(`客户端资源检查通过：${scanned} 个文件中未发现 19 个课程视频 ID 或服务端凭证变量名。`);
} catch (error) {
  console.error(`无法完成客户端检查：${error.message}`);
  process.exitCode = 1;
}
