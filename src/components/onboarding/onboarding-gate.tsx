"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ALLOW = [
  "/dashboard/onboarding",
  "/dashboard/billing",
  "/dashboard/settings",
  "/dashboard/docs",
];

/**
 * Redirects incomplete onboarding to /dashboard/onboarding.
 * Skipped/completed users pass through.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (ALLOW.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
          if (!cancelled) setReady(true);
          return;
        }
        const res = await fetch("/api/onboarding", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setReady(true);
          return;
        }
        const data = (await res.json()) as {
          enabled?: boolean;
          onboarding?: { status?: string };
        };
        if (data.enabled === false) {
          if (!cancelled) setReady(true);
          return;
        }
        const status = data.onboarding?.status ?? "not_started";
        if (status === "not_started" || status === "in_progress") {
          router.replace("/dashboard/onboarding");
          return;
        }
      } catch {
        /* soft-fail open */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
