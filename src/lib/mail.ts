import nodemailer from 'nodemailer';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function sendCodeMail(
  email: string,
  code: string,
  purpose: 'register' | 'reset',
): Promise<void> {
  const transport = process.env.MAIL_TRANSPORT;
  const subject = purpose === 'register' ? 'Brclio Academy 注册验证码' : 'Brclio Academy 重置密码验证码';
  const text = `你的验证码是：${code}\n\n10 分钟内有效，请勿分享。若非本人操作，请忽略此邮件。\n\nBrclio Academy`;
  if (transport === 'console') {
    if (process.env.NODE_ENV === 'production') throw new Error('生产环境禁止使用 console 邮件');
    if (process.env.DEV_MAIL_FILE) {
      const allowed = path.resolve('.data');
      const file = path.resolve(process.env.DEV_MAIL_FILE);
      if (!file.startsWith(`${allowed}${path.sep}`))
        throw new Error('DEV_MAIL_FILE 必须位于项目 .data 目录内');
      await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      await appendFile(file, `${JSON.stringify({ email, purpose, code, at: new Date().toISOString() })}\n`, {
        mode: 0o600,
      });
    } else console.info(`[DEV MAIL] ${email} ${subject}: ${code}`);
    return;
  }
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error('缺少 MAIL_FROM');
  if (transport === 'resend') {
    if (!process.env.RESEND_API_KEY) throw new Error('缺少 RESEND_API_KEY');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject, text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Resend 邮件发送失败 (${response.status})`);
    return;
  }
  if (transport !== 'smtp' || !process.env.SMTP_HOST)
    throw new Error('请配置 MAIL_TRANSPORT=smtp 或 resend；本地开发可显式使用 console');
  const mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.SMTP_SECURE !== 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  await mailer.sendMail({ from, to: email, subject, text });
}
