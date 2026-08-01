"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type InviteInfo = {
  email: string;
  role: string;
  clientName: string | null;
  workspaceName: string;
  expiresAt: string;
  accepted: boolean;
  revoked: boolean;
  expired: boolean;
};

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/invite/${token}`);
          const data = (await res.json()) as { invite?: InviteInfo; error?: string };
          if (!res.ok || !data.invite) {
            setError(data.error ?? "Invite not found");
            return;
          }
          setInvite(data.invite);
          setError(null);
        } catch {
          setError("Could not load invite");
        }
      })();
    }, 0);
    return () => clearTimeout(t);
  }, [token]);

  function accept() {
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/invite/${token}`, { method: "POST" });
          const data = (await res.json()) as {
            error?: string;
            redirect?: string;
          };
          if (!res.ok) {
            setError(data.error ?? "Could not accept invite");
            return;
          }
          router.push(data.redirect ?? "/dashboard");
        } catch {
          setError("Could not accept invite");
        }
      })();
    });
  }

  const closed =
    invite && (invite.accepted || invite.revoked || invite.expired);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Workspace invite
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Join a MoneyGap organization with a secure invite link.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          {error && (
            <p className="rounded-xl border border-border bg-bg-muted px-3 py-2 text-sm text-fg">
              {error}
            </p>
          )}
          {invite && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-fg-subtle">Workspace</span>
                <br />
                <span className="font-medium text-fg">{invite.workspaceName}</span>
              </p>
              <p>
                <span className="text-fg-subtle">Role</span>
                <br />
                <span className="font-medium capitalize text-fg">{invite.role}</span>
              </p>
              {invite.clientName && (
                <p>
                  <span className="text-fg-subtle">Client access</span>
                  <br />
                  <span className="font-medium text-fg">{invite.clientName}</span>
                </p>
              )}
              <p className="text-xs text-fg-muted">
                Invited as {invite.email}. Expires{" "}
                {new Date(invite.expiresAt).toLocaleDateString()}.
              </p>
            </div>
          )}

          {closed ? (
            <p className="text-sm text-fg-muted">
              This invite is no longer valid.
              <Link href="/dashboard" className="ml-1 text-accent hover:underline">
                Go to dashboard
              </Link>
            </p>
          ) : !isSignedIn ? (
            <SignInButton mode="modal" forceRedirectUrl={`/invite/${token}`}>
              <Button type="button" className="w-full">
                Sign in to accept
              </Button>
            </SignInButton>
          ) : (
            <Button
              type="button"
              className="w-full"
              disabled={pending || !invite}
              onClick={accept}
            >
              {pending ? "Joining…" : "Accept invite"}
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
