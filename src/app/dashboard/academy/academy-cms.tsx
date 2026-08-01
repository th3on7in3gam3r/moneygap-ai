"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bodyMarkdown: string;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  featuredImageUrl: string | null;
  authorId: string | null;
  readingTimeMinutes: number;
  updatedAt: string;
};

type Category = { id: string; name: string; slug: string };
type Idea = { id: string; title: string; summary: string; theme: string };
type Version = {
  id: string;
  version: number;
  title: string;
  createdAt: string;
};
type LinkSuggestion = { href: string; label: string; reason: string };

export function AcademyCms() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [links, setLinks] = useState<LinkSuggestion[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [tagNames, setTagNames] = useState("");
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    bodyMarkdown: "",
    seoTitle: "",
    seoDescription: "",
    featuredImageUrl: "",
    featured: false,
    status: "draft",
  });
  const [aiTopic, setAiTopic] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  function loadList() {
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/growth-academy/articles");
          const body = (await res.json()) as {
            enabled?: boolean;
            message?: string;
            articles?: Article[];
            categories?: Category[];
            ideas?: Idea[];
            error?: string;
          };
          if (!res.ok) {
            setError(body.error ?? "Could not load CMS");
            return;
          }
          if (body.enabled === false) {
            setError(body.message ?? "Growth Academy™ is disabled");
            return;
          }
          setArticles(body.articles ?? []);
          setCategories(body.categories ?? []);
          setIdeas(body.ideas ?? []);
          setError(null);
        } catch {
          setError("Could not load CMS");
        }
      })();
    });
  }

  function loadArticle(id: string) {
    startTransition(() => {
      void (async () => {
        const res = await fetch(`/api/growth-academy/articles/${id}`);
        const body = (await res.json()) as {
          article?: Article;
          categories?: Category[];
          tags?: { name: string }[];
          versions?: Version[];
          linkSuggestions?: LinkSuggestion[];
          error?: string;
        };
        if (!res.ok || !body.article) {
          setError(body.error ?? "Could not load article");
          return;
        }
        const a = body.article;
        setSelectedId(a.id);
        setForm({
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt ?? "",
          bodyMarkdown: a.bodyMarkdown,
          seoTitle: a.seoTitle ?? "",
          seoDescription: a.seoDescription ?? "",
          featuredImageUrl: a.featuredImageUrl ?? "",
          featured: a.featured,
          status: a.status,
        });
        setCategoryIds((body.categories ?? []).map((c) => c.id));
        setTagNames((body.tags ?? []).map((t) => t.name).join(", "));
        setVersions(body.versions ?? []);
        setLinks(body.linkSuggestions ?? []);
      })();
    });
  }

  useEffect(() => {
    loadList();
  }, []);

  function resetNew() {
    setSelectedId(null);
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      bodyMarkdown: "",
      seoTitle: "",
      seoDescription: "",
      featuredImageUrl: "",
      featured: false,
      status: "draft",
    });
    setCategoryIds([]);
    setTagNames("");
    setVersions([]);
    setLinks([]);
  }

  function save() {
    startTransition(() => {
      void (async () => {
        setError(null);
        const payload = {
          ...form,
          categoryIds,
          tagNames: tagNames
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        };
        const res = await fetch(
          selectedId
            ? `/api/growth-academy/articles/${selectedId}`
            : "/api/growth-academy/articles",
          {
            method: selectedId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const body = (await res.json()) as { article?: Article; error?: string };
        if (!res.ok) {
          setError(body.error ?? "Save failed");
          return;
        }
        if (body.article) {
          setSelectedId(body.article.id);
          loadList();
          loadArticle(body.article.id);
        }
      })();
    });
  }

  function runAction(action: string) {
    if (!selectedId) return;
    startTransition(() => {
      void (async () => {
        const res = await fetch(`/api/growth-academy/articles/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            scheduledAt: scheduledAt || undefined,
          }),
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(body.error ?? "Action failed");
          return;
        }
        loadList();
        loadArticle(selectedId);
      })();
    });
  }

  function generateAi() {
    startTransition(() => {
      void (async () => {
        setError(null);
        const res = await fetch("/api/growth-academy/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: aiTopic || form.title || "Buyer-intent SEO content",
            categoryId: categoryIds[0],
          }),
        });
        const body = (await res.json()) as { article?: Article; error?: string };
        if (!res.ok) {
          setError(body.error ?? "AI generation failed");
          return;
        }
        if (body.article) {
          loadList();
          loadArticle(body.article.id);
        }
      })();
    });
  }

  function draftFromIdea(ideaId: string) {
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/growth-academy/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ideaId }),
        });
        const body = (await res.json()) as { article?: Article; error?: string };
        if (!res.ok) {
          setError(body.error ?? "Could not create draft");
          return;
        }
        if (body.article) {
          loadList();
          loadArticle(body.article.id);
        }
      })();
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <Card>
          <CardHeader>
            <div>
              <h2 className="font-display text-lg font-semibold">Articles</h2>
              <p className="text-xs text-fg-muted">Draft → preview → publish</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={resetNew}>
              New
            </Button>
          </CardHeader>
          <CardBody className="max-h-[70vh] space-y-2 overflow-y-auto">
            {articles.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => loadArticle(a.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectedId === a.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-border-strong"
                }`}
              >
                <p className="font-medium text-fg">{a.title}</p>
                <p className="mt-1 text-[11px] text-fg-subtle">
                  {a.status} · /{a.slug}
                </p>
              </button>
            ))}
            {articles.length === 0 ? (
              <p className="text-sm text-fg-muted">No articles yet.</p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">
              {selectedId ? "Edit article" : "Create article"}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save draft"}
              </Button>
              {selectedId && form.slug ? (
                <Button
                  href={`/academy/${form.slug}?preview=1`}
                  size="sm"
                  variant="secondary"
                >
                  Preview
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="text-fg-subtle">Title</span>
              <input
                className="w-full rounded-xl border border-border bg-bg px-3 py-2"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-fg-subtle">Slug</span>
              <input
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 font-mono text-xs"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-fg-subtle">Excerpt</span>
              <textarea
                className="min-h-20 w-full rounded-xl border border-border bg-bg px-3 py-2"
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-fg-subtle">Body (markdown)</span>
              <textarea
                className="min-h-64 w-full rounded-xl border border-border bg-bg px-3 py-2 font-mono text-xs"
                value={form.bodyMarkdown}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bodyMarkdown: e.target.value }))
                }
              />
            </label>

            <div className="rounded-xl border border-border bg-bg px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                SEO preview
              </p>
              <p className="mt-2 text-sm font-medium text-accent">
                {form.seoTitle || form.title || "Title"}
              </p>
              <p className="text-xs text-fg-muted">
                moneygap-ai.com/academy/{form.slug || "slug"}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {form.seoDescription || form.excerpt || "Meta description"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="text-fg-subtle">SEO title</span>
                <input
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2"
                  value={form.seoTitle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, seoTitle: e.target.value }))
                  }
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-fg-subtle">Featured image URL</span>
                <input
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2"
                  value={form.featuredImageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, featuredImageUrl: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-fg-subtle">SEO description</span>
              <textarea
                className="min-h-16 w-full rounded-xl border border-border bg-bg px-3 py-2"
                value={form.seoDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seoDescription: e.target.value }))
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-fg-subtle">Tags (comma-separated)</span>
              <input
                className="w-full rounded-xl border border-border bg-bg px-3 py-2"
                value={tagNames}
                onChange={(e) => setTagNames(e.target.value)}
              />
            </label>
            <div>
              <p className="text-sm text-fg-subtle">Categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => {
                  const on = categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setCategoryIds((ids) =>
                          on ? ids.filter((id) => id !== c.id) : [...ids, c.id],
                        )
                      }
                      className={`rounded-lg border px-2 py-1 text-xs ${
                        on
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-fg-muted"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm((f) => ({ ...f, featured: e.target.checked }))
                }
              />
              Featured on hub
            </label>

            {selectedId ? (
              <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
                <Badge tone="neutral">{form.status}</Badge>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => runAction("publish")}
                  disabled={pending}
                >
                  Publish
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => runAction("draft")}
                  disabled={pending}
                >
                  Unpublish
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => runAction("archive")}
                  disabled={pending}
                >
                  Archive
                </Button>
                <label className="text-xs text-fg-subtle">
                  Schedule
                  <input
                    type="datetime-local"
                    className="ml-2 rounded-lg border border-border bg-bg px-2 py-1"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => runAction("schedule")}
                  disabled={pending}
                >
                  Schedule
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    if (!selectedId) return;
                    if (!confirm("Delete this article?")) return;
                    startTransition(() => {
                      void (async () => {
                        await fetch(`/api/growth-academy/articles/${selectedId}`, {
                          method: "DELETE",
                        });
                        resetNew();
                        loadList();
                      })();
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            ) : null}

            {versions.length > 0 ? (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  Version history
                </p>
                <ul className="mt-2 space-y-2">
                  {versions.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-2 text-xs text-fg-muted"
                    >
                      <span>
                        v{v.version} · {v.title}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          startTransition(() => {
                            void (async () => {
                              await fetch(
                                `/api/growth-academy/articles/${selectedId}`,
                                {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "restore",
                                    versionId: v.id,
                                  }),
                                },
                              );
                              if (selectedId) loadArticle(selectedId);
                            })();
                          });
                        }}
                      >
                        Restore to draft
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">AI Publishing</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-xs text-fg-muted">
                Generates a draft only — never auto-publishes. Review before going live.
              </p>
              <input
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
                placeholder="Topic (e.g. Thin buyer-intent coverage)"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
              <Button type="button" size="sm" onClick={generateAi} disabled={pending}>
                Generate draft
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Content gap ideas</h2>
            </CardHeader>
            <CardBody className="max-h-72 space-y-2 overflow-y-auto">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium text-fg">{idea.title}</p>
                  <p className="mt-1 text-xs text-fg-muted">{idea.summary}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={pending}
                    onClick={() => draftFromIdea(idea.id)}
                  >
                    Create draft
                  </Button>
                </div>
              ))}
              {ideas.length === 0 ? (
                <p className="text-sm text-fg-muted">No open ideas.</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Internal links</h2>
            </CardHeader>
            <CardBody className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {links.map((l) => (
                <div key={`${l.href}-${l.label}`}>
                  <Link href={l.href} className="font-medium text-accent hover:underline">
                    {l.label}
                  </Link>
                  <p className="text-xs text-fg-muted">{l.reason}</p>
                  <p className="font-mono text-[10px] text-fg-subtle">{l.href}</p>
                </div>
              ))}
              {links.length === 0 ? (
                <p className="text-xs text-fg-muted">
                  Save or open an article to load link suggestions.
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
