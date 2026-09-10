'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  Crown,
  FileText,
  FolderOpen,
  History,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { Article, Audit, Chapter, Column, Course, Lesson, SafeUser } from '@/lib/types';
import './admin.css';

type AdminData = {
  users: SafeUser[];
  courses: Course[];
  articles: Article[];
  columns: Column[];
  audit: Audit[];
};
type ContentKind = 'course' | 'article' | 'column';
type SaveContent = (kind: ContentKind, value: Course | Article | Column) => Promise<boolean>;
type Tab = 'users' | 'courses' | 'articles' | 'columns' | 'audit';
const tabs = [
  { id: 'users', label: '成员与 VIP', icon: Users },
  { id: 'courses', label: '课程管理', icon: BookOpen },
  { id: 'articles', label: '文章', icon: FileText },
  { id: 'columns', label: '专栏', icon: FolderOpen },
  { id: 'audit', label: '操作记录', icon: History },
] as const;
const coverThemes = [
  { value: 'film', label: '影片创作' },
  { value: 'python', label: 'Python 编程' },
  { value: 'web', label: 'Web 开发' },
  { value: 'workflow', label: '效率工作流' },
] as const;
const colors = [
  { value: 'blue', label: '晴空蓝' },
  { value: 'yellow', label: '麦穗黄' },
  { value: 'green', label: '鼠尾草绿' },
  { value: 'pink', label: '蔷薇粉' },
] as const;
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const clone = <T,>(value: T): T => structuredClone(value);
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : '暂时无法完成操作，请稍后重试。';
const dateText = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '未开通';
function localDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...(body === undefined
      ? {}
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
  return payload as T;
}
function move<T>(items: T[], index: number, direction: number): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
function youtubeId(value: string): string {
  const raw = value.trim();
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const candidate =
      host === 'youtu.be'
        ? url.pathname.split('/')[1]
        : ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)
          ? url.searchParams.get('v') ||
            (/^\/(embed|shorts|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : '')
          : '';
    return candidate && /^[\w-]{11}$/.test(candidate) ? candidate : '';
  } catch {
    return '';
  }
}

