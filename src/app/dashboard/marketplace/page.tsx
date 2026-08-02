"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Listing = {
  id: string;
  slug: string;
  title: string;
  category: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
  priceCents: number;
  installCount: number;
  ratingAvg: number;
  ratingCount: number;
  creator: { displayName: string; verified: boolean } | null;
};

type Partner = {
  id: string;
  name: string;
  type: string;
  website: string | null;
  blurb: string | null;
  verified: boolean;
};

type Course = {
  id: string;
  title: string;
  summary: string;
  level: string;
  lessons: {
    id: string;
    title: string;
    body: string;
    completed: boolean;
  }[];
};

type Insight = {
  id: string;
  title: string;
  insight: string;
  sampleSizeBand: string;
  confidence: number;
  labeled: string;
};

type Analytics = {
  workspaceInstalls: number;
  catalogStats: {
    listings: number;
    totalInstalls: number;
    avgRatingTenths: number;
  };
  recentInstalls: {
    id: string;
    createdAt: string;
    listing: { title: string; slug: string } | null;
    resultRef: Record<string, unknown> | null;
  }[];
  labeled: string;
};

const TABS = [
  "browse",
  "agents",
  "packs",
  "fix_paths",
  "partners",
  "academy",
  "insights",
  "creator",
] as const;

type Tab = (typeof TABS)[number];

