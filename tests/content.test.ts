import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/lib/seed';
import { databaseSchema } from '../src/lib/validation';

const suppliedVideos = [
  ['u13DKz6cnbo', 'QqvgGFEr1j0'],
  ['hJJ-gBs-xSg', 'fCwJtJnDw1s'],
  ['0RCQsNCF2Ag'],
  ['cRjBvVDkCNU'],
  ['CJQdwZZJWko'],
  ['PDDhRaSVh2A'],
  ['7U6_pmCI3xw'],
  ['Zu0w5HIb8tI'],
  ['wEJsQWCvTTc'],
  ['dg0xrWk6P5M'],
  ['MjlCEPIPHks'],
  ['yofJ2wmht6o'],
  ['91pIByAevSQ'],
  ['3U7j6oRsVgY'],
  ['UZaiN03ilFg'],
  ['wjTz6ywBGz8'],
  ['J-VpB3F0LI4'],
];

function unique(values: string[], description: string) {
  assert.equal(new Set(values).size, values.length, `${description} must not contain duplicate IDs`);
}

test('AI sample preserves the supplied 6 chapters, 17 lessons and all 19 video parts in exact order', () => {
  const data = databaseSchema.parse(createSeed());
  const course = data.courses.find((item) => item.id === 'ai-filmmaking');
  assert.ok(course, 'supplied AI course is present');
  assert.deepEqual(
    course.chapters.map((chapter) => chapter.title),
    [
      '课程介绍 & 目标',
      'AI 工具介绍',
      '案例 1：文字型影片',
      '案例 2：动画型影片',
      '3D 广告型影片',
      'AI 影片的未来？',
    ],
  );
  assert.deepEqual(
    course.chapters.map((chapter) => chapter.lessons.length),
    [2, 1, 3, 6, 4, 1],
  );
  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
  assert.equal(lessons.length, 17);
  assert.deepEqual(
    lessons.map((lesson) => lesson.videos.map((video) => video.id)),
    suppliedVideos,
  );
  assert.equal(suppliedVideos.flat().length, 19);
  assert.ok(lessons.every((lesson) => lesson.kind === 'video'));
  assert.equal(course.demo, true);
  assert.ok(
    lessons.every((lesson) => lesson.duration === '视频课'),
    'unverified video durations must not be fabricated',
  );
});

test('initial content has stable unique IDs and valid column references; fresh databases contain no accounts', () => {
  const data = databaseSchema.parse(createSeed());
  unique(
    data.courses.map((course) => course.id),
    'course',
  );
  unique(
    data.courses.flatMap((course) => course.chapters.map((chapter) => chapter.id)),
    'chapter',
  );
  unique(
    data.courses.flatMap((course) =>
      course.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id)),
    ),
    'lesson',
  );
  unique(
    data.articles.map((article) => article.id),
    'article',
  );
  unique(
    data.columns.map((column) => column.id),
    'column',
  );
  for (const article of data.articles) {
    assert.ok(
      article.columnId === null || data.columns.some((column) => column.id === article.columnId),
      `${article.id} references an existing column`,
    );
  }
  assert.ok(data.articles.some((article) => article.access === 'public'));
  assert.ok(data.articles.some((article) => article.access === 'vip'));
  assert.deepEqual(data.users, []);
  assert.deepEqual(data.sessions, []);
  assert.deepEqual(data.verifications, []);
  assert.deepEqual(data.progress, []);
  assert.deepEqual(data.notes, []);
});

test('additional examples are substantive text courses, and independent database initialization cannot mutate the source seed', () => {
  const first = createSeed();
  const examples = first.courses.filter((course) => course.id !== 'ai-filmmaking');
  assert.equal(examples.length, 3);
  for (const course of examples) {
    assert.equal(course.demo, true);
    assert.equal(course.chapters.length, 3);
    assert.equal(course.chapters.flatMap((chapter) => chapter.lessons).length, 6);
    for (const lesson of course.chapters.flatMap((chapter) => chapter.lessons)) {
      assert.equal(lesson.kind, 'article');
      assert.deepEqual(lesson.videos, [], 'text examples must not include invented video links');
      assert.ok(lesson.content.length >= 200, `${lesson.id} has a real lesson body`);
      assert.match(lesson.content, /## /);
      assert.match(lesson.content, /练习|验收|演练|交付/);
    }
  }
  const expected = createSeed();
  first.courses[0].chapters[0].lessons[0].videos[0].id = 'XXXXXXXXXXX';
  first.courses.length = 0;
  first.columns[0].title = 'changed';
  first.articles[0].content = 'changed';
  assert.deepEqual(
    createSeed(),
    expected,
    'each initialization owns an isolated copy, including nested content',
  );
});