function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field${wide ? ' admin-field-wide' : ''}`}>
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
function OrderButtons({
  index,
  length,
  onMove,
  label,
}: {
  index: number;
  length: number;
  onMove: (direction: number) => void;
  label: string;
}) {
  return (
    <span className="admin-order">
      <button
        className="btn small admin-icon"
        type="button"
        title={`上移${label}`}
        aria-label={`上移${label}`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp size={16} />
      </button>
      <button
        className="btn small admin-icon"
        type="button"
        title={`下移${label}`}
        aria-label={`下移${label}`}
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={16} />
      </button>
    </span>
  );
}
function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return confirming ? (
    <span className="admin-inline-confirm">
      <span>移除{label}？</span>
      <button className="btn small danger" type="button" onClick={onRemove}>
        移除
      </button>
      <button className="btn small" type="button" onClick={() => setConfirming(false)}>
        取消
      </button>
    </span>
  ) : (
    <button
      className="btn small admin-icon"
      type="button"
      aria-label={`移除${label}`}
      title={`移除${label}`}
      onClick={() => setConfirming(true)}
    >
      <Trash2 size={16} />
    </button>
  );
}
function LessonDetails({ lesson, children }: { lesson: Lesson; children: ReactNode }) {
  const [expanded, setExpanded] = useState(!lesson.title);
  return (
    <details
      className="admin-lesson-details"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        <ChevronRight size={16} />
        编辑课时内容
        <span className="muted">
          {lesson.kind === 'video' ? `${lesson.videos.length} 个视频` : '图文课时'}
        </span>
      </summary>
      {children}
    </details>
  );
}

function useDraft<T>() {
  const [draft, setDraft] = useState<T | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<T | undefined>(undefined);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  const select = (next: T) => {
    if (dirty) {
      setPending(clone(next));
      return;
    }
    setDraft(clone(next));
    setDirty(false);
    setPending(undefined);
  };
  const edit = (fn: (current: T) => T) => {
    setDraft((current) => (current ? fn(current) : current));
    setDirty(true);
  };
  const saved = (value: T) => {
    setDraft(clone(value));
    setDirty(false);
    setPending(undefined);
  };
  const guard =
    pending !== undefined ? (
      <div className="admin-notice" role="status">
        <span>当前内容还有未保存的修改。</span>
        <div className="admin-actions">
          <button className="btn small" type="button" onClick={() => setPending(undefined)}>
            继续编辑
          </button>
          <button
            className="btn small danger"
            type="button"
            onClick={() => {
              setDraft(pending);
              setPending(undefined);
              setDirty(false);
            }}
          >
            放弃修改并切换
          </button>
        </div>
      </div>
    ) : null;
  return { draft, dirty, select, edit, saved, guard };
}

function MemberRow({
  member,
  busy,
  onSave,
}: {
  member: SafeUser;
  busy: boolean;
  onSave: (userId: string, expiresAt: string | null) => Promise<boolean>;
}) {
  const [expiry, setExpiry] = useState(localDate(member.vipExpiresAt));
  const [revoke, setRevoke] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setExpiry(localDate(member.vipExpiresAt));
  }, [member.vipExpiresAt]);
  function addDays(days: number) {
    const base = Math.max(Date.now(), member.vipExpiresAt ? new Date(member.vipExpiresAt).getTime() : 0);
    setExpiry(localDate(new Date(base + days * 86_400_000).toISOString()));
    setError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const date = new Date(expiry);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      setError('请选择晚于当前时间的到期时间。');
      return;
    }
    setError('');
    if (await onSave(member.id, date.toISOString())) setRevoke(false);
  }
  return (
    <article className="admin-member">
      <div className="admin-member-info">
        <div className="admin-member-avatar" aria-hidden="true">
          {(member.name || member.email).slice(0, 1).toUpperCase()}
        </div>
        <div>
          <strong>{member.name || '未设置姓名'}</strong>
          <p className="muted admin-email">{member.email}</p>
          <div className="admin-meta">
            <span className={`badge ${member.isVip ? 'admin-vip-badge' : ''}`}>
              {member.role === 'admin'
                ? '管理员'
                : member.isVip
                  ? 'VIP 学员'
                  : member.vipExpiresAt
                    ? 'VIP 已到期'
                    : '普通成员'}
            </span>
            <span className="muted">注册于 {new Date(member.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>
      <form className="admin-member-form" onSubmit={submit}>
        <Field label="VIP 到期时间" hint={`当前：${dateText(member.vipExpiresAt)} · 按本地时区显示`}>
          <input
            type="datetime-local"
            value={expiry}
            onChange={(event) => {
              setExpiry(event.target.value);
              setError('');
            }}
            required
            disabled={busy}
          />
        </Field>
        <div className="admin-actions admin-member-controls">
          <div className="admin-shortcuts" aria-label="延长有效期">
            {[30, 90, 365].map((days) => (
              <button
                className="btn small"
                type="button"
                key={days}
                disabled={busy}
                onClick={() => addDays(days)}
              >
                +{days} 天
              </button>
            ))}
          </div>
          <button className="btn primary small" disabled={busy} type="submit">
            <Check size={16} />
            {busy ? '保存中…' : '保存期限'}
          </button>
          {member.vipExpiresAt && (
            <button
              className="btn small danger"
              disabled={busy}
              type="button"
              onClick={() => setRevoke(!revoke)}
            >
              撤销 VIP
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        {revoke && (
          <div className="admin-notice admin-revoke">
            <span>撤销后，该成员将无法继续访问 VIP 内容。</span>
            <div className="admin-actions">
              <button
                className="btn danger small"
                disabled={busy}
                type="button"
                onClick={async () => {
                  if (await onSave(member.id, null)) setRevoke(false);
                }}
              >
                确认撤销
              </button>
              <button className="btn small" type="button" onClick={() => setRevoke(false)}>
                取消
              </button>
            </div>
          </div>
        )}
      </form>
    </article>
  );
}

function Members({
  users,
  busy,
  onSave,
}: {
  users: SafeUser[];
  busy: string;
  onSave: (id: string, expiry: string | null) => Promise<boolean>;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const visible = users.filter(
    (user) =>
      `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase().trim()) &&
      (filter === 'all' ||
        (filter === 'vip'
          ? user.isVip
          : filter === 'expired'
            ? user.vipExpiresAt && !user.isVip
            : !user.isVip)),
  );
  return (
    <section>
      <div className="section-head admin-section-head">
        <div>
          <h2>把学习机会，交到对的人手里</h2>
          <p className="muted">注册并验证邮箱后，成员会出现在这里。开通期限从当前有效期继续延长。</p>
        </div>
      </div>
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={18} />
          <input
            aria-label="搜索成员姓名或邮箱"
            placeholder="搜索姓名或邮箱"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select aria-label="筛选成员权限" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">全部成员 · {users.length}</option>
          <option value="vip">有效 VIP</option>
          <option value="expired">已到期 VIP</option>
          <option value="regular">无有效 VIP</option>
        </select>
      </div>
      <div className="admin-members panel">
        {visible.length ? (
          visible.map((member) => (
            <MemberRow key={member.id} member={member} busy={Boolean(busy)} onSave={onSave} />
          ))
        ) : (
          <div className="empty-state">
            <Users size={28} />
            <h3>没有匹配的成员</h3>
            <p>试试其他关键词，或切换成员筛选。</p>
          </div>
        )}
      </div>
      <p className="muted admin-footnote">
        时间以当前设备时区显示；保存后按实际到期时间自动限制访问。管理员拥有内容管理权限；进入课堂学习同样需要有效
        VIP。
      </p>
    </section>
  );
}

const newLesson = (): Lesson => ({
  id: id('lesson'),
  title: '',
  duration: '',
  kind: 'video',
  content: '',
  videos: [{ id: '', title: '视频 1' }],
  resources: [],
});
const newChapter = (): Chapter => ({ id: id('chapter'), title: '', lessons: [newLesson()] });
const newCourse = (): Course => ({
  id: id('course'),
  title: '',
  subtitle: '',
  description: '',
  category: '创作实践',
  level: '入门',
  duration: '',
  color: 'blue',
  cover: 'film',
  featured: false,
  published: false,
  demo: false,
  outcomes: [],
  chapters: [newChapter()],
  updatedAt: new Date().toISOString(),
});

