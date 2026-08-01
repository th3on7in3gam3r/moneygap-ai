"use client";

import { useState, useTransition } from "react";

export function ClientShareControls({
  clientId,
  reportId,
}: {
  clientId: string;
  reportId: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const res = await fetch(`/api/clients/${clientId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          permissions: { download: true, comment: true, approve: true },
        }),
      });
      const data = (await res.json()) as { url?: string };
      if (res.ok && data.url) {
        const full = `${window.location.origin}${data.url}`;
        setUrl(full);
        await navigator.clipboard?.writeText(full);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={create}
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-bg-muted"
      >
        {pending ? "Creating…" : "Share link"}
      </button>
      {url && <p className="max-w-[200px] truncate text-[10px] text-accent">{url}</p>}
    </div>
  );
}
