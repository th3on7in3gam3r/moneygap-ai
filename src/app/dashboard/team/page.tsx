"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Member = {
  id: string;
  role: string;
  user: { email: string; firstName: string | null; lastName: string | null } | null;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  clientName: string | null;
  invitePath: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
};

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
};

const STAFF_ROLES = [
  "admin",
  "executive",
  "marketing",
  "developer",
  "analyst",
  "client_manager",
  "viewer",
] as const;

export default function TeamWorkspacePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("analyst");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(() => {
      void (async () => {
        try {
          const [mRes, iRes, aRes] = await Promise.all([
            fetch("/api/agency/team"),
            fetch("/api/team/invites"),
            fetch("/api/agency/audit?limit=30"),
          ]);
          if (mRes.ok) {
            const data = (await mRes.json()) as { members: Member[] };
            setMembers(data.members ?? []);
          }
          if (iRes.ok) {
            const data = (await iRes.json()) as { invites: Invite[] };
            setInvites(data.invites ?? []);
          } else if (iRes.status === 503) {
            const data = (await iRes.json()) as { error?: string };
            setError(data.error ?? "Team Workspace disabled");
          }
          if (aRes.ok) {
            const data = (await aRes.json()) as { entries: AuditEntry[] };
            setAudit(data.entries ?? []);
          }
        } catch {
          setError("Could not load team workspace");
        }
      })();
    });
  }

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  function createInvite() {
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/team/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role }),
        });
        const data = (await res.json()) as {
          error?: string;
          invite?: { invitePath: string };
        };
        if (!res.ok) {
          setError(data.error ?? "Invite failed");
          return;
        }
        setEmail("");
        if (data.invite?.invitePath) {
          const full = `${window.location.origin}${data.invite.invitePath}`;
          await navigator.clipboard.writeText(full);
          setCopied(full);
        }
        load();
      })();
    });
  }

  function revoke(inviteId: string) {
    startTransition(() => {
      void (async () => {
        await fetch("/api/team/invites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId }),
        });
        load();
      })();
    });
  }

  return (
    <div className="w-full space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Team Workspace™
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Collaboration hub
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Invite staff, review activity, and open the executive briefing — one
          organization workspace.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button href="/dashboard/executive" size="sm" variant="secondary">
            Executive Dashboard
          </Button>
          <Button href="/dashboard/settings" size="sm" variant="secondary">
            Org settings
          </Button>
          <Button href="/dashboard/clients" size="sm" variant="secondary">
            Clients
          </Button>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm">
          {error}
        </p>
      )}
      {copied && (
        <p className="text-xs text-accent">Invite link copied: {copied}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Team members</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="truncate">
                  {m.user
                    ? [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
                      m.user.email
                    : "Member"}
                </span>
                <Badge tone="neutral">{m.role}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Invite staff</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <input
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              placeholder="email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={pending || !email}
              onClick={createInvite}
            >
              Create invite link
            </Button>
            <p className="text-xs text-fg-muted">
              Email delivery is not included — copy the link to share securely.
              Invite clients from a client detail page.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Pending invites</h2>
            <a
              href="/api/agency/audit?format=csv&limit=200"
              className="text-xs font-medium text-accent hover:underline"
            >
              Export audit CSV
            </a>
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {invites.filter((i) => !i.acceptedAt && !i.revokedAt).length === 0 && (
            <p className="text-sm text-fg-muted">No open invites.</p>
          )}
          {invites
            .filter((i) => !i.acceptedAt && !i.revokedAt)
            .map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{i.email}</p>
                  <p className="text-xs text-fg-muted">
                    {i.role}
                    {i.clientName ? ` · ${i.clientName}` : ""} · expires{" "}
                    {new Date(i.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {i.invitePath && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `${window.location.origin}${i.invitePath}`,
                        );
                        setCopied(`${window.location.origin}${i.invitePath}`);
                      }}
                    >
                      Copy link
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => revoke(i.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Activity timeline</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {audit.length === 0 && (
            <p className="text-sm text-fg-muted">No audit events yet.</p>
          )}
          {audit.map((e) => (
            <div
              key={e.id}
              className="flex justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{e.action}</span>
                <span className="text-fg-muted"> · {e.entityType}</span>
              </span>
              <span className="shrink-0 text-xs text-fg-subtle">
                {new Date(e.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </CardBody>
      </Card>

      <p className="text-xs text-fg-muted">
        <Link href="/dashboard/settings" className="text-accent hover:underline">
          Settings
        </Link>{" "}
        still manages brand and existing-user seat adds.
      </p>
    </div>
  );
}
