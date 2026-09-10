export type Video = { id: string; title: string };
export type Lesson = {
  id: string;
  title: string;
  duration: string;
  kind: 'video' | 'article';
  content: string;
  videos: Video[];
  resources: { title: string; url: string }[];
};
export type Chapter = { id: string; title: string; lessons: Lesson[] };
export type Course = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  color: 'blue' | 'yellow' | 'green' | 'pink';
  cover: string;
  featured: boolean;
  published: boolean;
  demo: boolean;
  outcomes: string[];
  chapters: Chapter[];
  updatedAt: string;
};
export type PublicLesson = Pick<Lesson, 'id' | 'title' | 'duration' | 'kind'>;
export type PublicCourse = Omit<Course, 'chapters'> & {
  chapters: { id: string; title: string; lessons: PublicLesson[] }[];
};
export type Article = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  access: 'public' | 'vip';
  columnId: string | null;
  order: number;
  published: boolean;
  readMinutes: number;
  updatedAt: string;
};
export type PublicArticle = Omit<Article, 'content'>;
export type Column = {
  id: string;
  title: string;
  description: string;
  color: 'blue' | 'yellow' | 'green' | 'pink';
  published: boolean;
};
export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin';
  verifiedAt: string;
  vipExpiresAt: string | null;
  createdAt: string;
};
export type SafeUser = Omit<User, 'passwordHash'> & { isVip: boolean };
export type Progress = {
  userId: string;
  courseId: string;
  lessonId: string;
  videoIndex: number;
  seconds: number;
  completed: boolean;
  updatedAt: string;
};
export type Note = {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  body: string;
  updatedAt: string;
};
export type Verification = {
  email: string;
  purpose: 'register' | 'reset';
  codeHash: string;
  expiresAt: string;
  attempts: number;
  sentAt: string;
};
export type Session = { tokenHash: string; userId: string; expiresAt: string };
export type RateLimit = { key: string; count: number; resetAt: string };
export type Audit = { id: string; actorId: string; action: string; targetId: string; at: string };
export type Database = {
  version: 1;
  users: User[];
  sessions: Session[];
  verifications: Verification[];
  rateLimits: RateLimit[];
  courses: Course[];
  articles: Article[];
  columns: Column[];
  progress: Progress[];
  notes: Note[];
  bookmarks: { userId: string; courseId: string }[];
  audit: Audit[];
};
export type Catalog = { courses: PublicCourse[]; articles: PublicArticle[]; columns: Column[] };
export type Dashboard = { progress: Progress[]; notes: Note[]; bookmarks: string[] };
