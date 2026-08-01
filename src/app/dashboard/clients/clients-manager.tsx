"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

type ClientRow = {
  id: string;
  name: string;
  websiteUrl: string | null;
  industry: string | null;
  status: string;
  assignedUserId: string | null;
  websites?: { id: string; domain: string }[];
};

export function ClientsManager({ initialClients }: { initialClients: ClientRow[] }) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          websiteUrl: websiteUrl || null,
          industry: industry || null,
        }),
      });
      const data = (await res.json()) as { client?: ClientRow; error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not create client");
        return;
      }
      if (data.client) {
        setClients((prev) => [data.client!, ...prev]);
        setName("");
        setWebsiteUrl("");
        setIndustry("");
        router.refresh();
      }
    });
  }

  function archive(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Business name"
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="Website URL"
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Industry"
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm sm:col-span-1"
          />
          <Button type="button" size="sm" disabled={pending || !name.trim()} onClick={create}>
            Add Client
          </Button>
          {msg && <p className="text-sm text-danger sm:col-span-4">{msg}</p>}
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {clients.length === 0 && (
          <p className="text-sm text-fg-muted">No clients yet. Add your first client above.</p>
        )}
        {clients.map((c) => (
          <Card key={c.id} interactive>
            <CardBody className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/dashboard/clients/${c.id}`}
                    className="font-display text-lg font-semibold text-fg hover:text-accent"
                  >
                    {c.name}
                  </Link>
                  {c.websiteUrl && (
                    <p className="text-sm text-fg-muted">{c.websiteUrl}</p>
                  )}
                </div>
                <Badge tone="accent">{c.status}</Badge>
              </div>
              {c.industry && (
                <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">
                  {c.industry}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button href={`/dashboard/clients/${c.id}`} size="sm" variant="secondary">
                  Open
                </Button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => archive(c.id)}
                  className="rounded-lg px-3 py-1.5 text-xs text-fg-muted hover:bg-bg-muted"
                >
                  Archive
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