function LessonEditor({ lesson, onChange }: { lesson: Lesson; onChange: (lesson: Lesson) => void }) {
  const change = (patch: Partial<Lesson>) => onChange({ ...lesson, ...patch });
  return (
    <div className="admin-lesson-body">
      <div className="form-grid">
        <Field label="课时标题">
          <input
            required
            value={lesson.title}
            placeholder="例如：准备脚本和分镜"
            onChange={(event) => change({ title: event.target.value })}
          />
        </Field>
        <Field label="课时类型">
          <select
            value={lesson.kind}
            onChange={(event) => change({ kind: event.target.value as Lesson['kind'] })}
          >
            <option value="video">视频课时</option>
            <option value="article">图文课时</option>
          </select>
        </Field>
        <Field label="时长 / 学习时间">
          <input
            value={lesson.duration}
            placeholder="例如：12 分钟"
            onChange={(event) => change({ duration: event.target.value })}
          />
        </Field>
      </div>
      {lesson.kind === 'video' && (
        <div className="admin-videos">
          <div className="admin-subhead">
            <h4>
              课时视频 <span className="muted">{lesson.videos.length}</span>
            </h4>
            <button
              className="btn small"
              type="button"
              onClick={() =>
                change({ videos: [...lesson.videos, { id: '', title: `视频 ${lesson.videos.length + 1}` }] })
              }
            >
              <Plus size={16} />
              添加视频
            </button>
          </div>
          <p className="muted admin-help">
            支持完整 YouTube 链接、分享短链或 11 位视频 ID。一个课时可按顺序播放多个视频。
          </p>
          {lesson.videos.map((video, index) => (
            <div className="admin-video-row" key={index}>
              <span className="admin-row-number">{String(index + 1).padStart(2, '0')}</span>
              <Field label="视频名称">
                <input
                  required
                  value={video.title}
                  onChange={(event) =>
                    change({
                      videos: lesson.videos.map((item, i) =>
                        i === index ? { ...item, title: event.target.value } : item,
                      ),
                    })
                  }
                  placeholder={`视频 ${index + 1}`}
                />
              </Field>
              <Field label="YouTube 链接或 ID">
                <input
                  required
                  value={video.id}
                  onChange={(event) =>
                    change({
                      videos: lesson.videos.map((item, i) =>
                        i === index ? { ...item, id: event.target.value } : item,
                      ),
                    })
                  }
                  placeholder="https://youtu.be/…"
                  spellCheck={false}
                />
              </Field>
              <div className="admin-actions">
                <OrderButtons
                  index={index}
                  length={lesson.videos.length}
                  label={`视频 ${index + 1}`}
                  onMove={(direction) => change({ videos: move(lesson.videos, index, direction) })}
                />
                <button
                  className="btn small admin-icon"
                  type="button"
                  aria-label={`移除视频 ${index + 1}`}
                  onClick={() => change({ videos: lesson.videos.filter((_, i) => i !== index) })}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          {!lesson.videos.length && (
            <p className="admin-notice">视频课时需要至少一个视频。也可以将课时类型切换为图文课时。</p>
          )}
        </div>
      )}
      <Field label={lesson.kind === 'article' ? '课时正文（Markdown）' : '课时说明与学习任务（Markdown）'}>
        <textarea
          rows={6}
          value={lesson.content}
          required={lesson.kind === 'article'}
          placeholder="## 本节学习目标\n\n在这里编写课程说明、练习任务或图文教程。"
          onChange={(event) => change({ content: event.target.value })}
        />
      </Field>
      <div className="admin-subhead">
        <h4>配套资料</h4>
        <button
          className="btn small"
          type="button"
          onClick={() => change({ resources: [...lesson.resources, { title: '', url: '' }] })}
        >
          <Plus size={16} />
          添加资料链接
        </button>
      </div>
      {lesson.resources.map((resource, index) => (
        <div className="admin-resource-row" key={index}>
          <Field label="资料名称">
            <input
              required
              value={resource.title}
              onChange={(event) =>
                change({
                  resources: lesson.resources.map((item, i) =>
                    i === index ? { ...item, title: event.target.value } : item,
                  ),
                })
              }
              placeholder="例如：分镜模板"
            />
          </Field>
          <Field label="资料链接">
            <input
              required
              type="url"
              value={resource.url}
              onChange={(event) =>
                change({
                  resources: lesson.resources.map((item, i) =>
                    i === index ? { ...item, url: event.target.value } : item,
                  ),
                })
              }
              placeholder="https://…"
            />
          </Field>
          <button
            className="btn small admin-icon"
            type="button"
            aria-label={`移除资料 ${index + 1}`}
            onClick={() => change({ resources: lesson.resources.filter((_, i) => i !== index) })}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function CourseEditor({ courses, busy, onSave }: { courses: Course[]; busy: boolean; onSave: SaveContent }) {
  const editor = useDraft<Course>();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const { draft, dirty } = editor;
  const change = (patch: Partial<Course>) => editor.edit((current) => ({ ...current, ...patch }));
  const changeChapter = (chapterId: string, fn: (chapter: Chapter) => Chapter) =>
    editor.edit((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) => (chapter.id === chapterId ? fn(chapter) : chapter)),
    }));
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError('');
    const normalized = clone(draft);
    normalized.title = normalized.title.trim();
    if (!coverThemes.some((theme) => theme.value === normalized.cover)) normalized.cover = 'film';
    if (
      normalized.published &&
      (!normalized.chapters.length || normalized.chapters.some((chapter) => !chapter.lessons.length))
    ) {
      setError('发布课程前，请添加至少一个章节，并为每个章节安排课时。');
      return;
    }
    normalized.outcomes = normalized.outcomes.map((item) => item.trim()).filter(Boolean);
    normalized.updatedAt = new Date().toISOString();
    for (const chapter of normalized.chapters)
      for (const lesson of chapter.lessons) {
        if (lesson.kind === 'video') {
          if (!lesson.videos.length) {
            setError(`「${lesson.title || '未命名课时'}」需要至少一个视频。`);
            return;
          }
          for (const video of lesson.videos) {
            const normalizedId = youtubeId(video.id);
            if (!normalizedId) {
              setError(
                `「${lesson.title || '未命名课时'}」中的「${video.title || '视频'}」链接无效，请填写 YouTube 视频链接或 11 位 ID。`,
              );
              return;
            }
            video.id = normalizedId;
          }
        } else lesson.videos = [];
        for (const resource of lesson.resources) {
          if (!/^https?:\/\//i.test(resource.url)) {
            setError(`「${lesson.title}」的资料链接须以 https:// 或 http:// 开头。`);
            return;
          }
        }
      }
    if (await onSave('course', normalized)) editor.saved(normalized);
  }
  return (
    <section>
      <div className="section-head admin-section-head">
        <div>
          <h2>一门好课，有清晰的学习路径</h2>
          <p className="muted">课程 → 章节 → 课时 → 视频。用上下箭头调整学习顺序。</p>
        </div>
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => {
            editor.select(newCourse());
            setError('');
          }}
        >
          <Plus size={18} />
          新建课程
        </button>
      </div>
      <div className="admin-workspace">
        <aside className="admin-item-sidebar">
          <label className="admin-search">
            <Search size={16} />
            <input
              aria-label="搜索课程"
              placeholder="搜索课程"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="admin-item-list">
            {courses
              .filter((course) => course.title.toLowerCase().includes(search.toLowerCase()))
              .map((course) => (
                <button
                  type="button"
                  key={course.id}
                  className={`admin-item${draft?.id === course.id ? ' selected' : ''}`}
                  onClick={() => {
                    editor.select(course);
                    setError('');
                  }}
                >
                  <div className="admin-item-title">
                    <span className={`admin-color-dot ${course.color}`} />
                    <strong>{course.title}</strong>
                  </div>
                  <span className="muted">
                    {course.chapters.length} 章 ·{' '}
                    {course.chapters.reduce((count, chapter) => count + chapter.lessons.length, 0)} 课时
                  </span>
                  <span className={`admin-item-status ${course.published ? 'is-live' : ''}`}>
                    {course.published ? '已发布' : '草稿'}
                    {course.demo ? ' · 示例' : ''}
                  </span>
                </button>
              ))}
          </div>
          {!courses.length && <p className="muted admin-help">还没有课程，创建第一门系列课吧。</p>}
        </aside>
        <div className="admin-editor">
          {editor.guard}
          {!draft ? (
            <div className="empty-state admin-editor-empty">
              <BookOpen size={36} />
              <h3>选择一门课程，开始编辑</h3>
              <p>也可以新建课程，安排完整的学习路径。</p>
            </div>
          ) : (
            <form
              onSubmit={save}
              onInvalid={(event) => {
                const target = event.target as HTMLInputElement;
                const details = target.closest('details');
                if (details) details.open = true;
              }}
            >
              <fieldset disabled={busy} className="admin-fieldset">
                <div className="admin-editor-heading">
                  <div>
                    <span className="admin-eyebrow">COURSE STUDIO</span>
                    <h3>{draft.title || '新课程'}</h3>
                  </div>
                  <span className={`badge ${dirty ? 'admin-unsaved' : ''}`}>
                    {dirty ? '有未保存修改' : '编辑课程'}
                  </span>
                </div>
                <div className="form-grid">
                  <Field label="课程名称" wide>
                    <input
                      required
                      value={draft.title}
                      maxLength={180}
                      placeholder="给课程起一个清晰的名字"
                      onChange={(event) => change({ title: event.target.value })}
                    />
                  </Field>
                  <Field label="一句话介绍" wide>
                    <input
                      value={draft.subtitle}
                      placeholder="学完这门课，你可以……"
                      onChange={(event) => change({ subtitle: event.target.value })}
                    />
                  </Field>
                  <Field label="分类">
                    <input
                      required
                      value={draft.category}
                      placeholder="例如：AI 创作"
                      onChange={(event) => change({ category: event.target.value })}
                    />
                  </Field>
                  <Field label="难度">
                    <input
                      required
                      value={draft.level}
                      placeholder="例如：零基础 / 进阶"
                      onChange={(event) => change({ level: event.target.value })}
                    />
                  </Field>
                  <Field label="总学习时间">
                    <input
                      value={draft.duration}
                      placeholder="例如：约 3 小时"
                      onChange={(event) => change({ duration: event.target.value })}
                    />
                  </Field>
                  <Field label="主题色">
                    <select
                      value={draft.color}
                      onChange={(event) => change({ color: event.target.value as Course['color'] })}
                    >
                      {colors.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="封面主题" hint="选择课程卡片使用的插画主题，与主题色搭配展示。" wide>
                    <select
                      value={coverThemes.some((theme) => theme.value === draft.cover) ? draft.cover : 'film'}
                      onChange={(event) => change({ cover: event.target.value })}
                    >
                      {coverThemes.map((theme) => (
                        <option key={theme.value} value={theme.value}>
                          {theme.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="课程详细介绍" wide>
                    <textarea
                      required
                      rows={5}
                      value={draft.description}
                      placeholder="介绍课程内容、适合人群与学习前准备。"
                      onChange={(event) => change({ description: event.target.value })}
                    />
                  </Field>
                  <Field label="学完你将能够（每行一条）" wide>
                    <textarea
                      rows={4}
                      value={draft.outcomes.join('\n')}
                      placeholder="独立制作一条完整影片\n建立可复用的创作流程"
                      onChange={(event) => change({ outcomes: event.target.value.split('\n') })}
                    />
                  </Field>
                </div>
                <div className="admin-publish-options">
                  <Toggle
                    label="发布课程"
                    checked={draft.published}
                    onChange={(published) => change({ published })}
                  />
                  <Toggle
                    label="推荐课程"
                    checked={draft.featured}
                    onChange={(featured) => change({ featured })}
                  />
                  <Toggle label="标记为示例课程" checked={draft.demo} onChange={(demo) => change({ demo })} />
                </div>
                <div className="admin-chapters-heading">
                  <div>
                    <h3>章节与课时</h3>
                    <p className="muted">章节顺序就是学员的学习顺序。</p>
                  </div>
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => change({ chapters: [...draft.chapters, newChapter()] })}
                  >
                    <Plus size={16} />
                    添加章节
                  </button>
                </div>
                <div className="admin-chapters">
                  {draft.chapters.map((chapter, chapterIndex) => (
                    <section className="admin-chapter" key={chapter.id}>
                      <div className="admin-chapter-heading">
                        <span className="admin-chapter-number">
                          {String(chapterIndex + 1).padStart(2, '0')}
                        </span>
                        <Field label={`第 ${chapterIndex + 1} 章标题`}>
                          <input
                            required
                            value={chapter.title}
                            placeholder="例如：课程介绍与目标"
                            onChange={(event) =>
                              changeChapter(chapter.id, (current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </Field>
                        <div className="admin-actions">
                          <OrderButtons
                            index={chapterIndex}
                            length={draft.chapters.length}
                            label={`第 ${chapterIndex + 1} 章`}
                            onMove={(direction) =>
                              change({ chapters: move(draft.chapters, chapterIndex, direction) })
                            }
                          />
                          <RemoveButton
                            label={`第 ${chapterIndex + 1} 章及其课时`}
                            onRemove={() =>
                              change({ chapters: draft.chapters.filter((item) => item.id !== chapter.id) })
                            }
                          />
                        </div>
                      </div>
                      {chapter.lessons.map((lesson, lessonIndex) => (
                        <div className="admin-lesson" key={lesson.id}>
                          <div className="admin-lesson-toolbar">
                            <span className="admin-lesson-label">
                              {chapterIndex + 1}.{lessonIndex + 1} <strong>{lesson.title || '新课时'}</strong>
                            </span>
                            <div className="admin-actions">
                              <OrderButtons
                                index={lessonIndex}
                                length={chapter.lessons.length}
                                label={`课时 ${chapterIndex + 1}.${lessonIndex + 1}`}
                                onMove={(direction) =>
                                  changeChapter(chapter.id, (current) => ({
                                    ...current,
                                    lessons: move(current.lessons, lessonIndex, direction),
                                  }))
                                }
                              />
                              <RemoveButton
                                label={`课时 ${chapterIndex + 1}.${lessonIndex + 1}`}
                                onRemove={() =>
                                  changeChapter(chapter.id, (current) => ({
                                    ...current,
                                    lessons: current.lessons.filter((item) => item.id !== lesson.id),
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <LessonDetails lesson={lesson}>
                            <LessonEditor
                              lesson={lesson}
                              onChange={(value) =>
                                changeChapter(chapter.id, (current) => ({
                                  ...current,
                                  lessons: current.lessons.map((item) =>
                                    item.id === lesson.id ? value : item,
                                  ),
                                }))
                              }
                            />
                          </LessonDetails>
                        </div>
                      ))}
                      {!chapter.lessons.length && <p className="muted admin-help">这个章节还没有课时。</p>}
                      <button
                        className="btn small admin-add-lesson"
                        type="button"
                        onClick={() =>
                          changeChapter(chapter.id, (current) => ({
                            ...current,
                            lessons: [...current.lessons, newLesson()],
                          }))
                        }
                      >
                        <Plus size={16} />
                        添加课时
                      </button>
                    </section>
                  ))}
                </div>
                {!draft.chapters.length && (
                  <p className="admin-notice">当前课程还没有章节，点击「添加章节」开始安排内容。</p>
                )}
                {error && (
                  <p className="admin-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="admin-savebar">
                  <span className="muted">
                    {draft.published ? '保存后，课程将展示给学员。' : '保存为草稿，学员暂不可见。'}
                  </span>
                  <button className="btn primary" type="submit">
                    <Save size={18} />
                    {busy ? '正在保存…' : '保存课程'}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function ArticleEditor({
  articles,
  columns,
  busy,
  onSave,
}: {
  articles: Article[];
  columns: Column[];
  busy: boolean;
  onSave: SaveContent;
}) {
  const editor = useDraft<Article>();
  const [search, setSearch] = useState('');
  const { draft, dirty } = editor;
  const change = (patch: Partial<Article>) => editor.edit((current) => ({ ...current, ...patch }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const value = { ...draft, title: draft.title.trim(), updatedAt: new Date().toISOString() };
    if (await onSave('article', value)) editor.saved(value);
  }
  return (
    <section>
      <div className="section-head admin-section-head">
        <div>
          <h2>把经验写下来，让知识持续生长</h2>
          <p className="muted">发布独立文章，或按阅读顺序放进一个专栏。</p>
        </div>
        <button
          className="btn primary"
          disabled={busy}
          onClick={() =>
            editor.select({
              id: id('article'),
              title: '',
              summary: '',
              content: '',
              category: '学习笔记',
              access: 'public',
              columnId: null,
              order: 1,
              published: false,
              readMinutes: 5,
              updatedAt: new Date().toISOString(),
            })
          }
        >
          <Plus size={18} />
          新建文章
        </button>
      </div>
      <div className="admin-workspace">
        <aside className="admin-item-sidebar">
          <label className="admin-search">
            <Search size={16} />
            <input
              aria-label="搜索文章"
              placeholder="搜索文章"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="admin-item-list">
            {articles
              .filter((article) => article.title.toLowerCase().includes(search.toLowerCase()))
              .map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className={`admin-item${draft?.id === article.id ? ' selected' : ''}`}
                  onClick={() => editor.select(article)}
                >
                  <strong>{article.title}</strong>
                  <span className="muted">
                    {article.category} · {article.access === 'vip' ? 'VIP 专享' : '公开阅读'}
                  </span>
                  <span className={`admin-item-status ${article.published ? 'is-live' : ''}`}>
                    {article.published ? '已发布' : '草稿'}
                  </span>
                </button>
              ))}
          </div>
          {!articles.length && <p className="muted admin-help">这里将收纳你的文章。</p>}
        </aside>
        <div className="admin-editor">
          {editor.guard}
          {draft ? (
            <form onSubmit={submit}>
              <fieldset className="admin-fieldset" disabled={busy}>
                <div className="admin-editor-heading">
                  <div>
                    <span className="admin-eyebrow">WRITING DESK</span>
                    <h3>{draft.title || '新文章'}</h3>
                  </div>
                  <span className={`badge ${dirty ? 'admin-unsaved' : ''}`}>
                    {dirty ? '有未保存修改' : '编辑文章'}
                  </span>
                </div>
                <div className="form-grid">
                  <Field label="文章标题" wide>
                    <input
                      required
                      maxLength={180}
                      value={draft.title}
                      placeholder="一个让人想读下去的标题"
                      onChange={(event) => change({ title: event.target.value })}
                    />
                  </Field>
                  <Field label="文章摘要" wide>
                    <textarea
                      required
                      rows={3}
                      value={draft.summary}
                      placeholder="简要说明读者能从文章中获得什么。"
                      onChange={(event) => change({ summary: event.target.value })}
                    />
                  </Field>
                  <Field label="分类">
                    <input
                      required
                      value={draft.category}
                      onChange={(event) => change({ category: event.target.value })}
                    />
                  </Field>
                  <Field label="阅读权限">
                    <select
                      value={draft.access}
                      onChange={(event) => change({ access: event.target.value as Article['access'] })}
                    >
                      <option value="public">公开阅读</option>
                      <option value="vip">VIP 专享</option>
                    </select>
                  </Field>
                  <Field label="所属专栏">
                    <select
                      value={draft.columnId || ''}
                      onChange={(event) => change({ columnId: event.target.value || null })}
                    >
                      <option value="">独立文章</option>
                      {columns.map((column) => (
                        <option value={column.id} key={column.id}>
                          {column.title}
                          {column.published ? '' : '（草稿）'}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="专栏内排序" hint="数字越小越靠前。">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      required
                      value={draft.order}
                      onChange={(event) => change({ order: Number(event.target.value) })}
                    />
                  </Field>
                  <Field label="预计阅读分钟数">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      step={1}
                      required
                      value={draft.readMinutes}
                      onChange={(event) => change({ readMinutes: Number(event.target.value) })}
                    />
                  </Field>
                  <Field
                    label="正文（Markdown）"
                    hint="支持标题、列表、引用、代码块和链接；HTML 代码不会直接执行。"
                    wide
                  >
                    <textarea
                      className="admin-markdown-editor"
                      required
                      rows={22}
                      value={draft.content}
                      placeholder="## 从这里开始\n\n写下你的经验与方法。"
                      onChange={(event) => change({ content: event.target.value })}
                    />
                  </Field>
                </div>
                <div className="admin-publish-options">
                  <Toggle
                    label="发布文章"
                    checked={draft.published}
                    onChange={(published) => change({ published })}
                  />
                  <span className="muted">
                    {draft.access === 'vip'
                      ? '正文仅有效 VIP 可阅读；管理员可在后台编辑。'
                      : '所有访客均可阅读正文。'}
                  </span>
                </div>
                <div className="admin-savebar">
                  <span className="muted">
                    {draft.published
                      ? draft.columnId &&
                        !columns.some((column) => column.id === draft.columnId && column.published)
                        ? '所属专栏尚未发布，文章暂不会展示给读者。'
                        : '保存后公开展示文章目录。'
                      : '草稿仅在管理后台可见。'}
                  </span>
                  <button className="btn primary" type="submit">
                    <Save size={18} />
                    {busy ? '正在保存…' : '保存文章'}
                  </button>
                </div>
              </fieldset>
            </form>
          ) : (
            <div className="empty-state admin-editor-empty">
              <FileText size={36} />
              <h3>选择文章，打开写作桌</h3>
              <p>支持公开分享与 VIP 专享内容。</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ColumnEditor({
  columns,
  articles,
  busy,
  onSave,
}: {
  columns: Column[];
  articles: Article[];
  busy: boolean;
  onSave: SaveContent;
}) {
  const editor = useDraft<Column>();
  const { draft, dirty } = editor;
  const change = (patch: Partial<Column>) => editor.edit((current) => ({ ...current, ...patch }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (draft && (await onSave('column', draft))) editor.saved(draft);
  }
  return (
    <section>
      <div className="section-head admin-section-head">
        <div>
          <h2>围绕一个主题，慢慢写成一座知识库</h2>
          <p className="muted">专栏把相关文章组织成连续阅读的系列。</p>
        </div>
        <button
          className="btn primary"
          disabled={busy}
          onClick={() =>
            editor.select({ id: id('column'), title: '', description: '', color: 'yellow', published: false })
          }
        >
          <Plus size={18} />
          新建专栏
        </button>
      </div>
      <div className="admin-workspace">
        <aside className="admin-item-sidebar">
          <div className="admin-item-list">
            {columns.map((column) => (
              <button
                key={column.id}
                type="button"
                className={`admin-item${draft?.id === column.id ? ' selected' : ''}`}
                onClick={() => editor.select(column)}
              >
                <div className="admin-item-title">
                  <span className={`admin-color-dot ${column.color}`} />
                  <strong>{column.title}</strong>
                </div>
                <span className="muted">
                  {articles.filter((article) => article.columnId === column.id).length} 篇文章
                </span>
                <span className={`admin-item-status ${column.published ? 'is-live' : ''}`}>
                  {column.published ? '已发布' : '草稿'}
                </span>
              </button>
            ))}
          </div>
          {!columns.length && <p className="muted admin-help">创建专栏，再到文章中设置归属。</p>}
        </aside>
        <div className="admin-editor">
          {editor.guard}
          {draft ? (
            <form onSubmit={submit}>
              <fieldset className="admin-fieldset" disabled={busy}>
                <div className="admin-editor-heading">
                  <div>
                    <span className="admin-eyebrow">COLLECTION</span>
                    <h3>{draft.title || '新专栏'}</h3>
                  </div>
                  <span className={`badge ${dirty ? 'admin-unsaved' : ''}`}>
                    {dirty ? '有未保存修改' : '编辑专栏'}
                  </span>
                </div>
                <div className="form-grid">
                  <Field label="专栏名称" wide>
                    <input
                      required
                      maxLength={180}
                      value={draft.title}
                      placeholder="例如：一个人的 AI 工作室"
                      onChange={(event) => change({ title: event.target.value })}
                    />
                  </Field>
                  <Field label="专栏简介" wide>
                    <textarea
                      required
                      rows={6}
                      value={draft.description}
                      placeholder="这个专栏关注什么？适合谁读？"
                      onChange={(event) => change({ description: event.target.value })}
                    />
                  </Field>
                  <Field label="主题色">
                    <select
                      value={draft.color}
                      onChange={(event) => change({ color: event.target.value as Column['color'] })}
                    >
                      {colors.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="admin-publish-options">
                  <Toggle
                    label="发布专栏"
                    checked={draft.published}
                    onChange={(published) => change({ published })}
                  />
                </div>
                <div className="admin-column-contents">
                  <h4>本专栏文章</h4>
                  <p className="muted admin-help">
                    在「文章」中设置所属专栏和排序；每篇文章分别设置公开或 VIP 权限。
                  </p>
                  <ol>
                    {articles
                      .filter((article) => article.columnId === draft.id)
                      .sort((a, b) => a.order - b.order)
                      .map((article) => (
                        <li key={article.id}>
                          <span className="admin-row-number">{String(article.order).padStart(2, '0')}</span>
                          <div>
                            <strong>{article.title}</strong>
                            <p className="muted">
                              {article.access === 'vip' ? 'VIP 专享' : '公开阅读'} ·{' '}
                              {article.published ? '已发布' : '草稿'}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ol>
                  {!articles.some((article) => article.columnId === draft.id) && (
                    <p className="admin-help muted">尚未添加文章。保存专栏后，到「文章」中关联内容。</p>
                  )}
                </div>
                <div className="admin-savebar">
                  <span className="muted">取消发布会同时隐藏专栏与其全部文章。</span>
                  <button className="btn primary" type="submit">
                    <Save size={18} />
                    {busy ? '正在保存…' : '保存专栏'}
                  </button>
                </div>
              </fieldset>
            </form>
          ) : (
            <div className="empty-state admin-editor-empty">
              <FolderOpen size={36} />
              <h3>让零散文章成为一个系列</h3>
              <p>选择或新建专栏，组织你的知识主题。</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AuditLog({ data }: { data: AdminData }) {
  const actions: Record<string, string> = {
    'vip.set': '开通或更新 VIP',
    'vip.grant': '开通或更新 VIP',
    'vip.update': '更新 VIP 有效期',
    'vip.revoke': '撤销 VIP',
    'course.save': '保存课程',
    'article.save': '保存文章',
    'column.save': '保存专栏',
    'user.register': '注册账号',
    vip: '调整 VIP',
    course: '保存课程',
    article: '保存文章',
    column: '保存专栏',
  };
  function targetName(targetId: string) {
    const member = data.users.find((item) => item.id === targetId);
    return member
      ? member.email
      : data.courses.find((item) => item.id === targetId)?.title ||
          data.articles.find((item) => item.id === targetId)?.title ||
          data.columns.find((item) => item.id === targetId)?.title ||
          targetId;
  }
  return (
    <section>
      <div className="section-head admin-section-head">
        <div>
          <h2>每一次调整，都有迹可循</h2>
          <p className="muted">按最新时间展示 VIP 调整和内容管理操作。</p>
        </div>
        <span className="badge">{data.audit.length} 条记录</span>
      </div>
      <div className="panel admin-audit-table-wrap">
        <table className="admin-audit-table">
          <thead>
            <tr>
              <th scope="col">操作时间</th>
              <th scope="col">操作人</th>
              <th scope="col">操作</th>
              <th scope="col">对象</th>
            </tr>
          </thead>
          <tbody>
            {[...data.audit]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((item) => (
                <tr key={item.id}>
                  <td>{dateText(item.at)}</td>
                  <td>{data.users.find((user) => user.id === item.actorId)?.name || '管理员'}</td>
                  <td>
                    <span className="badge">{actions[item.action] || item.action}</span>
                  </td>
                  <td>{targetName(item.targetId)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {!data.audit.length && (
          <div className="empty-state">
            <History size={30} />
            <h3>还没有管理操作</h3>
            <p>保存内容或调整 VIP 后，记录会显示在这里。</p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Adapted from Brclio design system template-app.html. © Brclio, CC BY-NC-SA 4.0. */
export default function Admin({ user }: { user: SafeUser }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>('users');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const value = await api<AdminData>('/api/admin');
    setData(value);
    return value;
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function mutate(path: string, body: unknown, key: string, success: string) {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await api(path, body);
      setNotice(success);
      try {
        await load();
      } catch {
        setError('修改已保存，但列表刷新失败。请点击「刷新数据」获取最新内容。');
      }
      return true;
    } catch (cause) {
      setError(messageOf(cause));
      return false;
    } finally {
      setBusy('');
    }
  }
  const saveContent: SaveContent = (kind, value) =>
    mutate(
      `/api/admin/${kind}`,
      { [kind]: value },
      `${kind}:${value.id}`,
      `${kind === 'course' ? '课程' : kind === 'article' ? '文章' : '专栏'}「${value.title}」已保存。`,
    );
  if (user.role !== 'admin')
    return (
      <div className="empty-state">
        <ShieldCheck size={32} />
        <h2>此页面仅管理员可访问</h2>
        <p>请使用管理员账号登录。</p>
      </div>
    );
  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">ACADEMY / WORKSPACE</span>
          <h1>内容与成员管理</h1>
          <p className="muted">你好，{user.name}。让每一段学习，都被好好照顾。</p>
        </div>
        <button className="btn" disabled={loading || Boolean(busy)} onClick={() => void refresh()}>
          <RefreshCw size={17} />
          {loading ? '加载中…' : '刷新数据'}
        </button>
      </header>
      {data && (
        <div className="admin-stats">
          <div>
            <Users size={20} />
            <span>注册成员</span>
            <strong>{data.users.length}</strong>
          </div>
          <div>
            <Crown size={20} />
            <span>有效 VIP</span>
            <strong>{data.users.filter((member) => member.isVip).length}</strong>
          </div>
          <div>
            <BookOpen size={20} />
            <span>已发布课程</span>
            <strong>{data.courses.filter((course) => course.published).length}</strong>
          </div>
          <div>
            <FileText size={20} />
            <span>已发布文章</span>
            <strong>{data.articles.filter((article) => article.published).length}</strong>
          </div>
        </div>
      )}
      <div className="admin-feedback" aria-live="polite">
        {error && (
          <div className="admin-error admin-feedback-message" role="alert">
            <span>{error}</span>
            <button className="btn small admin-icon" aria-label="关闭错误提示" onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className="admin-success admin-feedback-message">
            <Check size={18} />
            <span>{notice}</span>
            <button className="btn small admin-icon" aria-label="关闭成功提示" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      {!data && loading ? (
        <div className="empty-state" role="status">
          <p>正在读取成员、课程与文章…</p>
        </div>
      ) : !data ? (
        <div className="empty-state">
          <h3>暂时无法载入管理数据</h3>
          <button className="btn primary" onClick={() => void refresh()}>
            重新加载
          </button>
        </div>
      ) : (
        <>
          <nav className="admin-tabs" aria-label="管理导航">
            {tabs.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-current={tab === item.id ? 'page' : undefined}
                className={tab === item.id ? 'active' : ''}
                onClick={() => setTab(item.id)}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="admin-tab-content" hidden={tab !== 'users'}>
            <Members
              users={data.users}
              busy={busy}
              onSave={(userId, vipExpiresAt) =>
                mutate(
                  '/api/admin/vip',
                  { userId, vipExpiresAt },
                  `vip:${userId}`,
                  vipExpiresAt ? 'VIP 有效期已更新。' : 'VIP 权限已撤销。',
                )
              }
            />
          </div>
          <div className="admin-tab-content" hidden={tab !== 'courses'}>
            <CourseEditor courses={data.courses} busy={Boolean(busy)} onSave={saveContent} />
          </div>
          <div className="admin-tab-content" hidden={tab !== 'articles'}>
            <ArticleEditor
              articles={data.articles}
              columns={data.columns}
              busy={Boolean(busy)}
              onSave={saveContent}
            />
          </div>
          <div className="admin-tab-content" hidden={tab !== 'columns'}>
            <ColumnEditor
              columns={data.columns}
              articles={data.articles}
              busy={Boolean(busy)}
              onSave={saveContent}
            />
          </div>
          <div className="admin-tab-content" hidden={tab !== 'audit'}>
            <AuditLog data={data} />
          </div>
        </>
      )}
    </div>
  );
}
