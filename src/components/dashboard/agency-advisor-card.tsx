"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function AgencyAdvisorCard() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ask() {
    if (!message.trim()) return;
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/agency/advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        const data = (await res.json()) as { reply?: string; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Advisor failed");
          return;
        }
        setReply(data.reply ?? null);
      } catch {
        setError("Advisor failed");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-display text-lg font-semibold">Agency AI Advisor™</h2>
          <p className="text-sm text-fg-muted">
            Ask about clients needing attention, wins, or portfolio patterns
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder='e.g. "Which clients need attention this month?"'
          className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
        />
        <Button type="button" size="sm" disabled={pending} onClick={ask}>
          {pending ? "Thinking…" : "Ask Advisor"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
        {reply && (
          <div className="rounded-xl border border-border bg-bg-muted/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-fg">
            {reply}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
