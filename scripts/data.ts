import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decryptDatabase, encryptDatabase, encryptionKey, getStore } from '../src/lib/store';

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { file: { type: 'string' }, replace: { type: 'boolean', default: false } },
  });
  const action = positionals[0];
  if (!['export', 'import'].includes(action) || !values.file)
    throw new Error(
      '用法：npm run data:export -- --file .data/backup.enc.json 或 npm run data:import -- --file .data/backup.enc.json --replace',
    );
  const key = encryptionKey();
  const filename = path.resolve(values.file);
  const store = await getStore();
  if (action === 'export') {
    await mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
    await writeFile(filename, encryptDatabase(await store.read(), key), { mode: 0o600, flag: 'wx' });
    console.info(`加密备份已导出：${filename}。请单独安全保存 DATA_ENCRYPTION_KEY。`);
  } else {
    if (!values.replace) throw new Error('导入会替换当前全部数据，请备份后使用 --replace');
    const restored = decryptDatabase(await readFile(filename, 'utf8'), key);
    // Sessions and OTPs are deliberately invalidated on restore.
    restored.sessions = [];
    restored.verifications = [];
    await store.mutate((data) => {
      Object.assign(data, structuredClone(restored));
    });
    console.info(
      `已从加密备份恢复 ${restored.users.length} 位用户、${restored.courses.length} 门课程。所有用户需要重新登录。`,
    );
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
