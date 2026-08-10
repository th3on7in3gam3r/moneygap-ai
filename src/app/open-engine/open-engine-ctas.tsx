"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function OpenEngineAuthCtas({
  analyzePath,
}: {
  /** Path including query, e.g. /dashboard/analyze?url=https%3A%2F%2Fexample.com */
  analyzePath: string;
}) {
  const primary =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[0.95rem] font-medium text-accent-fg transition hover:brightness-110";
  const secondary =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-bg-elevated px-6 text-[0.95rem] font-medium text-fg transition hover:border-border-strong hover:bg-bg-muted";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Show when="signed-out">
        <SignUpButton
          mode="redirect"
          forceRedirectUrl={analyzePath}
          signInForceRedirectUrl={analyzePath}
        >
          <button type="button" className={cn(primary)}>
            Start free
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
          Open in MoneyGap Engine™
          <ArrowRight className="h-4 w-4" />
        </a>
      </Show>
    </div>
  );
}
