"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StartFreeButton({
  label = "Start free",
  size = "md",
  className,
}: {
  label?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const classNames =
    size === "lg"
      ? "inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-[0.95rem] font-medium text-accent-fg transition hover:brightness-110"
      : "inline-flex h-9 items-center rounded-xl bg-accent px-3.5 text-sm font-medium text-accent-fg transition hover:brightness-110";

  return (
    <SignUpButton mode="modal">
      <button type="button" className={cn(classNames, className)}>
        {label}
        {size === "lg" && <ArrowRight className="h-4 w-4" />}
      </button>
    </SignUpButton>
  );
}

export function SignInLink({ className }: { className?: string }) {
  return (
    <SignInButton mode="modal">
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
