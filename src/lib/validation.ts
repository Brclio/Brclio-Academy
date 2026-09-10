import { z } from 'zod';

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);
const short = z.string().trim().min(1).max(300);
const color = z.enum(['blue', 'yellow', 'green', 'pink']);
const iso = z.iso.datetime({ offset: true });
export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const passwordSchema = z.string().min(10, '密码至少 10 位').max(128, '密码最多 128 位');
const resourceUrl = z
  .url()
  .max(2000)
  .refine((value) => /^https?:\/\//.test(value), '仅支持 http/https 链接');
export const lessonSchema = z.object({
  id,
  title: short,
  duration: z.string().max(60),
  kind: z.enum(['video', 'article']),
  content: z.string().max(100000),
  videos: z.array(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{11}$/), title: short })).max(30),
  resources: z.array(z.object({ title: short, url: resourceUrl })).max(100),
});
export const courseSchema = z
  .object({
    id,
    title: short,
    subtitle: z.string().max(500),
    description: z.string().max(10000),
    category: short,
    level: short,
    duration: z.string().max(60),
    color,
    cover: z.string().max(500),
    featured: z.boolean(),
    published: z.boolean(),
    demo: z.boolean(),
    outcomes: z.array(short).max(30),
    chapters: z.array(z.object({ id, title: short, lessons: z.array(lessonSchema).max(200) })).max(100),
    updatedAt: iso,
  })
  .superRefine((course, ctx) => {
    const chapters = course.chapters.map((x) => x.id);
    const lessons = course.chapters.flatMap((x) => x.lessons.map((l) => l.id));
    if (new Set(chapters).size !== chapters.length || new Set(lessons).size !== lessons.length)
      ctx.addIssue({ code: 'custom', message: '章节和课时 ID 必须在同一课程中唯一' });
  });
export const articleSchema = z.object({
  id,
  title: short,
  summary: z.string().max(3000),
  content: z.string().max(200000),
  category: short,
  access: z.enum(['public', 'vip']),
  columnId: id.nullable(),
  order: z.number().int().min(0).max(10000),
  published: z.boolean(),
  readMinutes: z.number().int().min(1).max(1000),
  updatedAt: iso,
});
export const columnSchema = z.object({
  id,
  title: short,
  description: z.string().max(5000),
  color,
  published: z.boolean(),
});
export const userSchema = z.object({
  id,
  email: emailSchema,
  name: z.string().min(1).max(80),
  passwordHash: z.string().max(500),
  role: z.enum(['user', 'admin']),
  verifiedAt: iso,
  vipExpiresAt: iso.nullable(),
  createdAt: iso,
});
export const databaseSchema = z
  .object({
    version: z.literal(1),
    users: z.array(userSchema),
    sessions: z.array(z.object({ tokenHash: z.string(), userId: id, expiresAt: iso })),
    verifications: z.array(
      z.object({
        email: emailSchema,
        purpose: z.enum(['register', 'reset']),
        codeHash: z.string(),
        expiresAt: iso,
        attempts: z.number().int().nonnegative(),
        sentAt: iso,
      }),
    ),
    rateLimits: z.array(z.object({ key: z.string(), count: z.number().int().nonnegative(), resetAt: iso })),
    courses: z.array(courseSchema),
    articles: z.array(articleSchema),
    columns: z.array(columnSchema),
    progress: z.array(
      z.object({
        userId: id,
        courseId: id,
        lessonId: id,
        videoIndex: z.number().int().nonnegative(),
        seconds: z.number().nonnegative(),
        completed: z.boolean(),
        updatedAt: iso,
      }),
    ),
    notes: z.array(
      z.object({ id, userId: id, courseId: id, lessonId: id, body: z.string().max(30000), updatedAt: iso }),
    ),
    bookmarks: z.array(z.object({ userId: id, courseId: id })),
    audit: z.array(z.object({ id, actorId: z.string(), action: z.string(), targetId: z.string(), at: iso })),
  })
  .superRefine((data, ctx) => {
    for (const field of ['users', 'courses', 'articles', 'columns'] as const)
      if (new Set(data[field].map((x) => x.id)).size !== data[field].length)
        ctx.addIssue({ code: 'custom', message: `${field} 存在重复 ID` });
    if (new Set(data.users.map((x) => x.email)).size !== data.users.length)
      ctx.addIssue({ code: 'custom', message: '邮箱必须唯一' });
  });
export const sendCodeSchema = z.object({ email: emailSchema, purpose: z.enum(['register', 'reset']) });
export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(80),
  password: passwordSchema,
  code: z.string().regex(/^\d{6}$/),
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const resetSchema = registerSchema.pick({ email: true, password: true, code: true });
export const progressSchema = z.object({
  courseId: id,
  lessonId: id,
  videoIndex: z.number().int().min(0).max(29),
  seconds: z.number().finite().min(0).max(86400),
  completed: z.boolean(),
  resetCompleted: z.boolean().optional(),
});
export const noteSchema = z.object({ courseId: id, lessonId: id, body: z.string().max(30000) });
export const bookmarkSchema = z.object({ courseId: id });
export const vipSchema = z.object({ userId: id, vipExpiresAt: iso.nullable() });
