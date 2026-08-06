"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function AnalyzeCaptureForm({
  className,
}: {
  className?: string;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = normalizeWebsiteUrl(url);
    if (!normalized) {
      setError("Enter a valid website URL (e.g. https://your-site.com).");
      return;
    }
    setError(null);
    window.location.assign(
      `/dashboard/analyze?url=${encodeURIComponent(normalized)}`,
    );
  }

  return (
    <form onSubmit={onSubmit} className={className} noValidate>
      <label
        htmlFor="analyze-capture-url"
        className="mb-2 block text-sm font-medium text-fg"
      >
        Website URL
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="analyze-capture-url"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="url"
          required
          placeholder="https://your-site.com"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "analyze-capture-error" : undefined}
          className="h-12 w-full flex-1 rounded-xl border border-border bg-bg px-3.5 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <Button type="submit" size="lg" className="h-12 shrink-0 sm:w-auto">
          Analyze my website
        </Button>
      </div>
      {error ? (
        <p
          id="analyze-capture-error"
          role="alert"
          className="mt-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
