'use client';
import { useState, useEffect, useCallback, useRef, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Crown,
  FileText,
  Film,
  Home,
  Layers3,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Menu,
  Play,
  Search,
  Settings2,
  Sparkles,
  X,
  CheckCircle2,
  Circle,
  NotebookPen,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Loader2,
} from 'lucide-react';
import type {
  Catalog,
  Dashboard,
  PublicCourse,
  PublicArticle,
  SafeUser,
  Lesson,
  Progress,
  Note,
  Article,
} from '@/lib/types';
import Markdown from './markdown';
import Admin from './admin';
import VideoPlayer from './video-player';

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求未完成，请稍后再试');
  return data;
}
const dateLabel = (date: string) => new Date(date).toLocaleDateString('zh-CN');
const countLessons = (course: PublicCourse) =>
  course.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
const flatLessons = (course: PublicCourse) => course.chapters.flatMap((chapter) => chapter.lessons);
function Loading() {
  return (
    <div className="empty-state">
      <Loader2 className="spinner" size={24} />
      <p>正在准备内容…</p>
    </div>
  );
}
function Message({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={`message ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <BookOpen size={32} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
function CourseArt({ course, large = false }: { course: PublicCourse; large?: boolean }) {
  const icon =
    course.cover === 'film' ? (
      <Film />
    ) : course.cover === 'python' ? (
      <Code2 />
    ) : course.cover === 'web' ? (
      <Layers3 />
    ) : (
      <Lightbulb />
    );
  return (
    <div className={`course-art art-${course.color} ${large ? 'art-large' : ''}`} aria-hidden="true">
      <span className="art-kicker">BRCLIO / LEARN BY DOING</span>
      <div className="art-object">
        <div className="art-window-bar">
          <i />
          <i />
          <i />
        </div>
        <div className="art-object-body">
          {icon}
          <span>
            {course.cover === 'film'
              ? 'Make ideas move.'
              : course.cover === 'python'
                ? 'Hello, possibility.'
                : course.cover === 'web'
                  ? 'Build your corner.'
                  : 'Less busy. More done.'}
          </span>
        </div>
      </div>
      <span className="art-spark">✳</span>
      <span className="art-label">{course.category}</span>
      <span className="art-edition">
        A little practice,
        <br />a new possibility.
      </span>
    </div>
  );
}
function CourseCard({ course, progress }: { course: PublicCourse; progress?: Progress[] }) {
  const completed = progress?.filter((p) => p.courseId === course.id && p.completed).length || 0;
  return (
    <Link href={`/courses/${course.id}`} className="course-card">
      <CourseArt course={course} />
      <div className="course-card-body">
        <div className="card-eyebrow">
          <span>{course.category}</span>
          <span>{course.level}</span>
        </div>
        <h3>{course.title}</h3>
        <p>{course.subtitle}</p>
        <div className="card-bottom">
          <span>
            <Layers3 size={14} />
            {course.chapters.length} 章 · {countLessons(course)} 节
          </span>
          {completed > 0 ? (
            <span className="blue-text">已完成 {completed} 节</span>
          ) : (
            <span className="course-link">
              查看课程 <ArrowUpRight size={16} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
const navigation = [
  { href: '/', label: '学习发现', icon: Home },
  { href: '/courses', label: '系列课程', icon: Layers3 },
  { href: '/columns', label: '精选专栏', icon: BookOpen },
  { href: '/articles', label: '文章与灵感', icon: FileText },
];
const learningNav = [
  { href: '/dashboard', label: '我的学习', icon: GraduationCap },
  { href: '/bookmarks', label: '我的收藏', icon: Bookmark },
];
export default function Academy() {
  const pathname = usePathname();
  const router = useRouter();
  const query = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const reloadUser = useCallback(async () => {
    const data = await api<{ user: SafeUser | null }>('/me');
    setUser(data.user);
    setReady(true);
  }, []);
  const reloadCatalog = useCallback(async () => {
    const data = await api<Catalog>('/catalog');
    setCatalog(data);
  }, []);
  useEffect(() => {
    Promise.all([reloadUser(), reloadCatalog()]).catch((e) => setError(e.message));
  }, [pathname, reloadUser, reloadCatalog]);
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false);
        document.querySelector<HTMLButtonElement>('.mobile-menu')?.focus();
      }
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [menu]);
  useEffect(() => {
    const timer = setInterval(() => {
      reloadUser().catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, [reloadUser]);
  const active = (href: string) => (href === '/' ? pathname === href : pathname.startsWith(href));
  const crumbs = pathname.startsWith('/admin')
    ? '管理后台'
    : pathname.startsWith('/learn')
      ? '课程学习'
      : [...navigation, ...learningNav].find((item) => active(item.href))?.label ||
        (pathname === '/account' ? '账户设置' : '欢迎来到 Brclio');
  async function logout() {
    try {
      await api('/auth/logout', {});
      setUser(null);
      router.push('/');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  let page: ReactNode = <Loading />;
  if (ready && catalog) {
    const parts = pathname.split('/').filter(Boolean);
    if (pathname === '/') page = <Discover catalog={catalog} user={user} />;
    else if (pathname === '/courses')
      page = <Courses catalog={catalog} initialQuery={query.get('q') || ''} />;
    else if (parts[0] === 'courses' && parts[1])
      page = (
        <CourseDetail key={parts[1]} course={catalog.courses.find((c) => c.id === parts[1])} user={user} />
      );
    else if (parts[0] === 'learn' && parts[1] && parts[2])
      page = (
        <Learning
          key={`${parts[1]}/${parts[2]}`}
          course={catalog.courses.find((c) => c.id === parts[1])}
          lessonId={parts[2]}
          user={user}
        />
      );
    else if (['/login', '/register', '/reset-password'].includes(pathname))
      page = (
        <Auth
          key={pathname}
          mode={pathname === '/register' ? 'register' : pathname === '/login' ? 'login' : 'reset'}
          onSuccess={reloadUser}
        />
      );
    else if (pathname === '/dashboard' || pathname === '/bookmarks')
      page = (
        <MyLearning key={pathname} user={user} catalog={catalog} onlyBookmarks={pathname === '/bookmarks'} />
      );
    else if (pathname === '/articles') page = <Articles catalog={catalog} />;
    else if (parts[0] === 'articles' && parts[1])
      page = <ArticleReader key={`${parts[1]}-${user?.isVip}`} id={parts[1]} user={user} catalog={catalog} />;
    else if (parts[0] === 'columns') page = <Columns catalog={catalog} id={parts[1]} />;
    else if (pathname === '/account') page = <Account user={user} logout={logout} />;
    else if (pathname === '/admin')
      page = user?.role === 'admin' ? <Admin user={user} /> : <AccessGate user={user} admin />;
    else
      page = (
        <Empty
          title="这一页还没有笔记"
          text="地址可能有误，回到学习空间继续探索吧。"
          action={
            <Link className="btn primary" href="/">
              返回首页
            </Link>
          }
        />
      );
  }
  return (
    <div className="academy-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      {menu && <button className="sidebar-scrim" onClick={() => setMenu(false)} aria-label="关闭导航" />}
      <aside id="academy-navigation" className={`app-sidebar ${menu ? 'open' : ''}`}>
        <Link href="/" className="brand">
          <span className="brand-symbol">
            b<span>✳</span>
          </span>
          <span>
            <strong>
              Brclio<span className="brand-dot">.</span>
            </strong>
            <small>ACADEMY</small>
          </span>
        </Link>
        <div className="sidebar-content">
          <p className="nav-label">保持好奇 · 持续创造</p>
          <nav aria-label="内容导航">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active(href) ? 'active' : ''}`}
                aria-current={active(href) ? 'page' : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                {href === '/courses' && catalog && (
                  <small>{catalog.courses.length.toString().padStart(2, '0')}</small>
                )}
              </Link>
            ))}
          </nav>
          <p className="nav-label space-top">我的空间</p>
          <nav aria-label="个人导航">
            {learningNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active(href) ? 'active' : ''}`}
                aria-current={active(href) ? 'page' : undefined}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link href="/admin" className={`nav-item ${active('/admin') ? 'active' : ''}`}>
                <Settings2 size={18} />
                管理后台
              </Link>
            )}
          </nav>
          <div className="sidebar-note">
            <span className="handwritten">One step at a time.</span>
            <p>
              不着急，一次学会一点。
              <br />
              把每一点，变成自己的。
            </p>
            <span className="drawn-arrow">↳</span>
          </div>
        </div>
        <div className="sidebar-bottom">
          <Link href={user ? '/account' : '/login'} className="profile-link">
            <span className="profile-avatar">
              {user ? user.name.slice(0, 1) : <img src="/brand/avatar.png" alt="Brclio 头像" />}
            </span>
            <span>
              <strong>{user?.name || '你的学习空间'}</strong>
              <small>{user ? (user.isVip ? 'VIP 学习者' : '普通会员') : '登录后记录每一次进步'}</small>
            </span>
            <ChevronRight size={16} />
          </Link>
          <div className="sidebar-credit">
            © {new Date().getFullYear()} Brclio{' '}
            <a href="https://brclio.com" target="_blank" rel="noreferrer">
              关于我 <ArrowUpRight size={11} />
            </a>
          </div>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-header">
          <div className="header-left">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? '收起导航' : '打开导航'}
              aria-expanded={menu}
              aria-controls="academy-navigation"
            >
              <Menu size={20} />
            </button>
            <span className="header-home">学习空间</span>
            <ChevronRight size={13} />
            <span>{crumbs}</span>
          </div>
          <div className="header-actions">
            <form
              className="header-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/courses?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={15} />
              <input
                aria-label="搜索课程"
                placeholder="搜索你想学的…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="search-submit" aria-label="提交搜索">
                <ArrowRight size={15} />
              </button>
            </form>
            {user ? (
              <Link href="/account" className={`badge ${user.isVip ? 'gold' : ''}`}>
                <Crown size={13} />
                {user.isVip ? 'VIP 会员' : '普通会员'}
              </Link>
            ) : (
              <Link href="/login" className="header-login">
                登录 / 注册 <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </header>
        <main
          id="main-content"
          className={`app-main ${pathname.startsWith('/learn') ? 'learning-main' : ''}`}
        >
          {error ? (
            <Message error>
              {error}
              <button
                className="btn small"
                onClick={() => {
                  setError('');
                  Promise.all([reloadUser(), reloadCatalog()]).catch((e) => setError(e.message));
                }}
              >
                重新加载
              </button>
            </Message>
          ) : (
            page
          )}
        </main>
        <footer className="app-footer">
          <span>从理解到实践，让学习真正发生。</span>
          <span>
            Designed with{' '}
            <a href="https://github.com/Brclio/brclio-design-system" target="_blank" rel="noreferrer">
              Brclio Design System
            </a>{' '}
            · CC BY-NC-SA 4.0
          </span>
        </footer>
      </div>
    </div>
  );
}
function Discover({ catalog, user }: { catalog: Catalog; user: SafeUser | null }) {
  const featured = catalog.courses.find((c) => c.featured) || catalog.courses[0];
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  useEffect(() => {
    if (user)
      api<Dashboard>('/dashboard')
        .then(setDashboard)
        .catch(() => {});
  }, [user]);
  const last = dashboard?.progress.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const lastCourse = catalog.courses.find((c) => c.id === last?.courseId);
  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">STAY CURIOUS. KEEP BUILDING.</p>
          <h1>
            {user ? `${user.name}，今天也学一点新东西。` : '把好奇心，变成自己的作品。'}
            <span className="tiny-star">✳</span>
          </h1>
          <p className="muted">系统地学，认真地做。在这里，找到你的下一步。</p>
        </div>
        <div className="welcome-stamp">
          <span>Learn.</span>
          <span>Build.</span>
          <span>Repeat.</span>
        </div>
      </div>
      {last && lastCourse && (
        <Link href={`/learn/${last.courseId}/${last.lessonId}`} className="continue-strip">
          <span className="play-circle">
            <Play size={16} fill="currentColor" />
          </span>
          <span>
            <small>从上次停下的地方继续</small>
            <strong>
              {lastCourse.title} · {flatLessons(lastCourse).find((l) => l.id === last.lessonId)?.title}
            </strong>
          </span>
          <ArrowRight size={19} />
        </Link>
      )}
      <section className="discovery-feature">
        {featured && (
          <Link href={`/courses/${featured.id}`} className={`featured-course art-${featured.color}`}>
            <div className="featured-copy">
              <span className="feature-eyebrow">
                <span className="small-dot" />
                本期精选课程 <span>01 / FEATURED</span>
              </span>
              <h2>{featured.title}</h2>
              <p>{featured.subtitle}</p>
              <span className="feature-cta">
                打开这门课 <ArrowUpRight size={17} />
              </span>
              <div className="feature-meta">
                <span>{featured.chapters.length} 个章节</span>
                <span>{countLessons(featured)} 节课程</span>
                <span>从零开始</span>
              </div>
            </div>
            <div className="feature-illustration" aria-hidden="true">
              <span className="handwritten floating-note">Your ideas, in motion.</span>
              <div className="film-board">
                <div className="clapper" />
                <Film size={48} strokeWidth={1.4} />
                <span>idea → story → film</span>
              </div>
              <span className="feature-play">
                <Play size={24} fill="currentColor" />
              </span>
              <span className="feature-star">✳</span>
            </div>
          </Link>
        )}
        <aside className="mentor-note">
          <div className="note-top">
            <span className="eyebrow">A NOTE FROM BRCLIO</span>
            <ArrowUpRight size={18} />
          </div>
          <img src="/brand/character.png" alt="Brclio 的个人 IP 插画" />
          <h2>
            不止是看完，
            <br />
            更是做出来。
          </h2>
          <p>
            给学习留一小块时间，
            <br />
            给自己一个动手的机会。
          </p>
          <Link href="/dashboard">
            打开我的学习空间 <ArrowRight size={15} />
          </Link>
          <span className="note-signature">Brclio</span>
        </aside>
      </section>
      <section className="home-courses">
        <div className="section-head">
          <div>
            <h2>
              挑一门课，开始实践 <span className="section-en">THE COLLECTION</span>
            </h2>
            <p className="muted">每一门都是完整路径，从第一步走到一个小作品。</p>
          </div>
          <Link href="/courses" className="text-link">
            全部课程 <ArrowRight size={16} />
          </Link>
        </div>
        <div className="course-grid">
          {catalog.courses
            .filter((course) => course.id !== featured?.id)
            .slice(0, 3)
            .map((course) => (
              <CourseCard key={course.id} course={course} progress={dashboard?.progress} />
            ))}
        </div>
      </section>
      <section className="home-reading">
        <div className="section-head">
          <div>
            <h2>
              留一点时间，读与想 <span className="section-en">READING ROOM</span>
            </h2>
            <p className="muted">课程之外，一些方法、记录和新的可能。</p>
          </div>
          <Link href="/articles" className="text-link">
            更多文章 <ArrowRight size={16} />
          </Link>
        </div>
        <div className="reading-split">
          <Link href={`/columns/${catalog.columns[0]?.id || ''}`} className="column-feature">
            <span className="eyebrow">BRCLIO COLUMN / 01</span>
            <BookOpen size={32} strokeWidth={1.4} />
            <h3>{catalog.columns[0]?.title}</h3>
            <p>{catalog.columns[0]?.description}</p>
            <span>
              翻开专栏 <ArrowUpRight size={15} />
            </span>
          </Link>
          <div className="article-rows">
            {catalog.articles.slice(0, 3).map((article, index) => (
              <ArticleRow key={article.id} article={article} index={index} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
function Courses({ catalog, initialQuery }: { catalog: Catalog; initialQuery: string }) {
  const [search, setSearch] = useState(initialQuery);
  const [category, setCategory] = useState('全部课程');
  const [sort, setSort] = useState('featured');
  useEffect(() => setSearch(initialQuery), [initialQuery]);
  const categories = ['全部课程', ...new Set(catalog.courses.map((c) => c.category))];
  const courses = catalog.courses
    .filter(
      (c) =>
        (category === '全部课程' || c.category === category) &&
        `${c.title} ${c.description} ${c.category}`.toLowerCase().includes(search.toLowerCase()),
    )
    .toSorted((a, b) =>
      sort === 'updated' ? b.updatedAt.localeCompare(a.updatedAt) : Number(b.featured) - Number(a.featured),
    );
  return (
    <>
      <PageHeading
        eyebrow="THE COURSE COLLECTION"
        title="系列课程"
        description="从一个问题开始，以一个作品结束。选择一条适合你的学习路径。"
      />
      <div className="catalog-toolbar">
        <div className="filter-tabs" aria-label="课程分类">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={category === c ? 'selected' : ''}>
              {c}
            </button>
          ))}
        </div>
        <label className="sort-label">
          排序
          <select aria-label="课程排序" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">精选优先</option>
            <option value="updated">最近更新</option>
          </select>
        </label>
      </div>
      <div className="catalog-search">
        <Search size={17} />
        <input
          aria-label="在全部课程中搜索"
          value={search}
          placeholder="课程名称、技能或一个你感兴趣的话题…"
          onChange={(e) => setSearch(e.target.value)}
        />
        <span>{courses.length} 门课程</span>
      </div>
      {courses.length ? (
        <div className="course-grid catalog-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <Empty
          title="没有找到这门课"
          text="试试更短的关键词，或切换课程分类。"
          action={
            <button
              className="btn"
              onClick={() => {
                setSearch('');
                setCategory('全部课程');
              }}
            >
              清除筛选
            </button>
          }
        />
      )}
      <div className="catalog-footnote">
        <Sparkles size={17} />
        <p>这里的课程示例可以直接学习；你也可以在后台把它们替换为自己的系列课程。</p>
      </div>
    </>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
function AccessGate({ user, admin = false }: { user: SafeUser | null; admin?: boolean }) {
  return (
    <Empty
      title={admin ? '这里是管理员的工作空间' : user ? '下一步，开启 VIP 学习' : '登录，保存每一步成长'}
      text={
        admin
          ? '请使用管理员账户登录后管理课程与成员。'
          : user
            ? '你的账户已准备好。联系 Brclio 开通 VIP 后，即可学习所有系列课程和会员文章。'
            : '所有人都可以注册。邮箱验证后即可收藏课程，开通 VIP 后开始系统学习。'
      }
      action={
        <Link href={user ? '/account' : '/login'} className="btn primary">
          {user ? '查看会员状态' : '登录 / 注册'}
          <ArrowRight size={16} />
        </Link>
      }
    />
  );
}
function CourseDetail({ course, user }: { course?: PublicCourse; user: SafeUser | null }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (user)
      api<Dashboard>('/dashboard')
        .then(setDashboard)
        .catch((e) => setMessage(e.message));
  }, [user]);
  if (!course)
    return (
      <Empty
        title="课程暂不可见"
        text="这门课程可能尚未发布。"
        action={
          <Link href="/courses" className="btn">
            查看全部课程
          </Link>
        }
      />
    );
  const lessons = flatLessons(course);
  const progress = dashboard?.progress.filter((p) => p.courseId === course.id) || [];
  const done = progress.filter((p) => p.completed).length;
  const last = progress.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const target = last?.lessonId || lessons[0]?.id;
  const bookmarked = dashboard?.bookmarks.includes(course.id);
  async function toggleBookmark() {
    if (!user) {
      setMessage('登录后即可收藏这门课程。');
      return;
    }
    try {
      await api('/bookmarks', { courseId: course!.id });
      setDashboard(await api<Dashboard>('/dashboard'));
      setMessage(bookmarked ? '已取消收藏' : '已加入我的收藏');
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <Link href="/courses" className="back-link">
        <ArrowLeft size={15} />
        全部课程
      </Link>
      <div className="course-detail-intro">
        <div>
          <div className="badge-row">
            <span className="badge">{course.category}</span>
            <span className="badge gold">
              <Crown size={12} />
              VIP 系列课
            </span>
            {course.demo && <span className="badge neutral">示例内容</span>}
          </div>
          <h1>{course.title}</h1>
          <p className="detail-subtitle">{course.subtitle}</p>
          <p className="muted">{course.description}</p>
          <div className="detail-meta">
            <span>
              <Layers3 size={16} />
              {course.chapters.length} 章 · {lessons.length} 节
            </span>
            <span>
              <GraduationCap size={16} />
              {course.level}
            </span>
            <span>
              <Clock3 size={16} />
              {course.duration}
            </span>
          </div>
          <div className="button-row">
            <Link
              href={user?.isVip && target ? `/learn/${course.id}/${target}` : user ? '/account' : '/login'}
              className="btn primary"
            >
              <Play size={16} />
              {user?.isVip
                ? progress.length
                  ? '继续学习'
                  : '开始学习'
                : user
                  ? '查看 VIP 状态'
                  : '登录后开启学习'}
            </Link>
            <button className={`btn ${bookmarked ? 'bookmarked' : ''}`} onClick={toggleBookmark}>
              <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
              {bookmarked ? '已收藏' : '收藏课程'}
            </button>
          </div>
          {message && <Message>{message}</Message>}
        </div>
        <CourseArt course={course} large />
      </div>
      <div className="detail-layout">
        <div>
          <div className="section-head">
            <h2>
              课程目录 <span className="section-en">CURRICULUM</span>
            </h2>
            <span className="muted">{lessons.length} 节 · 按顺序循序渐进</span>
          </div>
          <div className="curriculum">
            {course.chapters.map((chapter, index) => (
              <details key={chapter.id} open>
                <summary>
                  <span className="chapter-no">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{chapter.title}</strong>
                  <span>{chapter.lessons.length} 节</span>
                  <ChevronRight size={16} />
                </summary>
                <div className="chapter-lessons">
                  {chapter.lessons.map((lesson, li) => (
                    <Link href={`/learn/${course.id}/${lesson.id}`} key={lesson.id} className="lesson-row">
                      <span className="lesson-index">{String(li + 1).padStart(2, '0')}</span>
                      {progress.some((p) => p.lessonId === lesson.id && p.completed) ? (
                        <CheckCircle2 size={16} className="blue-text" />
                      ) : lesson.kind === 'video' ? (
                        <Play size={15} />
                      ) : (
                        <FileText size={15} />
                      )}
                      <span>{lesson.title}</span>
                      <small>{lesson.kind === 'video' ? '视频' : '图文'}</small>
                      {!user?.isVip && <LockKeyhole size={13} />}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
        <aside className="course-side">
          <div className="outcome-panel">
            <span className="eyebrow">WHAT YOU'LL BUILD</span>
            <h2>学完这门课，你可以</h2>
            <ul className="check-list">
              {course.outcomes.map((outcome) => (
                <li key={outcome}>
                  <Check size={15} />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
          {user && (
            <div className="learning-progress">
              <h3>
                你的学习进度 <span>{Math.round((done / Math.max(1, lessons.length)) * 100)}%</span>
              </h3>
              <progress max={lessons.length || 1} value={done} />
              <p>
                已经完成 {done} / {lessons.length} 节。每一步都算数。
              </p>
            </div>
          )}
          <div className="teacher-line">
            <img src="/brand/avatar.png" alt="Brclio" />
            <div>
              <strong>Brclio</strong>
              <p>
                程序员 / 编程教育者
                <br />
                写代码，教编程，做产品
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
function Auth({ mode, onSuccess }: { mode: 'login' | 'register' | 'reset'; onSuccess: () => Promise<void> }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function sendCode() {
    setError('');
    setMessage('');
    setSending(true);
    try {
      await api('/auth/send-code', { email, purpose: mode === 'register' ? 'register' : 'reset' });
      setMessage('如该邮箱符合条件，验证码已发送。请检查收件箱和垃圾邮件。');
      setCooldown(60);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(
        `/auth/${mode}`,
        mode === 'login'
          ? { email, password }
          : mode === 'register'
            ? { email, name, password, code }
            : { email, password, code },
      );
      if (mode === 'reset') {
        await onSuccess();
        setMessage('密码已重置，原有会话已退出。请使用新密码登录。');
      } else {
        await onSuccess();
        router.push('/dashboard');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-aside">
        <span className="eyebrow">A SPACE FOR YOUR CURIOSITY</span>
        <h2>
          从这里开始，
          <br />
          遇见更多可能。
        </h2>
        <img src="/brand/character.png" alt="Brclio IP 人物" />
        <p>
          一次专注，一点实践。
          <br />
          慢慢把知识，变成自己的能力。
        </p>
        <span className="handwritten">See you in class.</span>
      </div>
      <div className="auth-form">
        <span className="badge">
          <Mail size={14} />
          你的学习账户
        </span>
        <h1>{mode === 'login' ? '欢迎回来' : mode === 'register' ? '开启你的学习空间' : '找回密码'}</h1>
        <p className="muted">
          {mode === 'login'
            ? '继续上次的探索，把学习变成日常。'
            : mode === 'register'
              ? '用邮箱注册，验证后即可拥有自己的学习空间。'
              : '我们会向你的注册邮箱发送验证码。'}
        </p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label className="field">
              怎么称呼你
              <input
                required
                minLength={1}
                maxLength={40}
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的名字"
              />
            </label>
          )}
          <label className="field">
            邮箱地址
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {mode !== 'login' && (
            <label className="field">
              邮箱验证码
              <span className="code-field">
                <input
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="6 位数字验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
                <button
                  className="btn"
                  type="button"
                  disabled={sending || cooldown > 0 || !email.includes('@')}
                  onClick={sendCode}
                >
                  {sending ? '发送中…' : cooldown ? `${cooldown} 秒后重发` : '发送验证码'}
                </button>
              </span>
            </label>
          )}
          <label className="field">
            {mode === 'reset' ? '新密码' : '密码'}
            <input
              required
              type="password"
              minLength={mode === 'login' ? 1 : 10}
              maxLength={128}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'login' ? '输入你的密码' : '至少 10 位，建议混合字母与数字'}
            />
          </label>
          {mode === 'login' && (
            <Link href="/reset-password" className="forgot-link">
              忘记密码？
            </Link>
          )}
          {error && <Message error>{error}</Message>}
          {message && <Message>{message}</Message>}
          <button className="btn primary full-width" disabled={busy}>
            {busy
              ? '正在处理…'
              : mode === 'login'
                ? '登录，继续学习'
                : mode === 'register'
                  ? '验证邮箱并注册'
                  : '重置密码'}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              还没有账户？<Link href="/register">立即注册</Link>
            </>
          ) : (
            <>
              已有账户？<Link href="/login">返回登录</Link>
            </>
          )}
        </p>
        <div className="auth-note">
          <LockKeyhole size={14} />
          <p>注册向所有人开放。课程与会员文章需由管理员开通 VIP 后学习。</p>
        </div>
      </div>
    </div>
  );
}
function MyLearning({
  user,
  catalog,
  onlyBookmarks,
}: {
  user: SafeUser | null;
  catalog: Catalog;
  onlyBookmarks: boolean;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('courses');
  useEffect(() => {
    if (user)
      api<Dashboard>('/dashboard')
        .then(setDashboard)
        .catch((e) => setError(e.message));
  }, [user]);
  if (!user) return <AccessGate user={user} />;
  if (error) return <Message error>{error}</Message>;
  if (!dashboard) return <Loading />;
  const learnedIds = new Set(dashboard.progress.map((p) => p.courseId));
  const courses = catalog.courses.filter((c) =>
    onlyBookmarks ? dashboard.bookmarks.includes(c.id) : learnedIds.has(c.id),
  );
  const latest = dashboard.progress.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return (
    <>
      <PageHeading
        eyebrow={onlyBookmarks ? 'YOUR LITTLE COLLECTION' : 'ONE STEP AT A TIME'}
        title={onlyBookmarks ? '我的收藏' : '我的学习'}
        description={
          onlyBookmarks
            ? '感兴趣的课程先放在这里，等一个刚刚好的开始。'
            : '记录每一步进展，也为接下来的自己留一点期待。'
        }
        action={
          <Link href="/courses" className="btn">
            发现新课程 <ArrowUpRight size={15} />
          </Link>
        }
      />
      {!onlyBookmarks && (
        <>
          <div className="learning-stats">
            <div>
              <span>正在学习的课程</span>
              <strong>
                {learnedIds.size.toString().padStart(2, '0')}
                <small>门</small>
              </strong>
            </div>
            <div>
              <span>已完成的课节</span>
              <strong>
                {dashboard.progress
                  .filter((p) => p.completed)
                  .length.toString()
                  .padStart(2, '0')}
                <small>节</small>
              </strong>
            </div>
            <div>
              <span>写下的学习笔记</span>
              <strong>
                {dashboard.notes.length.toString().padStart(2, '0')}
                <small>条</small>
              </strong>
            </div>
            <div className="stat-vip">
              <Crown size={22} />
              <span>{user.isVip ? 'VIP 有效期至' : '当前会员状态'}</span>
              <strong>{user.isVip && user.vipExpiresAt ? dateLabel(user.vipExpiresAt) : '等待开启'}</strong>
              <Link href="/account">
                管理账户 <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
          {latest && (
            <Link className="continue-strip" href={`/learn/${latest.courseId}/${latest.lessonId}`}>
              <Play size={18} />
              <span>
                <small>继续最近的学习</small>
                <strong>{catalog.courses.find((c) => c.id === latest.courseId)?.title || '打开课程'}</strong>
              </span>
              <ArrowRight size={18} />
            </Link>
          )}
          <div className="filter-tabs learning-tabs">
            <button className={tab === 'courses' ? 'selected' : ''} onClick={() => setTab('courses')}>
              课程进度
            </button>
            <button className={tab === 'notes' ? 'selected' : ''} onClick={() => setTab('notes')}>
              学习笔记 · {dashboard.notes.length}
            </button>
          </div>
        </>
      )}
      {tab === 'notes' && !onlyBookmarks ? (
        dashboard.notes.length ? (
          <div className="notes-list">
            {dashboard.notes
              .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((note) => (
                <Link key={note.id} href={`/learn/${note.courseId}/${note.lessonId}`} className="note-card">
                  <div>
                    <NotebookPen size={16} />
                    <span>{catalog.courses.find((c) => c.id === note.courseId)?.title || '课程笔记'}</span>
                    <small>{dateLabel(note.updatedAt)}</small>
                  </div>
                  <p>{note.body}</p>
                  <span className="text-link">
                    回到这节课 <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
          </div>
        ) : (
          <Empty title="把灵感留下来" text="学习时在右侧笔记区写下思考，所有笔记都会汇集到这里。" />
        )
      ) : courses.length ? (
        <div className="course-grid catalog-grid">
          {courses.map((course) => (
            <CourseCard course={course} key={course.id} progress={dashboard.progress} />
          ))}
        </div>
      ) : (
        <Empty
          title={onlyBookmarks ? '收藏夹等待你的第一门课' : '你的第一节课，从这里开始'}
          text={
            onlyBookmarks
              ? '打开课程详情，点击「收藏课程」，为自己留下一份学习清单。'
              : user.isVip
                ? '挑一门感兴趣的课程开始学习，进度会自动保存在这里。'
                : '你已经拥有学习账户。管理员开通 VIP 后，就可以开始课程学习。'
          }
          action={
            <Link href="/courses" className="btn primary">
              去挑一门课 <ArrowRight size={15} />
            </Link>
          }
        />
      )}
    </>
  );
}
function ArticleRow({ article, index }: { article: PublicArticle; index: number }) {
  return (
    <Link href={`/articles/${article.id}`} className="article-row">
      <span className="article-num">{String(index + 1).padStart(2, '0')}</span>
      <div>
        <div className="article-label">
          {article.category}
          <span>·</span>
          {article.readMinutes} 分钟阅读{article.access === 'vip' && <span className="badge gold">VIP</span>}
        </div>
        <h3>{article.title}</h3>
        <p>{article.summary}</p>
      </div>
      <ArrowUpRight size={18} />
    </Link>
  );
}
function Articles({ catalog }: { catalog: Catalog }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const articles = catalog.articles.filter(
    (a) => (filter === 'all' || a.access === filter) && `${a.title} ${a.summary}`.includes(search),
  );
  return (
    <>
      <PageHeading
        eyebrow="IDEAS WORTH KEEPING"
        title="文章与灵感"
        description="一些经过实践的经验，一些还在生长的想法。慢慢读，认真想。"
      />
      <div className="catalog-toolbar">
        <div className="filter-tabs">
          {[
            ['all', '全部文章'],
            ['public', '公开阅读'],
            ['vip', '会员文章'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? 'selected' : ''}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="inline-search">
          <Search size={16} />
          <input
            aria-label="搜索文章"
            placeholder="搜索文章…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="article-list">
        {articles.length ? (
          articles.map((article, i) => <ArticleRow article={article} index={i} key={article.id} />)
        ) : (
          <Empty title="还没有匹配的文章" text="换个关键词再找找。" />
        )}
      </div>
    </>
  );
}
function Columns({ catalog, id }: { catalog: Catalog; id?: string }) {
  const column = catalog.columns.find((c) => c.id === id);
  if (id && !column) return <Empty title="专栏暂不可见" text="请选择其他已发布专栏。" />;
  return (
    <>
      <PageHeading
        eyebrow="A CONTINUING CONVERSATION"
        title={column?.title || '精选专栏'}
        description={column?.description || '把零散的知识连成线。围绕一个主题，持续地读、想、做。'}
        action={
          column && (
            <Link href="/columns" className="btn">
              <ArrowLeft size={15} />
              全部专栏
            </Link>
          )
        }
      />
      {column ? (
        <div className="article-list">
          {catalog.articles
            .filter((a) => a.columnId === column.id)
            .toSorted((a, b) => a.order - b.order)
            .map((article, i) => (
              <ArticleRow key={article.id} article={article} index={i} />
            ))}
          {!catalog.articles.some((a) => a.columnId === column.id) && (
            <Empty title="下一篇正在酝酿" text="这个专栏还没有发布文章。" />
          )}
        </div>
      ) : (
        <div className="columns-list">
          {catalog.columns.map((c, i) => (
            <Link key={c.id} href={`/columns/${c.id}`} className={`column-card art-${c.color}`}>
              <span className="column-number">{String(i + 1).padStart(2, '0')}</span>
              <BookOpen size={36} strokeWidth={1.3} />
              <div>
                <span className="eyebrow">BRCLIO COLUMN</span>
                <h2>{c.title}</h2>
                <p>{c.description}</p>
              </div>
              <span className="column-count">
                {catalog.articles.filter((a) => a.columnId === c.id).length} 篇文章 <ArrowUpRight size={20} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
function ArticleReader({ id, user, catalog }: { id: string; user: SafeUser | null; catalog: Catalog }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ article: Article }>(`/articles/${id}`)
      .then((data) => setArticle(data.article))
      .catch((e) => setError(e.message));
  }, [id]);
  const meta = catalog.articles.find((a) => a.id === id);
  if (error)
    return (
      <>
        <PageHeading
          eyebrow="THE READING ROOM"
          title={meta?.title || '文章暂不可见'}
          description={meta?.summary || error}
        />
        {meta?.access === 'vip' && !user?.isVip ? (
          <AccessGate user={user} />
        ) : (
          <Message error>{error}</Message>
        )}
      </>
    );
  if (!article) return <Loading />;
  const columnArticles = catalog.articles
    .filter((a) => a.columnId && a.columnId === article.columnId)
    .toSorted((a, b) => a.order - b.order);
  const next = columnArticles[columnArticles.findIndex((a) => a.id === id) + 1];
  return (
    <article className="article-reader">
      <Link className="back-link" href={article.columnId ? `/columns/${article.columnId}` : '/articles'}>
        <ArrowLeft size={15} />
        {article.columnId ? '返回专栏目录' : '全部文章'}
      </Link>
      <div className="badge-row">
        <span className="badge">{article.category}</span>
        <span className={`badge ${article.access === 'vip' ? 'gold' : 'neutral'}`}>
          {article.access === 'vip' ? 'VIP 文章' : '公开阅读'}
        </span>
      </div>
      <h1>{article.title}</h1>
      <p className="article-deck">{article.summary}</p>
      <div className="article-byline">
        <img src="/brand/avatar.png" alt="Brclio" />
        <span>Brclio</span>
        <span>{dateLabel(article.updatedAt)}</span>
        <span>{article.readMinutes} 分钟阅读</span>
      </div>
      <Markdown>{article.content}</Markdown>
      <div className="article-end">
        <span className="handwritten">Keep a little curiosity.</span>
        <p>读完之后，选一个最小的行动，今天就试一试。</p>
        {next && (
          <Link href={`/articles/${next.id}`} className="btn">
            专栏下一篇：{next.title}
            <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </article>
  );
}
function Account({ user, logout }: { user: SafeUser | null; logout: () => void }) {
  if (!user) return <AccessGate user={user} />;
  return (
    <>
      <PageHeading
        eyebrow="YOUR PERSONAL SPACE"
        title="账户与会员"
        description="你的资料、会员状态，以及下一次学习的起点。"
      />
      <div className="account-grid">
        <section className="panel">
          <h2>账户资料</h2>
          <dl className="account-details">
            <div>
              <dt>昵称</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>邮箱</dt>
              <dd>
                {user.email}
                <span className="verified-tag">
                  <CheckCircle2 size={13} />
                  已验证
                </span>
              </dd>
            </div>
            <div>
              <dt>注册时间</dt>
              <dd>{dateLabel(user.createdAt)}</dd>
            </div>
            <div>
              <dt>账户角色</dt>
              <dd>{user.role === 'admin' ? '管理员' : '学习者'}</dd>
            </div>
          </dl>
          <div className="button-row">
            <Link href="/reset-password" className="btn">
              修改密码
            </Link>
            <button className="btn" onClick={logout}>
              <LogOut size={15} />
              退出登录
            </button>
          </div>
        </section>
        <section className="membership-panel">
          <Crown size={30} strokeWidth={1.4} />
          <span className="eyebrow">A LITTLE MORE POSSIBILITY</span>
          <h2>{user.isVip ? '你的 VIP 学习之旅已开启' : '把学习，再向前推进一步'}</h2>
          <p>
            {user.isVip && user.vipExpiresAt
              ? `有效期至 ${new Date(user.vipExpiresAt).toLocaleString('zh-CN')}。到期后学习权限自动暂停，进度与笔记保留。`
              : user.vipExpiresAt
                ? `VIP 已于 ${dateLabel(user.vipExpiresAt)} 到期。联系 Brclio 续期后，继续原来的学习。`
                : '由 Brclio 为你的账户开通 VIP，即可学习全部已发布课程与会员文章。'}
          </p>
          <ul className="check-list">
            <li>
              <Check size={15} />
              完整系列课程与章节
            </li>
            <li>
              <Check size={15} />
              会员文章与专栏
            </li>
            <li>
              <Check size={15} />
              跨设备进度与个人笔记
            </li>
          </ul>
          <Link
            href={user.isVip ? '/courses' : 'https://brclio.com'}
            className="btn primary"
            {...(!user.isVip ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {user.isVip ? '继续探索课程' : '前往 Brclio 网站联系'}
            <ArrowUpRight size={16} />
          </Link>
          <small>开通时请提供注册邮箱：{user.email}</small>
        </section>
      </div>
    </>
  );
}
function Learning({
  course,
  lessonId,
  user,
}: {
  course?: PublicCourse;
  lessonId: string;
  user: SafeUser | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<{ lesson: Lesson; progress: Progress | null; note: Note | null } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [noteStatus, setNoteStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [part, setPart] = useState(0);
  const [resumeSeconds, setResumeSeconds] = useState(0);
  const [tab, setTab] = useState('content');
  const [progressError, setProgressError] = useState('');
  const playback = useRef({ seconds: 0, videoIndex: 0 });
  const activePart = useRef(0);
  const completion = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    if (course && user?.isVip)
      api<{ lesson: Lesson; progress: Progress | null; note: Note | null }>(
        `/lessons/${course.id}/${lessonId}`,
      )
        .then((data) => {
          setData(data);
          setNotes(data.note?.body || '');
          setCompleted(data.progress?.completed || false);
          completion.current = data.progress?.completed || false;
          setPart(Math.min(data.progress?.videoIndex || 0, Math.max(0, data.lesson.videos.length - 1)));
          activePart.current = Math.min(
            data.progress?.videoIndex || 0,
            Math.max(0, data.lesson.videos.length - 1),
          );
          setResumeSeconds(data.progress?.seconds || 0);
          playback.current = {
            seconds: data.progress?.seconds || 0,
            videoIndex: Math.min(data.progress?.videoIndex || 0, Math.max(0, data.lesson.videos.length - 1)),
          };
        })
        .catch((e) => setError(e.message));
  }, [course?.id, lessonId, user?.isVip, user?.id]);
  const saveProgress = useCallback(
    async (seconds: number, videoIndex: number, complete?: boolean) => {
      if (!course || !user?.isVip || activePart.current !== videoIndex) return;
      playback.current = { seconds, videoIndex };
      // A departing player's cleanup must never overwrite the newly selected part.
      const task = saveQueue.current
        .catch(() => {})
        .then(async () => {
          if (activePart.current !== videoIndex) return;
          await api('/progress', {
            courseId: course.id,
            lessonId,
            seconds,
            videoIndex,
            completed: complete ?? completion.current,
          });
        });
      saveQueue.current = task;
      try {
        await task;
        setProgressError('');
      } catch (e) {
        setProgressError((e as Error).message);
      }
    },
    [course?.id, lessonId, user?.isVip],
  );
  useEffect(() => {
    if (data && !data.progress) saveProgress(0, 0);
  }, [data]);
  if (!course) return <Empty title="课程暂不可见" text="回到课程目录选择已发布的内容。" />;
  if (!user?.isVip)
    return (
      <>
        <Link href={`/courses/${course.id}`} className="back-link">
          <ArrowLeft size={15} />
          返回课程目录
        </Link>
        <AccessGate user={user} />
      </>
    );
  if (error) return <Message error>{error}</Message>;
  if (!data) return <Loading />;
  const allLessons = flatLessons(course);
  const index = allLessons.findIndex((l) => l.id === lessonId);
  const previous = allLessons[index - 1];
  const next = allLessons[index + 1];
  async function saveNote() {
    setSaving(true);
    try {
      await api('/notes', { courseId: course!.id, lessonId, body: notes });
      setNoteStatus('已保存。你的笔记仅自己可见。');
    } catch (e) {
      setNoteStatus((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function markComplete() {
    setSaving(true);
    const previousCompletion = completion.current;
    completion.current = !previousCompletion;
    const task = saveQueue.current
      .catch(() => {})
      .then(async () => {
        await api('/progress', {
          courseId: course!.id,
          lessonId,
          ...playback.current,
          completed: !previousCompletion,
          resetCompleted: previousCompletion,
        });
      });
    saveQueue.current = task;
    try {
      await task;
      setCompleted(completion.current);
      setProgressError('');
    } catch (e) {
      completion.current = previousCompletion;
      setProgressError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="learning-top">
        <Link href={`/courses/${course.id}`} className="back-link">
          <ArrowLeft size={15} />
          {course.title}
        </Link>
        <span className="muted">
          第 {index + 1} / {allLessons.length} 节
        </span>
      </div>
      <div className="learning-layout">
        <div className="lesson-main">
          {data.lesson.kind === 'video' && data.lesson.videos.length > 0 ? (
            <>
              <VideoPlayer
                key={`${lessonId}-${part}`}
                videoId={data.lesson.videos[part]?.id || data.lesson.videos[0].id}
                title={data.lesson.videos[part]?.title || data.lesson.title}
                startSeconds={resumeSeconds}
                onProgress={(seconds) => saveProgress(seconds, part)}
                onEnded={() => {
                  if (part < data.lesson.videos.length - 1) {
                    activePart.current = part + 1;
                    setResumeSeconds(0);
                    setPart(part + 1);
                    saveProgress(0, part + 1);
                  }
                }}
              />
              {data.lesson.videos.length > 1 && (
                <div className="video-parts" aria-label="本节视频分段">
                  {data.lesson.videos.map((video, i) => (
                    <button
                      key={video.id}
                      className={`btn small ${part === i ? 'primary' : ''}`}
                      onClick={() => {
                        if (i === part) return;
                        activePart.current = i;
                        setResumeSeconds(0);
                        setPart(i);
                        saveProgress(0, i);
                      }}
                    >
                      <Play size={13} />
                      {video.title || `视频 ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-lesson-banner">
              <FileText size={29} />
              <span>READ, THINK, BUILD.</span>
              <p>读一点，动手做一点。</p>
            </div>
          )}
          <div className="lesson-heading">
            <div>
              <span className="eyebrow">
                LESSON {String(index + 1).padStart(2, '0')} ·{' '}
                {data.lesson.kind === 'video' ? '视频课程' : '图文课程'}
              </span>
              <h1>{data.lesson.title}</h1>
            </div>
            <button
              className={`btn ${completed ? 'completed-btn' : 'primary'}`}
              disabled={saving}
              onClick={markComplete}
            >
              {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {completed ? '已完成 · 取消标记' : '标记为已学完'}
            </button>
          </div>
          {progressError && <Message error>进度保存失败：{progressError}</Message>}
          <div className="filter-tabs learning-tabs">
            <button className={tab === 'content' ? 'selected' : ''} onClick={() => setTab('content')}>
              课节内容
            </button>
            <button className={tab === 'notes' ? 'selected' : ''} onClick={() => setTab('notes')}>
              我的笔记
            </button>
            <button className={tab === 'resources' ? 'selected' : ''} onClick={() => setTab('resources')}>
              学习资料 · {data.lesson.resources.length}
            </button>
          </div>
          <div className="lesson-content">
            {tab === 'content' && (
              <Markdown>{data.lesson.content || '观看本节视频，完成练习后记下你的收获。'}</Markdown>
            )}
            {tab === 'notes' && (
              <div className="note-editor">
                <label className="field">
                  把自己的理解写下来
                  <textarea
                    rows={10}
                    maxLength={20000}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setNoteStatus('有未保存的修改');
                    }}
                    placeholder="一个新的理解、一段练习记录，或下次要继续探索的问题…"
                  />
                </label>
                <div className="note-editor-footer">
                  <span role="status" className="muted">
                    {noteStatus || '笔记仅自己可见，记得保存。'}
                  </span>
                  <button className="btn primary" disabled={saving} onClick={saveNote}>
                    <NotebookPen size={15} />
                    {saving ? '保存中…' : '保存笔记'}
                  </button>
                </div>
              </div>
            )}
            {tab === 'resources' &&
              (data.lesson.resources.length ? (
                <div className="resource-list">
                  {data.lesson.resources.map((resource) => (
                    <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer">
                      <FileText size={18} />
                      <span>{resource.title}</span>
                      <ArrowUpRight size={16} />
                    </a>
                  ))}
                </div>
              ) : (
                <Empty title="这一节，轻装上阵" text="目前没有附加资料，练习说明都在课节内容里。" />
              ))}
          </div>
          <div className="lesson-pagination">
            {previous ? (
              <button className="btn" onClick={() => router.push(`/learn/${course.id}/${previous.id}`)}>
                <ArrowLeft size={15} />
                上一节
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button className="btn" onClick={() => router.push(`/learn/${course.id}/${next.id}`)}>
                下一节
                <ArrowRight size={15} />
              </button>
            ) : (
              <Link href={`/courses/${course.id}`} className="btn">
                回顾整门课程
                <Check size={15} />
              </Link>
            )}
          </div>
        </div>
        <aside className="lesson-sidebar">
          <h2>
            <Layers3 size={17} />
            课程目录
          </h2>
          {course.chapters.map((chapter, ci) => (
            <div key={chapter.id} className="lesson-nav-chapter">
              <h3>
                {String(ci + 1).padStart(2, '0')} · {chapter.title}
              </h3>
              {chapter.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/${course.id}/${lesson.id}`}
                  className={lessonId === lesson.id ? 'current' : ''}
                  aria-current={lessonId === lesson.id ? 'page' : undefined}
                >
                  {lessonId === lesson.id ? <Play size={14} /> : <Circle size={12} />}
                  <span>{lesson.title}</span>
                  {lessonId === lesson.id && completed && <Check size={13} />}
                </Link>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
