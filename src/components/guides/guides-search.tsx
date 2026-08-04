"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GuideSearchHit } from "@/lib/guides";
import { CATEGORY_LABELS } from "@/lib/guides";
import { FRAMEWORKS } from "@/lib/guides/frameworks";

export function GuidesSearchClient({ index }: { index: GuideSearchHit[] }) {
  const [q, setQ] = useState("");
  const [framework, setFramework] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tag, setTag] = useState("");
  const [cli, setCli] = useState("");

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const h of index) h.tags.forEach((t) => s.add(t));
    return [...s].sort();
  }, [index]);

  const allCli = useMemo(() => {
    const s = new Set<string>();
    for (const h of index) h.cliCommands.forEach((c) => s.add(c));
    return [...s].sort();
  }, [index]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return index.filter((h) => {
      if (framework && h.frameworkId !== framework) return false;
      if (category && h.category !== category) return false;
      if (difficulty && h.difficulty !== difficulty) return false;
      if (tag && !h.tags.includes(tag)) return false;
      if (cli && !h.cliCommands.includes(cli)) return false;
      if (!query) return true;
      const hay = [
        h.title,
        h.description,
        h.frameworkName,
        h.topicName,
        h.tags.join(" "),
        h.cliCommands.join(" "),
        h.body,
      ]
        .join("\n")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [index, q, framework, category, difficulty, tag, cli]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-3">
          <span className="text-fg-muted">Search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. llms.txt, LCP, metadata…"
            className="rounded-md border border-border bg-bg px-3 py-2.5 text-fg"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-muted">Framework</span>
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
          >
            <option value="">All</option>
            {FRAMEWORKS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-muted">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
          >
            <option value="">All</option>
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-muted">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
          >
            <option value="">All</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-muted">Tag</span>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
          >
            <option value="">All</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-fg-muted">CLI command</span>
          <select
            value={cli}
            onChange={(e) => setCli(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
          >
            <option value="">All</option>
            {allCli.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-fg-muted">
        {results.length} guide{results.length === 1 ? "" : "s"}
      </p>

      <ul className="space-y-3">
        {results.map((h) => (
          <li
            key={h.path}
            className="rounded-xl border border-border/80 bg-bg-elevated/40 p-4"
          >
            <Link
              href={h.path}
              className="font-display text-lg font-semibold text-fg hover:text-accent"
            >
              {h.title}
            </Link>
            <p className="mt-1 text-xs text-fg-subtle">
              {h.frameworkName} · {CATEGORY_LABELS[h.category]} · {h.difficulty}
            </p>
            <p className="mt-2 text-sm text-fg-muted">{h.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
