"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StartFreeButton({
  label = "Start free",
  size = "md",
  className,
  forceRedirectUrl = "/dashboard",
}: {
  label?: string;
  size?: "md" | "lg";
  className?: string;
  /** Where to land after sign-up / when already signed in */
  forceRedirectUrl?: string;
}) {
  const classNames =
    size === "lg"
      ? "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[0.95rem] font-medium text-accent-fg transition hover:brightness-110"
      : "inline-flex h-9 items-center justify-center rounded-xl bg-accent px-3.5 text-sm font-medium text-accent-fg transition hover:brightness-110";

  return (
    <>
      <Show when="signed-out">
        {/* redirect is more reliable than modal inside overflow panels / on mobile */}
        <SignUpButton
          mode="redirect"
          forceRedirectUrl={forceRedirectUrl}
          signInForceRedirectUrl={forceRedirectUrl}
        >
          <button type="button" className={cn(classNames, className)}>
            {label}
            {size === "lg" && <ArrowRight className="h-4 w-4" />}
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <a href={forceRedirectUrl} className={cn(classNames, className)}>
          {label}
          {size === "lg" && <ArrowRight className="h-4 w-4" />}
        </a>
      </Show>
    </>
  );
}

export function SignInLink({ className }: { className?: string }) {
  return (
    <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
      <button
        type="button"
        className={cn(
          "inline-flex h-9 items-center rounded-xl px-3 text-sm text-fg-muted transition hover:text-fg",
          className,
        )}
      >
        Sign in
      </button>
    </SignInButton>
  );
}
