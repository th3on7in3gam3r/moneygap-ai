"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ClientInviteButton({ clientId }: { clientId: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function invite() {
    startTransition(() => {
      void (async () => {
        setMsg(null);
        const res = await fetch("/api/team/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            role: "client",
            clientId,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          invite?: { invitePath: string };
        };
        if (!res.ok) {
          setMsg(data.error ?? "Invite failed");
          return;
        }
        if (data.invite?.invitePath) {
          const full = `${window.location.origin}${data.invite.invitePath}`;
          await navigator.clipboard.writeText(full);
          setMsg(`Invite link copied: ${full}`);
          setEmail("");
        }
      })();
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-bg-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
        Invite client
      </p>
      <p className="text-xs text-fg-muted">
        Secure token — they join this workspace with limited Client access.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[12rem] flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm"
          placeholder="client@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || !email}
          onClick={invite}
        >
          Create invite
        </Button>
      </div>
      {msg && <p className="text-xs text-fg-muted break-all">{msg}</p>}
    </div>
  );
}
