"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type SharePayload = {
  permissions: {
    view: boolean;
    download: boolean;
    comment: boolean;
    approve: boolean;
  };
  client: { name: string; industry: string | null };
  brand: {
    logoUrl: string | null;
    companyName: string | null;
    contactInfo: string | null;
    reportFooter: string | null;
    showPoweredBy: boolean;
  } | null;
  report: {
    id: string;
    title: string;
    moneyGapScore: number;
    revenueAtRisk: number;
    capturePotential: number;
    executiveBrief: string | null;
    website: { name: string; domain: string; url: string } | null;
  };
  opportunities: {
    id: string;
    title: string;
    summary: string;
    severity: string;
    opportunityIndex: number;
    estimatedAnnualRevenue: number | null;
  }[];
  comments: { id: string; authorName: string; body: string; createdAt: string }[];
};

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      void fetch(`/api/share/${token}`)
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Not found");
          setData(json as SharePayload);
        })
        .catch((e: Error) => setError(e.message));
    }, 0);
    return () => clearTimeout(t);
  }, [token]);

  function submitComment() {
    startTransition(async () => {
      const res = await fetch(`/api/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, body: comment }),
      });
      if (res.ok) {
        setComment("");
        const refreshed = await fetch(`/api/share/${token}`);
        if (refreshed.ok) setData((await refreshed.json()) as SharePayload);
      }
    });
  }

  function approve(opportunityId: string, decision: "approved" | "rejected") {
    startTransition(async () => {
      await fetch(`/api/share/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, decision, authorName: authorName || "Client" }),
      });
      const refreshed = await fetch(`/api/share/${token}`);
      if (refreshed.ok) setData((await refreshed.json()) as SharePayload);
    });
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Link unavailable</h1>
        <p className="mt-2 text-sm text-fg-muted">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-fg-muted">
        Loading report…
      </div>
    );
  }

  const preparedBy =
    data.brand?.companyName || "Growth partner";

  return (
    <div className="min-h-screen bg-bg print:bg-white">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 print:py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {data.brand?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.brand.logoUrl}
                alt=""
                className="mb-3 h-10 w-auto object-contain"
              />
            )}
            <p className="text-xs uppercase tracking-[0.12em] text-fg-subtle">
              Client growth report
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {data.report.title}
            </h1>
            <p className="mt-2 text-sm text-fg-muted">{data.client.name}</p>
          </div>
          {data.permissions.download && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="print:hidden"
              onClick={() => window.print()}
            >
              Download PDF
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardBody>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                MoneyGap Score™
              </p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-gap">
                {data.report.moneyGapScore}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                Est. annual opportunity
              </p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-gap">
                {formatCurrency(data.report.revenueAtRisk)}
              </p>
            </CardBody>
          </Card>
        </div>

        {data.report.executiveBrief && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Executive brief</h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm leading-relaxed text-fg">{data.report.executiveBrief}</p>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">Priority opportunities</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {data.opportunities.map((o) => (
              <div key={o.id} className="rounded-xl border border-border px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="gap">{o.severity}</Badge>
                  <span className="text-xs text-fg-subtle">
                    Opportunity Index™ {o.opportunityIndex}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-fg">{o.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">{o.summary}</p>
                {data.permissions.approve && (
                  <div className="mt-2 flex gap-2 print:hidden">
                    <button
                      type="button"
                      disabled={pending || !authorName}
                      onClick={() => approve(o.id, "approved")}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] text-accent"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={pending || !authorName}
                      onClick={() => approve(o.id, "rejected")}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] text-fg-muted"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </CardBody>
        </Card>

        {data.permissions.comment && (
          <Card className="print:hidden">
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Comments</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Add a comment"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              />
              <Button
                type="button"
                size="sm"
                disabled={pending || !authorName || !comment}
                onClick={submitComment}
              >
                Post comment
              </Button>
              {data.comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                  <p className="font-medium text-fg">{c.authorName}</p>
                  <p className="mt-1 text-fg-muted">{c.body}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        <footer className="border-t border-border pt-6 text-sm text-fg-muted">
          <p>
            Prepared by: <span className="font-medium text-fg">{preparedBy}</span>
          </p>
          {data.brand?.contactInfo && (
            <p className="mt-1">{data.brand.contactInfo}</p>
          )}
          {data.brand?.reportFooter && (
            <p className="mt-2 text-xs">{data.brand.reportFooter}</p>
          )}
          {(data.brand?.showPoweredBy ?? true) && (
            <p className="mt-3 text-xs">Powered by: MoneyGap AI</p>
          )}
        </footer>
      </div>
    </div>
  );
}
