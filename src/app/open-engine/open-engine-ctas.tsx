"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function OpenEngineAuthCtas({
  analyzePath,
  canRunDeep = false,
}: {
  /** Path including query, e.g. /dashboard/analyze?url=…&profile=quick&auto=1 */
  analyzePath: string;
  /** When signed-in on a paid plan, show deeper scan option. */
  canRunDeep?: boolean;
}) {
  const primary =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[0.95rem] font-medium text-accent-fg transition hover:brightness-110";
  const secondary =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-bg-elevated px-6 text-[0.95rem] font-medium text-fg transition hover:border-border-strong hover:bg-bg-muted";

  const deepPath = analyzePath
    .replace("profile=quick", "profile=standard")
    .replace("auto=1", "auto=0");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Show when="signed-out">
        <SignUpButton
          mode="redirect"
          forceRedirectUrl={analyzePath}
          signInForceRedirectUrl={analyzePath}
        >
          <button type="button" className={cn(primary)}>
            Run Basics scan (free)
            <ArrowRight className="h-4 w-4" />
          </button>
        </SignUpButton>
        <SignInButton mode="redirect" forceRedirectUrl={analyzePath}>
          <button type="button" className={cn(secondary)}>
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <a href={analyzePath} className={cn(primary)}>
          Run Basics scan
          <ArrowRight className="h-4 w-4" />
        </a>
        {canRunDeep ? (
          <a href={deepPath} className={cn(secondary)}>
            Choose Standard / Deep
          </a>
        ) : (
          <a href="/pricing" className={cn(secondary)}>
            Unlock Standard / Deep
          </a>
        )}
      </Show>
    </div>
  );
}
