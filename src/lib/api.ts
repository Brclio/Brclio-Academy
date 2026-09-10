import { z, ZodError } from 'zod';
import type { Article, Database, Lesson } from './types';
import type { Store } from './store';
import { getStore } from './store';
import { login, register, resetPassword, sendVerification, SESSION_SECONDS } from './auth';
import {
  assertOrigin,
  clientKey,
  currentUser,
  HttpError,
  newId,
  readJson,
  requireUser,
  safeUser,
  sessionCookie,
  sessionHash,
  takeRateLimit,
} from './security';
import {
  articleSchema,
  bookmarkSchema,
  columnSchema,
  courseSchema,
  loginSchema,
  noteSchema,
  progressSchema,
  registerSchema,
  resetSchema,
  sendCodeSchema,
  vipSchema,
} from './validation';

const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
function visibleArticle(data: Database, article: Article): boolean {
  return (
    article.published &&
    (!article.columnId || data.columns.some((c) => c.id === article.columnId && c.published))
  );
}
function findLesson(data: Database, courseId: string, lessonId: string): Lesson {
  const course = data.courses.find((c) => c.id === courseId && c.published);
  const lesson = course?.chapters.flatMap((c) => c.lessons).find((l) => l.id === lessonId);
  if (!lesson) throw new HttpError(404, '课程或课时不存在');
  return lesson;
}
function audit(
  data: Database,
  actorId: string,
  action: string,
  targetId: string,
  eventId: string,
  at: string,
): void {
  data.audit.unshift({ id: eventId, actorId, action, targetId, at });
  data.audit = data.audit.slice(0, 2000);
}
export async function handleApi(request: Request, injectedStore?: Store): Promise<Response> {
  try {
    const route = new URL(request.url).pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
    const method = request.method;
    if (!['GET', 'POST'].includes(method))
      return json({ error: '不支持此请求方法' }, 405, { Allow: 'GET, POST' });
    if (method === 'POST') assertOrigin(request);
    const store = injectedStore ?? (await getStore());
    if (method === 'GET' && route === 'catalog') {
      const data = await store.read();
      return json({
        courses: data.courses
          .filter((c) => c.published)
          .map((c) => ({
            ...c,
            chapters: c.chapters.map((chapter) => ({
              id: chapter.id,
              title: chapter.title,
              lessons: chapter.lessons.map(({ id, title, kind, duration }) => ({
                id,
                title,
                kind,
                duration,
              })),
            })),
          })),
        articles: data.articles
          .filter((a) => visibleArticle(data, a))
          .map(({ content: _content, ...article }) => article),
        columns: data.columns.filter((c) => c.published),
      });
    }
    if (method === 'GET' && route === 'me') {
      const user = currentUser(await store.read(), request);
      return json({ user: user ? safeUser(user) : null });
    }
    if (method === 'POST' && route === 'auth/send-code') {
      const input = sendCodeSchema.parse(await readJson(request, 5000));
      await sendVerification(store, input.email, input.purpose, clientKey(request));
      return json({ message: '验证码已发送，请查收邮箱。10 分钟内有效。' });
    }
    if (method === 'POST' && (route === 'auth/register' || route === 'auth/login')) {
      const body = await readJson(request, 5000);
      const result =
        route === 'auth/register'
          ? await register(store, registerSchema.parse(body), clientKey(request))
          : await login(store, loginSchema.parse(body), clientKey(request));
      return json({ user: result.user }, 200, { 'Set-Cookie': sessionCookie(result.token, SESSION_SECONDS) });
    }
    if (method === 'POST' && route === 'auth/logout') {
      const hash = sessionHash(request);
      if (hash)
        await store.mutate((data) => {
          data.sessions = data.sessions.filter((s) => s.tokenHash !== hash);
        });
      return json({ success: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (method === 'POST' && route === 'auth/reset') {
      await resetPassword(store, resetSchema.parse(await readJson(request, 5000)), clientKey(request));
      return json({ success: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (method === 'GET' && route === 'dashboard') {
      const data = await store.read();
      const user = requireUser(data, request);
      const visible = (courseId: string, lessonId?: string) =>
        data.courses.some(
          (c) =>
            c.id === courseId &&
            c.published &&
            (!lessonId || c.chapters.some((ch) => ch.lessons.some((l) => l.id === lessonId))),
        );
      return json({
        progress: data.progress.filter((p) => p.userId === user.id && visible(p.courseId, p.lessonId)),
        notes: data.notes.filter((n) => n.userId === user.id && visible(n.courseId, n.lessonId)),
        bookmarks: data.bookmarks
          .filter((b) => b.userId === user.id && visible(b.courseId))
          .map((b) => b.courseId),
      });
    }
    const lessonRoute = /^lessons\/([a-z0-9_-]+)\/([a-z0-9_-]+)$/.exec(route);
    if (method === 'GET' && lessonRoute) {
      const data = await store.read();
      const user = requireUser(data, request, 'vip');
      const [, courseId, lessonId] = lessonRoute;
      const lesson = findLesson(data, courseId, lessonId);
      return json({
        lesson,
        progress:
          data.progress.find(
            (p) => p.userId === user.id && p.courseId === courseId && p.lessonId === lessonId,
          ) ?? null,
        note:
          data.notes.find(
            (n) => n.userId === user.id && n.courseId === courseId && n.lessonId === lessonId,
          ) ?? null,
      });
    }
    if (method === 'POST' && route === 'progress') {
      const input = progressSchema.parse(await readJson(request, 5000));
      const at = new Date().toISOString();
      const result = await store.mutate((data) => {
        const user = requireUser(data, request, 'vip');
        const lesson = findLesson(data, input.courseId, input.lessonId);
        if (input.videoIndex >= Math.max(1, lesson.videos.length)) throw new HttpError(400, '视频序号不正确');
        if (!takeRateLimit(data, `progress:${user.id}`, 180, 60000)) return null;
        const old = data.progress.find(
          (p) => p.userId === user.id && p.courseId === input.courseId && p.lessonId === input.lessonId,
        );
        const { resetCompleted, ...savedInput } = input;
        const progress = {
          ...savedInput,
          userId: user.id,
          updatedAt: at,
          completed: resetCompleted ? input.completed : input.completed || old?.completed || false,
        };
        if (old) Object.assign(old, progress);
        else data.progress.push(progress);
        return progress;
      });
      if (!result) throw new HttpError(429, '保存过于频繁，请稍后再试');
      return json({ progress: result });
    }
    if (method === 'POST' && route === 'notes') {
      const input = noteSchema.parse(await readJson(request, 100000));
      const at = new Date().toISOString();
      const id = newId();
      const result = await store.mutate((data) => {
        const user = requireUser(data, request, 'vip');
        findLesson(data, input.courseId, input.lessonId);
        if (!takeRateLimit(data, `notes:${user.id}`, 30, 60000)) return null;
        const old = data.notes.find(
          (n) => n.userId === user.id && n.courseId === input.courseId && n.lessonId === input.lessonId,
        );
        const note = { ...input, id: old?.id ?? id, userId: user.id, updatedAt: at };
        if (old) Object.assign(old, note);
        else data.notes.push(note);
        return note;
      });
      if (!result) throw new HttpError(429, '保存过于频繁，请稍后再试');
      return json({ note: result });
    }
    if (method === 'POST' && route === 'bookmarks') {
      const input = bookmarkSchema.parse(await readJson(request, 5000));
      const result = await store.mutate((data) => {
        const user = requireUser(data, request);
        if (!data.courses.some((c) => c.id === input.courseId && c.published))
          throw new HttpError(404, '课程不存在');
        if (!takeRateLimit(data, `bookmarks:${user.id}`, 60, 60000)) return null;
        const index = data.bookmarks.findIndex((b) => b.userId === user.id && b.courseId === input.courseId);
        if (index >= 0) data.bookmarks.splice(index, 1);
        else data.bookmarks.push({ userId: user.id, courseId: input.courseId });
        return { bookmarked: index < 0 };
      });
      if (!result) throw new HttpError(429, '操作过于频繁，请稍后再试');
      return json(result);
    }
    const articleRoute = /^articles\/([a-z0-9_-]+)$/.exec(route);
    if (method === 'GET' && articleRoute) {
      const data = await store.read();
      const article = data.articles.find((a) => a.id === articleRoute[1] && visibleArticle(data, a));
      if (!article) throw new HttpError(404, '文章不存在');
      if (article.access === 'vip') requireUser(data, request, 'vip');
      return json({ article });
    }
    if (method === 'GET' && route === 'admin') {
      const data = await store.read();
      requireUser(data, request, 'admin');
      return json({
        users: data.users.map(safeUser),
        courses: data.courses,
        articles: data.articles,
        columns: data.columns,
        audit: data.audit,
      });
    }
    if (method === 'POST' && route.startsWith('admin/')) {
      // Authenticate before reading or validating a potentially large editor payload.
      requireUser(await store.read(), request, 'admin');
      const body = await readJson(request);
      const eventId = newId();
      const at = new Date().toISOString();
      if (route === 'admin/vip') {
        const input = vipSchema.parse(body);
        const result = await store.mutate((data) => {
          const admin = requireUser(data, request, 'admin');
          const user = data.users.find((u) => u.id === input.userId);
          if (!user) throw new HttpError(404, '用户不存在');
          user.vipExpiresAt = input.vipExpiresAt;
          audit(data, admin.id, input.vipExpiresAt ? 'vip.set' : 'vip.revoke', user.id, eventId, at);
          return safeUser(user);
        });
        return json({ user: result });
      }
      if (route === 'admin/course') {
        const { course } = z.object({ course: courseSchema }).parse(body);
        course.updatedAt = at;
        await store.mutate((data) => {
          const admin = requireUser(data, request, 'admin');
          const index = data.courses.findIndex((c) => c.id === course.id);
          if (index >= 0) data.courses[index] = course;
          else data.courses.push(course);
          audit(data, admin.id, 'course.save', course.id, eventId, at);
        });
        return json({ course });
      }
      if (route === 'admin/article') {
        const { article } = z.object({ article: articleSchema }).parse(body);
        article.updatedAt = at;
        await store.mutate((data) => {
          const admin = requireUser(data, request, 'admin');
          if (article.columnId && !data.columns.some((c) => c.id === article.columnId))
            throw new HttpError(400, '指定专栏不存在');
          const index = data.articles.findIndex((a) => a.id === article.id);
          if (index >= 0) data.articles[index] = article;
          else data.articles.push(article);
          audit(data, admin.id, 'article.save', article.id, eventId, at);
        });
        return json({ article });
      }
      if (route === 'admin/column') {
        const { column } = z.object({ column: columnSchema }).parse(body);
        await store.mutate((data) => {
          const admin = requireUser(data, request, 'admin');
          const index = data.columns.findIndex((c) => c.id === column.id);
          if (index >= 0) data.columns[index] = column;
          else data.columns.push(column);
          audit(data, admin.id, 'column.save', column.id, eventId, at);
        });
        return json({ column });
      }
    }
    throw new HttpError(404, '接口不存在');
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError) return json({ error: error.issues[0]?.message ?? '输入格式不正确' }, 400);
    console.error('Academy API error:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: '服务暂时不可用，请稍后重试或联系管理员' }, 503);
  }
}
