import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/db";
import { extensionReports } from "@/db/schema";
import {
  allowedScanProfiles,
  getWorkspacePlanId,
} from "@/lib/billing";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import type {
  ExtensionFixPathItem,
  ExtensionMoneyGapReport,
} from "@/lib/extension-reports/types";
import { buildPageMetadata } from "@/lib/seo";
import { OpenEngineAuthCtas } from "./open-engine-ctas";

export const runtime = "nodejs";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ shareId?: string; url?: string }>;
}) {
  const params = await searchParams;
  const hostHint = (() => {
    if (!params.url) return null;
    try {
      return new URL(params.url).hostname;
    } catch {
      return null;
    }
  })();

  return buildPageMetadata({
    title: hostHint
      ? `Open Engine — ${hostHint}`
      : "Open MoneyGap Engine™ Basics",
    description:
      "Continue from the MoneyGap browser extension into MoneyGap Engine™. Run a free Basics scan, or upgrade for Standard and Deep crawls with Fix Paths™.",
    path: "/open-engine",
  });
}

function teaserFixes(report: ExtensionMoneyGapReport): ExtensionFixPathItem[] {
  if (report.fixPath && report.fixPath.length > 0) {
    return report.fixPath.slice(0, 3);
  }
  return (report.recommendations ?? []).slice(0, 3).map((rec) => ({
    id: rec.id,
    title: rec.title,
    whyItMatters: rec.whyItMatters ?? rec.reason,
    recommendation: rec.recommendation,
  }));
}

/** Extension handoff always launches a Basics (quick) Engine scan after auth. */
function safeAnalyzePath(url?: string): string {
  if (!url) return "/dashboard/analyze?profile=quick&auto=1";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "/dashboard/analyze?profile=quick&auto=1";
    }
    return `/dashboard/analyze?url=${encodeURIComponent(parsed.toString())}&profile=quick&auto=1`;
  } catch {
    return "/dashboard/analyze?profile=quick&auto=1";
  }
}

export default async function OpenEnginePage({
  searchParams,
}: {
  searchParams: Promise<{ shareId?: string; url?: string }>;
}) {
  const params = await searchParams;
  const shareId = params.shareId?.trim().slice(0, 120);
  const urlParam = params.url?.trim().slice(0, 2000);

  let row: typeof extensionReports.$inferSelect | undefined;
  if (shareId && process.env.DATABASE_URL) {
    try {
      const rows = await db
        .select()
        .from(extensionReports)
        .where(eq(extensionReports.shareId, shareId))
        .limit(1);
      row = rows[0];
    } catch {
      row = undefined;
    }
  }

  const report = row?.payload as ExtensionMoneyGapReport | undefined;
  const siteUrl = row?.url || urlParam || "";
  const hostname =
    row?.hostname ||
    (() => {
      try {
        return siteUrl ? new URL(siteUrl).hostname : "";
      } catch {
        return "";
      }
    })();
  const score = row?.overallScore;
  const fixes = report ? teaserFixes(report) : [];
  const analyzePath = safeAnalyzePath(siteUrl || undefined);

  let canRunDeep = false;
  const { isAuthenticated } = await auth();
  if (isAuthenticated) {
    try {
      const { workspace } = await ensureUserAndWorkspace();
      const planId = await getWorkspacePlanId(workspace.id);
      canRunDeep = allowedScanProfiles(planId).includes("standard");
    } catch {
      canRunDeep = false;
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border/70 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-8">
          <Logo href="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button href="/pricing" size="sm" variant="secondary">
              Pricing
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-hero">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
          <div className="relative mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Browser extension → MoneyGap Engine™ Basics
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
              Run a Basics Engine scan
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fg-muted">
              Your extension scan is a local preview. Sign in to run a free
              Basics (Quick) crawl of homepage and key pages. Upgrade for
              Standard or Deep crawls with fuller Fix Paths™ and workspace
              backlog.
            </p>

            {hostname ? (
              <p className="mt-6 text-sm text-fg">
                Target site:{" "}
                <span className="font-semibold tabular-nums">{hostname}</span>
                {typeof score === "number" ? (
                  <>
                    <span className="text-fg-subtle"> · </span>
                    Extension MoneyGap Score™{" "}
                    <span className="font-semibold tabular-nums">{score}</span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="mt-6 text-sm text-fg-muted">
                No site URL was attached. After you sign in, paste a URL on the
                analyze screen.
              </p>
            )}

            <div className="mt-8">
              <OpenEngineAuthCtas
                analyzePath={analyzePath}
                canRunDeep={canRunDeep}
              />
            </div>
            <p className="mt-3 text-xs text-fg-subtle">
              Free includes Basics scans (monthly quota). Standard and Deep
              require Starter or higher.
            </p>
          </div>
        </section>

        {fixes.length > 0 ? (
          <section className="mx-auto max-w-3xl space-y-4 px-5 py-12 sm:px-8">
            <h2 className="font-display text-lg font-semibold text-fg">
              Preview from your extension scan
            </h2>
            <p className="text-sm text-fg-muted">
              Top Money Gaps™ captured locally — Basics adds a real Engine
              crawl; Standard / Deep add more pages, Opportunity Index™, and
              execution tools.
            </p>
            <ol className="space-y-3">
              {fixes.map((item, i) => (
                <li
                  key={item.id || String(i)}
                  className="rounded-xl border border-border/80 bg-bg-elevated/40 p-4"
                >
                  <p className="text-sm font-semibold text-fg">
                    {i + 1}. {item.title}
                  </p>
                  {item.whyItMatters ? (
                    <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                      {item.whyItMatters}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
            {shareId ? (
              <p className="pt-2 text-xs text-fg-subtle">
                Prefer the full shared report page?{" "}
                <Link
                  href={`/report/ext/${encodeURIComponent(shareId)}`}
                  className="text-accent underline-offset-2 hover:underline"
                >
                  View shared report
                </Link>
              </p>
            ) : null}
          </section>
        ) : (
          <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
            <div className="rounded-xl border border-border/80 bg-bg-elevated/40 p-5">
              <h2 className="font-display text-base font-semibold text-fg">
                What you unlock
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-fg-muted">
                <li>
                  <span className="font-medium text-fg">Basics (Free):</span>{" "}
                  Quick crawl of homepage and key marketing pages
                </li>
                <li>
                  <span className="font-medium text-fg">Standard / Deep:</span>{" "}
                  Deeper crawlability, schema, and conversion scoring
                </li>
                <li>
                  Ranked Money Gaps™ with Fix Paths™, workspace history, and
                  re-scans
                </li>
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
