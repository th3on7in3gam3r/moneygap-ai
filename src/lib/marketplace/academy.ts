import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { academyCourses, academyLessons, academyProgress } from "@/db/schema";

const SEED = [
  {
    slug: "moneygap-fundamentals",
    title: "MoneyGap Fundamentals",
    summary: "Learn the growth chain and how to read a MoneyGap report.",
    level: "intro",
    sortOrder: 10,
    lessons: [
      {
        slug: "growth-chain",
        title: "The growth chain",
        body: "Visibility → Traffic → Leads → Customers → Revenue → Growth. Every finding must connect.",
        sortOrder: 1,
      },
      {
        slug: "reading-scores",
        title: "Reading MoneyGap Score™",
        body: "Score and revenue-at-risk are AI Estimates that prioritize work—not guarantees.",
        sortOrder: 2,
      },
    ],
  },
  {
    slug: "fix-paths-studio",
    title: "Fix Paths & Action Center",
    summary: "Choose how to implement opportunities with Fix Path Chooser™.",
    level: "intermediate",
    sortOrder: 20,
    lessons: [
      {
        slug: "choose-a-path",
        title: "Choose a Fix Path",
        body: "Action Center, checklist, Developer/AI, Automation, Hub, or Advisor—pick the best fit.",
        sortOrder: 1,
      },
      {
        slug: "never-auto-publish",
        title: "Never auto-publish",
        body: "Drafts stay drafts until a human publishes outside MoneyGap.",
        sortOrder: 2,
      },
    ],
  },
  {
    slug: "marketplace-creators",
    title: "Publishing to the Marketplace",
    summary: "How creators and partners ship packs and recipes.",
    level: "advanced",
    sortOrder: 30,
    lessons: [
      {
        slug: "manifest-basics",
        title: "Plugin manifest basics",
        body: "Declare id, version, category, and source refs. Runtime execution ships later.",
        sortOrder: 1,
      },
    ],
  },
];

export async function ensureAcademy() {
  for (const course of SEED) {
    let row = await db.query.academyCourses.findFirst({
      where: eq(academyCourses.slug, course.slug),
    });
    if (!row) {
      const [created] = await db
        .insert(academyCourses)
        .values({
          slug: course.slug,
          title: course.title,
          summary: course.summary,
          level: course.level,
          sortOrder: course.sortOrder,
          status: "published",
        })
        .returning();
      row = created;
    }
    const lessons = await db.query.academyLessons.findMany({
      where: eq(academyLessons.courseId, row!.id),
    });
    const have = new Set(lessons.map((l) => l.slug));
    for (const lesson of course.lessons) {
      if (have.has(lesson.slug)) continue;
      await db.insert(academyLessons).values({
        courseId: row!.id,
        ...lesson,
      });
    }
  }
}

export async function listAcademy(workspaceId: string) {
  await ensureAcademy();
  const courses = await db.query.academyCourses.findMany({
    where: eq(academyCourses.status, "published"),
    orderBy: [asc(academyCourses.sortOrder)],
    with: { lessons: true },
  });
  const progress = await db.query.academyProgress.findMany({
    where: eq(academyProgress.workspaceId, workspaceId),
  });
  const completed = new Set(progress.map((p) => p.lessonId));
  return courses.map((c) => ({
    ...c,
    lessons: (c.lessons ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => ({
        ...l,
        completed: completed.has(l.id),
      })),
  }));
}

export async function completeLesson(input: {
  workspaceId: string;
  userId: string;
  lessonId: string;
}) {
  const lesson = await db.query.academyLessons.findFirst({
    where: eq(academyLessons.id, input.lessonId),
  });
  if (!lesson) {
    return { ok: false as const, status: 404 as const, error: "Lesson not found" };
  }
  const existing = await db.query.academyProgress.findFirst({
    where: and(
      eq(academyProgress.workspaceId, input.workspaceId),
      eq(academyProgress.lessonId, input.lessonId),
    ),
  });
  if (existing) {
    return { ok: true as const, progress: existing, event: "academy.lesson_completed" as const };
  }
  const [row] = await db
    .insert(academyProgress)
    .values({
      workspaceId: input.workspaceId,
      lessonId: input.lessonId,
      userId: input.userId,
    })
    .returning();
  return { ok: true as const, progress: row, event: "academy.lesson_completed" as const };
}
