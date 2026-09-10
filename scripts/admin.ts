import { parseArgs } from 'node:util';
import { getStore } from '../src/lib/store';
import { emailSchema, passwordSchema } from '../src/lib/validation';
import { hashPassword, newId } from '../src/lib/security';

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string', default: '管理员' },
      promote: { type: 'boolean', default: false },
    },
  });
  const email = emailSchema.parse(values.email);
  const name = values.name.trim();
  if (!name || name.length > 80) throw new Error('--name 应为 1–80 个字符');
  const store = await getStore();
  const passwordHash = values.promote
    ? null
    : await hashPassword(passwordSchema.parse(process.env.ADMIN_PASSWORD));
  const id = newId();
  const eventId = newId();
  const at = new Date().toISOString();
  await store.mutate((data) => {
    const existing = data.users.find((u) => u.email === email);
    if (values.promote) {
      if (!existing?.verifiedAt) throw new Error('--promote 仅用于已经通过邮箱验证的现有账号');
      existing.role = 'admin';
      data.audit.unshift({ id: eventId, actorId: 'cli', action: 'admin.promote', targetId: existing.id, at });
    } else {
      if (existing) throw new Error('账号已存在。若已验证邮箱，请使用 --promote；本命令不会覆盖现有密码');
      data.users.push({
        id,
        email,
        name,
        passwordHash: passwordHash!,
        role: 'admin',
        verifiedAt: at,
        vipExpiresAt: null,
        createdAt: at,
      });
      data.audit.unshift({ id: eventId, actorId: 'cli', action: 'admin.bootstrap', targetId: id, at });
    }
  });
  console.info(
    `管理员已${values.promote ? '提升' : '创建'}：${email}。VIP 未自动开通，可在后台为自己设置有效期。`,
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
