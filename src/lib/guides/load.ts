import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { relatedTopicIds } from "./graph";
import { getFramework, FRAMEWORKS, isFrameworkId } from "./frameworks";
import { mergeSections, parseFrontmatter, splitSections } from "./parse";
import { getTopic, isTopicId, TOPICS } from "./topics";
import type {
  FrameworkId,
  GuideModel,
  GuideSearchHit,
  TopicId,
} from "./types";

const ROOT = path.join(process.cwd(), "content", "guides");

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readMd(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

export function guidePath(frameworkId: FrameworkId, topicId: TopicId): string {
  return `/guides/${frameworkId}/${topicId}`;
}

export async function listPublishedGuides(): Promise<
  { frameworkId: FrameworkId; topicId: TopicId }[]
> {
  const overlaysDir = path.join(ROOT, "overlays");
  if (!(await exists(overlaysDir))) return [];

  const out: { frameworkId: FrameworkId; topicId: TopicId }[] = [];
  const fwDirs = await readdir(overlaysDir, { withFileTypes: true });
  for (const d of fwDirs) {
    if (!d.isDirectory() || !isFrameworkId(d.name)) continue;
    const files = await readdir(path.join(overlaysDir, d.name));
    for (const f of files) {
      if (!f.endsWith(".md")) continue;
      const topicId = f.replace(/\.md$/, "");
      if (!isTopicId(topicId)) continue;
      const concept = path.join(ROOT, "concepts", `${topicId}.md`);
      if (!(await exists(concept))) continue;
      out.push({ frameworkId: d.name, topicId });
    }
  }
  return out.sort((a, b) =>
    `${a.frameworkId}/${a.topicId}`.localeCompare(`${b.frameworkId}/${b.topicId}`),
  );
}

export async function listPublishedForFramework(
  frameworkId: FrameworkId,
): Promise<TopicId[]> {
  const all = await listPublishedGuides();
  return all.filter((g) => g.frameworkId === frameworkId).map((g) => g.topicId);
}

export async function loadGuide(
  frameworkId: string,
  topicId: string,
): Promise<GuideModel | null> {
  if (!isFrameworkId(frameworkId) || !isTopicId(topicId)) return null;
  const framework = getFramework(frameworkId);
  const topic = getTopic(topicId);
  if (!framework || !topic) return null;

  const conceptRaw = await readMd(path.join(ROOT, "concepts", `${topicId}.md`));
  const overlayRaw = await readMd(
    path.join(ROOT, "overlays", frameworkId, `${topicId}.md`),
  );
  if (!conceptRaw || !overlayRaw) return null;

  const concept = parseFrontmatter(conceptRaw);
  const overlay = parseFrontmatter(overlayRaw);
  const sections = mergeSections(
    splitSections(concept.body),
    splitSections(overlay.body),
  );

  const tags = [
    ...new Set([
      ...topic.tags,
      ...(concept.data.tags ?? []),
      ...(overlay.data.tags ?? []),
    ]),
  ];
  const cliCommands = [
    ...new Set([
      ...(concept.data.cliCommands ?? []),
      ...(overlay.data.cliCommands ?? []),
      "moneygap scan",
    ]),
  ];

  return {
    framework,
    topic,
    title:
      overlay.data.title ||
      concept.data.title ||
      `${topic.name} in ${framework.name}`,
    description:
      overlay.data.description ||
      concept.data.description ||
      topic.summary,
    difficulty:
      overlay.data.difficulty ||
      concept.data.difficulty ||
      topic.difficulty,
    tags,
    cliCommands,
    updated: overlay.data.updated || concept.data.updated || null,
    sections,
    path: guidePath(frameworkId, topicId),
  };
}

export async function relatedGuides(
  frameworkId: FrameworkId,
  topicId: TopicId,
  limit = 6,
): Promise<{ frameworkId: FrameworkId; topicId: TopicId; path: string; title: string }[]> {
  const published = await listPublishedGuides();
  const pubSet = new Set(published.map((p) => `${p.frameworkId}/${p.topicId}`));
  const related = relatedTopicIds(topicId);
  const results: {
    frameworkId: FrameworkId;
    topicId: TopicId;
    path: string;
    title: string;
  }[] = [];

  // Prefer same framework related topics
  for (const t of related) {
    const key = `${frameworkId}/${t}`;
    if (pubSet.has(key)) {
      const topic = getTopic(t)!;
      const fw = getFramework(frameworkId)!;
      results.push({
        frameworkId,
        topicId: t,
        path: guidePath(frameworkId, t),
        title: `${topic.name} · ${fw.name}`,
      });
    }
  }
  // Then other frameworks for same topic
  for (const p of published) {
    if (p.topicId === topicId && p.frameworkId !== frameworkId) {
      const topic = getTopic(p.topicId)!;
      const fw = getFramework(p.frameworkId)!;
      results.push({
        frameworkId: p.frameworkId,
        topicId: p.topicId,
        path: guidePath(p.frameworkId, p.topicId),
        title: `${topic.name} · ${fw.name}`,
      });
    }
  }
  return results.slice(0, limit);
}

export async function buildSearchIndex(): Promise<GuideSearchHit[]> {
  const published = await listPublishedGuides();
  const hits: GuideSearchHit[] = [];
  for (const p of published) {
    const guide = await loadGuide(p.frameworkId, p.topicId);
    if (!guide) continue;
    const body = Object.values(guide.sections).filter(Boolean).join("\n\n");
    hits.push({
      frameworkId: p.frameworkId,
      topicId: p.topicId,
      path: guide.path,
      title: guide.title,
      description: guide.description,
      frameworkName: guide.framework.name,
      topicName: guide.topic.name,
      category: guide.topic.category,
      difficulty: guide.difficulty,
      tags: guide.tags,
      cliCommands: guide.cliCommands,
      body: body.slice(0, 8000),
    });
  }
  return hits;
}

export function frameworksWithPublished(
  published: { frameworkId: FrameworkId; topicId: TopicId }[],
) {
  const counts = new Map<FrameworkId, number>();
  for (const p of published) {
    counts.set(p.frameworkId, (counts.get(p.frameworkId) ?? 0) + 1);
  }
  return FRAMEWORKS.map((f) => ({
    ...f,
    publishedCount: counts.get(f.id) ?? 0,
  })).filter((f) => f.publishedCount > 0);
}

export { FRAMEWORKS, TOPICS, getFramework, getTopic };
