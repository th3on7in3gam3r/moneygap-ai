"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { hasConsent } from "@/lib/privacy/client-gate";
import { cn } from "@/lib/utils";

function subscribe() {
  return () => {};
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-elevated text-fg-muted",
          className,
        )}
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  const personalizationOk = hasConsent("personalization");

  return (
    <button
      type="button"
      aria-label={
        personalizationOk
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Enable Personalization to change theme"
      }
      title={
        personalizationOk
          ? undefined
          : "Enable Personalization in Smart Consent™ to change theme"
      }
      onClick={() => {
        if (!personalizationOk) {
          window.dispatchEvent(new CustomEvent("mg:open-smart-consent"));
          return;
        }
        setTheme(isDark ? "light" : "dark");
      }}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-elevated text-fg-muted transition hover:border-border-strong hover:text-fg",
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
