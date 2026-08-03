import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { verifyBadge } from "@/lib/growth-badge";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ badgeId: string }>;
}) {
  const { badgeId } = await params;
  const data = await verifyBadge(badgeId, { recordView: false });
  if (!data) {
    return buildPageMetadata({
      title: "Badge verification",
      description: "Verify a MoneyGap AI Growth Badge™.",
      path: `/verify/${badgeId}`,
    });
  }
  return buildPageMetadata({
    title: `${data.publicId} — Growth Badge™`,
    description: `${data.styleLabel} for ${data.websiteName} (${data.domain}).`,
    path: `/verify/${data.publicId}`,
  });
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default async function VerifyBadgePage({
  params,
}: {
  params: Promise<{ badgeId: string }>;
}) {
  const { badgeId } = await params;
  const data = await verifyBadge(badgeId);
  if (!data) notFound();

  const growth =
    data.journey.improvementPoints == null
      ? null
      : data.journey.improvementPoints >= 0
        ? `+${data.journey.improvementPoints} points`
        : `${data.journey.improvementPoints} points`;

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border/70 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-8">
          <Logo href="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button href="/dashboard/badge" size="sm" variant="secondary">
              Create badge
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-hero">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
          <div className="relative mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Growth Badge™ verification
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
              {data.publicId}
            </h1>
            <p className="mt-3 text-lg text-fg-muted">{data.styleLabel}</p>
            <p
              className={`mt-4 inline-flex rounded-lg px-3 py-1.5 text-sm font-semibold ${
                data.verified
                  ? "bg-accent-soft text-accent"
                  : "bg-bg-muted text-fg-muted"
              }`}
            >
              {data.verified ? "Verified" : "Revoked / unavailable"}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl space-y-8 px-5 py-12 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Website analyzed
              </p>
              <p className="mt-2 font-display text-xl font-semibold text-fg">
                {data.websiteName}
              </p>
              <a
                href={data.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-sm text-accent hover:underline"
              >
                {data.domain}
              </a>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Analysis date
              </p>
              <p className="mt-2 font-display text-xl font-semibold text-fg">
                {formatDate(data.analyzedAt)}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                Issued {formatDate(data.issuedAt)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-bg-elevated px-5 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
              MoneyGap Score™
            </p>
            <p className="mt-2 font-display text-4xl font-semibold tabular-nums text-fg">
              {data.moneyGapScore ?? "—"}
            </p>
            <p className="mt-2 text-sm text-fg-muted">Observed score · AI Estimate</p>
          </div>

          {(data.journey.beforeScore != null ||
            data.journey.afterScore != null) && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Improvement history
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border px-3 py-4">
                  <p className="text-xs text-fg-subtle">Before</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                    {data.journey.beforeScore ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-border px-3 py-4">
                  <p className="text-xs text-fg-subtle">After</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                    {data.journey.afterScore ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-border px-3 py-4">
                  <p className="text-xs text-fg-subtle">Growth</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-accent">
                    {growth ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm leading-relaxed text-fg-muted">{data.disclaimer}</p>

          <div className="flex flex-wrap gap-3">
            <Button href="/" size="lg">
              Learn about MoneyGap AI
            </Button>
            <Button href="/dashboard/badge" size="lg" variant="secondary">
              Create Growth Badge
            </Button>
          </div>

          <p className="text-sm text-fg-subtle">
            <Link href="/" className="hover:text-fg">
              ← Home
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