const CATEGORY_FOR_TAB: Partial<Record<Tab, string>> = {
  agents: "ai_agents",
  packs: "industry_packs",
  fix_paths: "fix_path_templates",
};

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>("browse");
  const [listings, setListings] = useState<Listing[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reviewListingId, setReviewListingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");

  function loadListings(category?: string) {
    startTransition(() => {
      void (async () => {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/marketplace?${params}`);
        const data = (await res.json()) as {
          enabled?: boolean;
          message?: string;
          listings?: Listing[];
        };
        setEnabled(data.enabled !== false);
        setMessage(data.message ?? null);
        setListings(data.listings ?? []);
      })();
    });
  }

  function loadTab(next: Tab) {
    setTab(next);
    if (next === "partners") {
      startTransition(() => {
        void (async () => {
          const res = await fetch("/api/marketplace/partners");
          const data = (await res.json()) as { partners?: Partner[] };
          setPartners(data.partners ?? []);
        })();
      });
      return;
    }
    if (next === "academy") {
      startTransition(() => {
        void (async () => {
          const res = await fetch("/api/marketplace/academy");
          const data = (await res.json()) as { courses?: Course[] };
          setCourses(data.courses ?? []);
        })();
      });
      return;
    }
    if (next === "insights") {
      startTransition(() => {
        void (async () => {
          const res = await fetch("/api/marketplace/insights");
          const data = (await res.json()) as { insights?: Insight[] };
          setInsights(data.insights ?? []);
        })();
      });
      return;
    }
    if (next === "creator") {
      startTransition(() => {
        void (async () => {
          const res = await fetch("/api/marketplace/analytics");
          const data = (await res.json()) as Analytics & { enabled?: boolean };
          setAnalytics(data);
        })();
      });
      return;
    }
    loadListings(CATEGORY_FOR_TAB[next]);
  }

  useEffect(() => {
    const t = setTimeout(() => loadTab("browse"), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleListings = useMemo(() => {
    if (tab === "browse") return listings;
    const cat = CATEGORY_FOR_TAB[tab];
    if (!cat) return listings;
    return listings.filter((l) => l.category === cat);
  }, [listings, tab]);

  function install(listing: Listing) {
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/marketplace/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: listing.id }),
        });
        const data = (await res.json()) as {
          error?: string;
          resultRef?: { href?: string };
        };
        if (!res.ok) {
          setToast(data.error ?? "Install failed");
          return;
        }
        setToast(`Installed ${listing.title}`);
        if (data.resultRef?.href) {
          // soft navigate hint
          setToast(`Installed — open ${data.resultRef.href}`);
        }
        loadListings(CATEGORY_FOR_TAB[tab]);
      })();
    });
  }

  function submitReview() {
    if (!reviewListingId) return;
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/marketplace/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId: reviewListingId,
            rating,
            body: reviewBody,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setToast(data.error ?? "Review failed");
          return;
        }
        setToast("Review saved");
        setReviewListingId(null);
        setReviewBody("");
        loadListings(CATEGORY_FOR_TAB[tab]);
      })();
    });
  }

  function completeLesson(lessonId: string) {
    startTransition(() => {
      void (async () => {
        await fetch("/api/marketplace/academy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId }),
        });
        loadTab("academy");
      })();
    });
  }

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Growth Marketplace™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Discover growth solutions
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Install agents, industry packs, Fix Path templates, and automation
          recipes. Verified patterns are observed insights—not guarantees.
        </p>
      </header>

      {!enabled && (
        <p className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm">
          {message ?? "Marketplace disabled"}
        </p>
      )}
      {toast && (
        <p className="text-sm text-accent">{toast}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={tab === t ? "primary" : "secondary"}
            onClick={() => loadTab(t)}
          >
            {t.replace("_", " ")}
          </Button>
        ))}
      </div>

      {(tab === "browse" ||
        tab === "agents" ||
        tab === "packs" ||
        tab === "fix_paths") && (
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[12rem] flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            placeholder="Search listings…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => loadListings(CATEGORY_FOR_TAB[tab])}
          >
            Search
          </Button>
        </div>
      )}

      {(tab === "browse" ||
        tab === "agents" ||
        tab === "packs" ||
        tab === "fix_paths") && (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleListings.map((l) => (
            <Card key={l.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{l.title}</h2>
                    <p className="mt-1 text-xs text-fg-muted">
                      {l.creator?.displayName ?? "Creator"}
                      {l.creator?.verified ? " · verified" : ""}
                    </p>
                  </div>
                  <Badge tone="neutral">{l.category.replace(/_/g, " ")}</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-fg-muted">{l.summary}</p>
                <p className="text-xs text-fg-subtle">
                  {l.installCount} installs ·{" "}
                  {l.ratingCount
                    ? `${(l.ratingAvg / 10).toFixed(1)}★ (${l.ratingCount})`
                    : "No ratings"}{" "}
                  · {l.priceCents === 0 ? "Free" : `$${(l.priceCents / 100).toFixed(2)}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => install(l)}
                  >
                    Install
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setReviewListingId(l.id)}
                  >
                    Rate
                  </Button>
                  {typeof l.payload.href === "string" && (
                    <Link
                      href={l.payload.href}
                      className="self-center text-xs font-medium text-accent hover:underline"
                    >
                      Open →
                    </Link>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
          {visibleListings.length === 0 && (
            <p className="text-sm text-fg-muted">No listings in this view.</p>
          )}
        </div>
      )}

      {reviewListingId && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Leave a rating</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <select
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} stars
                </option>
              ))}
            </select>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              placeholder="Optional review"
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={pending} onClick={submitReview}>
                Submit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setReviewListingId(null)}
              >
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === "partners" && (
        <div className="grid gap-4 md:grid-cols-2">
          {partners.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                  <Badge tone={p.verified ? "accent" : "neutral"}>
                    {p.verified ? "Verified" : p.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                <p className="text-fg-muted">{p.blurb}</p>
                <p className="text-xs capitalize text-fg-subtle">{p.type}</p>
                {p.website && (
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Website
                  </a>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === "academy" && (
        <div className="space-y-4">
          {courses.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">{c.title}</h2>
                <p className="text-sm text-fg-muted">{c.summary}</p>
                <Badge tone="neutral">{c.level}</Badge>
              </CardHeader>
              <CardBody className="space-y-3">
                {c.lessons.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-border px-3 py-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{l.title}</p>
                        <p className="mt-1 text-fg-muted">{l.body}</p>
                      </div>
                      {l.completed ? (
                        <Badge tone="accent">Done</Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => completeLesson(l.id)}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === "insights" && (
        <div className="space-y-4">
          <p className="text-xs text-fg-muted">
            Verified Growth Patterns™ — always presented as observed trends, not
            promises.
          </p>
          {insights.map((i) => (
            <Card key={i.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">{i.title}</h2>
                  <Badge tone="accent">{i.labeled.replace(/_/g, " ")}</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                <p className="text-fg-muted">{i.insight}</p>
                <p className="text-xs text-fg-subtle">
                  Sample {i.sampleSizeBand} · confidence {i.confidence}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === "creator" && analytics && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">
                Marketplace Analytics™
              </h2>
              <p className="text-xs text-fg-muted">
                Revenue figures are {analytics.labeled} stubs — no live payouts.
              </p>
            </CardHeader>
            <CardBody className="grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-xl border border-border px-3 py-3">
                <p className="text-xs text-fg-subtle">Your installs</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {analytics.workspaceInstalls}
                </p>
              </div>
              <div className="rounded-xl border border-border px-3 py-3">
                <p className="text-xs text-fg-subtle">Catalog listings</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {analytics.catalogStats.listings}
                </p>
              </div>
              <div className="rounded-xl border border-border px-3 py-3">
                <p className="text-xs text-fg-subtle">Catalog installs</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {analytics.catalogStats.totalInstalls}
                </p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Recent installs</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {analytics.recentInstalls.length === 0 && (
                <p className="text-sm text-fg-muted">No installs yet.</p>
              )}
              {analytics.recentInstalls.map((i) => (
                <div
                  key={i.id}
                  className="flex justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>{i.listing?.title ?? "Listing"}</span>
                  <span className="text-xs text-fg-subtle">
                    {new Date(i.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Developer Hub™</h2>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-fg-muted">
              <p>
                Publish via Plugin SDK contracts and the MoneyGap API™. No plugin
                runtime in this phase.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/developers" className="text-accent hover:underline">
                  Developer Hub →
                </Link>
                <span className="text-xs text-fg-subtle self-center">
                  See docs/plugin-sdk.md & packages/moneygap-js
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
