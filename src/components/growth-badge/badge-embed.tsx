"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EmbedCode({ html }: { html: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
        Embed code
      </p>
      <p className="text-sm text-fg-muted">
        Paste into WordPress, Shopify, Webflow, or any custom site footer/theme.
      </p>
      <pre className="overflow-x-auto rounded-xl border border-border bg-bg-muted p-3 text-xs text-fg">
        {html}
      </pre>
      <Button type="button" size="sm" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy Embed Code"}
      </Button>
    </div>
  );
}
