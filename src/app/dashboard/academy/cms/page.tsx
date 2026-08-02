import Link from "next/link";
import { AcademyCms } from "../academy-cms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isGrowthAcademyEnabled } from "@/lib/growth-academy";

export default function DashboardAcademyCmsPage() {
  const enabled = isGrowthAcademyEnabled();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            Growth Academy™ CMS
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            AI Publishing Engine
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            Create, preview, and publish educational content. AI drafts always require human
            review before going live.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={enabled ? "accent" : "gap"}>
            {enabled ? "Enabled" : "Disabled"}
          </Badge>
          <Button href="/dashboard/academy" size="sm" variant="secondary">
            Learner home
          </Button>
          <Button href="/academy" size="sm" variant="secondary">
            View public hub
          </Button>
          <Button href="/dashboard" size="sm" variant="ghost">
            Overview
          </Button>
        </div>
      </header>

      {!enabled ? (
        <p className="rounded-xl border border-border bg-bg-muted px-4 py-3 text-sm">
          Set <code className="text-xs">FEATURE_GROWTH_ACADEMY</code> to enable (omit or
          unset = on; use 0/false/off to disable).
        </p>
      ) : (
        <AcademyCms />
      )}

      <p className="text-xs text-fg-subtle">
        Public RSS:{" "}
        <Link href="/academy/rss.xml" className="text-accent hover:underline">
          /academy/rss.xml
        </Link>
      </p>
    </div>
  );
}
