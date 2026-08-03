import { readFile } from "node:fs/promises";
import path from "node:path";
import { markdownToHtml, type TocItem } from "@/lib/growth-academy/markdown";
import { getPublicDoc, type PublicDocEntry } from "@/lib/docs/catalog";

export type LoadedPublicDoc = {
  entry: PublicDocEntry;
  title: string;
  description: string;
  markdown: string;
  html: string;
  toc: TocItem[];
};

const CONTENT_DIR = path.join(process.cwd(), "content", "docs");

function stripH1(md: string): { title: string | null; body: string } {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let title: string | null = null;
  let i = 0;
  while (i < lines.length && !lines[i]!.trim()) i += 1;
  const h1 = lines[i]?.match(/^#\s+(.+)$/);
  if (h1) {
    title = h1[1]!.trim();
    i += 1;
    while (i < lines.length && !lines[i]!.trim()) i += 1;
    return { title, body: lines.slice(i).join("\n").trimStart() };
  }
  return { title: null, body: md };
}

function firstParagraph(md: string): string {
  const block = md
    .split(/\n\n+/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith("#") && !p.startsWith("-") && !p.startsWith(">"));
  if (!block) return "";
  return block.replace(/\s+/g, " ").replace(/[*_`]/g, "").slice(0, 180);
}

export async function loadPublicDoc(
  slug: string,
): Promise<LoadedPublicDoc | null> {
  const entry = getPublicDoc(slug);
  if (!entry) return null;

  let raw: string;
  try {
    raw = await readFile(path.join(CONTENT_DIR, `${slug}.md`), "utf8");
  } catch {
    return null;
  }

  const { title: h1, body } = stripH1(raw);
  const { html, toc } = markdownToHtml(body);
  const description = entry.summary || firstParagraph(body);

  return {
    entry,
    title: h1 ?? entry.title,
    description,
    markdown: raw,
    html,
    toc,
  };
}
