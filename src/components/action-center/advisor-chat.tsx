"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Message = {
  id: string;
  role: string;
  content: string;
  opportunityId?: string | null;
};

export function AdvisorChatPanel({
  reportId,
  focusOpportunityId,
}: {
  reportId: string;
  focusOpportunityId?: string | null;
}) {
  const focusId = focusOpportunityId ?? null;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}/advisor`);
        const data = (await res.json()) as { messages?: Message[]; error?: string };
        if (!cancelled && res.ok) {
          setMessages(data.messages ?? []);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  useEffect(() => {
    if (!loaded) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, loaded]);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setLoading(true);
    setError(null);
    setInput("");
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: message,
      opportunityId: focusId,
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await fetch(`/api/reports/${reportId}/advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, opportunityId: focusId }),
      });
      const data = (await res.json()) as { message?: Message; error?: string };
      if (!res.ok || !data.message) {
        setError(data.error ?? "Advisor failed");
        return;
      }
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), optimistic, data.message!]);
    } catch {
      setError("Advisor failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold">AI Growth Advisor™</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Ask how to fix gaps, prioritize work, or generate drafts. Answers use this report’s
          context. Nothing is published automatically.
        </p>
        {focusId && (
          <p className="mt-2 text-xs text-accent">Focused on a selected Money Gap.</p>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-border bg-bg px-4 py-4">
          {!loaded && <p className="text-sm text-fg-muted">Loading conversation…</p>}
          {loaded && messages.length === 0 && (
            <p className="text-sm text-fg-muted">
              Try: “What should I do first?” or “Generate my newsletter plan.”
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-8 rounded-xl bg-accent-soft/50 px-3 py-2 text-sm text-fg"
                  : "mr-8 rounded-xl border border-border bg-bg-elevated px-3 py-2 text-sm text-fg-muted whitespace-pre-wrap"
              }
            >
              {m.content}
            </div>
          ))}
          {loading && <p className="text-xs text-fg-subtle">Advisor is thinking…</p>}
          <div ref={bottomRef} />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
            placeholder="Ask your Growth Advisor…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button type="button" size="sm" disabled={loading} onClick={() => void send()}>
            Send
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
