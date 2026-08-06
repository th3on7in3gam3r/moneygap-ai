"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { EmbedCode } from "@/components/growth-badge/badge-embed";
import { BadgeGenerator } from "@/components/growth-badge/badge-generator";
import { BadgePreview } from "@/components/growth-badge/badge-preview";
import { JourneyCard } from "@/components/growth-badge/journey-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { GrowthBadgeDto } from "@/lib/growth-badge";

type StyleOption = {
  id: string;
  label: string;
  shortLabel: string;
  hint?: string;
};

type WebsiteOption = {
  id: string;
  name: string;
  domain: string;
  url: string;
};

export default function GrowthBadgeDashboardPage() {
  const [badges, setBadges] = useState<GrowthBadgeDto[]>([]);
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [websiteId, setWebsiteId] = useState("");
  const [style, setStyle] = useState("growth_optimized");
  const [selected, setSelected] = useState<GrowthBadgeDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/growth-badge");
        if (!res.ok) {
          setError("Could not load Growth Badges™");
          return;
        }
        const data = (await res.json()) as {
          badges: GrowthBadgeDto[];
          websites: WebsiteOption[];
          styles: StyleOption[];
        };
        setBadges(data.badges ?? []);
        setWebsites(data.websites ?? []);
        setStyles(data.styles ?? []);
        if (!websiteId && data.websites?.[0]) {
          setWebsiteId(data.websites[0].id);
        }
        if (data.styles?.[0] && !style) {
          setStyle(data.styles[0].id);
        }
        setError(null);
        if (selected) {
          const refreshed = data.badges?.find((b) => b.id === selected.id);
          if (refreshed) setSelected(refreshed);
        }
      })();
    });
  }

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createBadge() {
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/growth-badge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteId, style }),
        });
        const data = (await res.json()) as {
          badge?: GrowthBadgeDto;
          error?: string;
        };
        if (!res.ok || !data.badge) {
          setError(data.error ?? "Could not create badge");
          return;
        }
        setSelected(data.badge);
        setError(null);
        load();
      })();
    });
  }

  function refreshJourney(publicId: string) {
    startTransition(() => {
      void (async () => {
        const res = await fetch(
          `/api/growth-badge/${encodeURIComponent(publicId)}/journey`,
          { method: "POST" },
        );
        const data = (await res.json()) as {
          badge?: GrowthBadgeDto;
          error?: string;
        };
        if (!res.ok || !data.badge) {
          setError(data.error ?? "Could not refresh journey");
          return;
        }
        setSelected(data.badge);
        setError(null);
        load();
      })();
    });
  }

  function revoke(publicId: string) {
    startTransition(() => {
      void (async () => {
        const res = await fetch(
          `/api/growth-badge/${encodeURIComponent(publicId)}/revoke`,
          { method: "POST" },
        );
        if (!res.ok) {
          setError("Could not revoke badge");
          return;
        }
        setSelected(null);
        load();
      })();
    });
  }

  return (
    <div className="w-full space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Attribution
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Growth Badge™
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Create a verified badge for sites you analyze with MoneyGap AI. Embed it
          on WordPress, Shopify, Webflow, or custom sites — visitors can verify
          the badge and see observed score journey.
        </p>
      </header>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">
              Create Growth Badge
            </h2>
          </CardHeader>
          <CardBody>
            <BadgeGenerator
              websites={websites}
              styles={styles}
              websiteId={websiteId}
              style={style}
              pending={pending}
              onWebsiteChange={setWebsiteId}
              onStyleChange={setStyle}
              onCreate={createBadge}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">
              {selected ? selected.publicId : "Selected badge"}
            </h2>
            {selected ? (
              <Badge tone={selected.status === "active" ? "accent" : "neutral"}>
                {selected.status}
              </Badge>
            ) : null}
          </CardHeader>
          <CardBody className="space-y-6">
            {!selected ? (
              <p className="text-sm text-fg-muted">
                Create a badge or select one from the list to preview, copy embed
                code, and verify.
              </p>
            ) : (
              <>
                <BadgePreview
                  svgUrl={selected.svgUrl}
                  styleLabel={selected.styleLabel}
                />
                <EmbedCode html={selected.embedHtml} />
                <div className="flex flex-wrap gap-2">
                  <Button href={selected.verifyUrl} size="sm" variant="secondary">
                    Verify Badge
                  </Button>
                  {selected.status === "active" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => revoke(selected.publicId)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
                <JourneyCard
                  beforeScore={selected.beforeScore}
                  afterScore={selected.afterScore}
                  improvementPoints={selected.improvementPoints}
                  pending={pending}
                  onRefresh={() => refreshJourney(selected.publicId)}
                />
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Your badges</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {badges.length === 0 ? (
            <p className="text-sm text-fg-muted">No badges yet.</p>
          ) : (
            badges.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-left transition hover:border-border-strong"
              >
                <div>
                  <p className="font-medium text-fg">
                    {b.publicId} · {b.websiteName}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {b.styleLabel} · {b.domain}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={b.status === "active" ? "accent" : "neutral"}>
                    {b.status}
                  </Badge>
                  <Link
                    href={b.verifyUrl}
                    className="text-xs text-accent hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Verify
                  </Link>
                </div>
              </button>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
