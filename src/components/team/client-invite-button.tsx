"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ClientInviteButton({ clientId }: { clientId: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMsg("Could not copy — select the link and copy manually.");
    }
  }

  function invite() {
    startTransition(() => {
      void (async () => {
        setMsg(null);
        setInviteLink(null);
        setCopied(false);
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
          setInviteLink(full);
          setEmail("");
          await copyLink(full);
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
        Secure token — they join this workspace with limited Client access. Share the
        link yourself (email is not sent automatically).
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

      {inviteLink ? (
        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={inviteLink}
            className="min-w-0 flex-1 truncate rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-fg"
            aria-label="Invite link"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 gap-1.5"
            onClick={() => void copyLink(inviteLink)}
            aria-label={copied ? "Invite link copied" : "Copy invite link"}
            title={copied ? "Copied" : "Copy invite link"}
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : null}

      {msg && <p className="text-xs text-danger break-all">{msg}</p>}
    </div>
  );
}
