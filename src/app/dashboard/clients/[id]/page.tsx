import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getClientHistory } from "@/lib/agency/clients";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { formatCurrency } from "@/lib/utils";
import { ClientShareControls } from "@/app/dashboard/clients/[id]/share-controls";
import { ClientScheduleControls } from "@/app/dashboard/clients/[id]/schedule-controls";
import { ClientInviteButton } from "@/components/team/client-invite-button";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let ctx;
  try {
    ctx = await loadAgencyContext();
  } catch {
    redirect("/sign-in");
  }
  if (!ctx.isAgency) redirect("/dashboard");

  const history = await getClientHistory(ctx.workspace.id, id);
  if (!history) notFound();
  const { client, reports, scoreHistory, projects, completedProjects } = history;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/clients" className="text-sm text-accent hover:underline">
            ← Clients
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {client.name}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {[client.industry, client.audience].filter(Boolean).join(" · ") ||
              "Client growth profile"}
          </p>
        </div>
        <Badge tone={client.status === "active" ? "accent" : "neutral"}>
          {client.status}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Profile</h2>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Website</p>
              <p className="mt-1">{client.websiteUrl || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Sites linked</p>
              <ul className="mt-1 space-y-1">
                {(client.websites?.length ?? 0) === 0 && (
                  <li className="text-fg-muted">None yet — analyze and link from Websites.</li>
                )}
                {client.websites?.map((w) => (
                  <li key={w.id}>{w.domain}</li>
                ))}
              </ul>
            </div>
            {client.notes && <p className="text-fg-muted">{client.notes}</p>}
            <ClientInviteButton clientId={client.id} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Score history</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {scoreHistory.length === 0 && (
              <p className="text-sm text-fg-muted">No snapshots yet.</p>
            )}
            {scoreHistory.slice(-8).map((s) => (
              <div
                key={`${s.date}-${s.score}`}
                className="flex justify-between rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="text-fg-muted">{s.date}</span>
                <span className="tabular-nums text-fg">Score {s.score}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Reports</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {reports.length === 0 && (
            <p className="text-sm text-fg-muted">No intelligence reports for this client yet.</p>
          )}
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium text-fg">{r.title}</p>
                <p className="text-xs text-fg-muted">
                  Score {r.moneyGapScore} · {formatCurrency(r.revenueAtRisk)} at risk
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button href={`/reports/${r.id}`} size="sm" variant="secondary">
                  Open
                </Button>
                <ClientShareControls clientId={client.id} reportId={r.id} />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Completed projects</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {completedProjects.length === 0 && (
              <p className="text-sm text-fg-muted">No completed projects yet.</p>
            )}
            {completedProjects.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border px-3 py-2 text-sm text-fg"
              >
                {p.title}
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Growth timeline</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {projects.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="flex justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="truncate">{p.title}</span>
                <Badge tone="neutral">{p.status}</Badge>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-sm text-fg-muted">Project activity will appear here.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <ClientScheduleControls clientId={client.id} />
    </div>
  );
}
