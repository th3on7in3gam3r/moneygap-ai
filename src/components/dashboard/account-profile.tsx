"use client";

import { useMemo, useState } from "react";
import { UserProfile, useClerk, useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AccountTab = "profile" | "security";

const clerkAppearance = {
  variables: {
    colorPrimary: "#0f7a56",
    colorText: "#121816",
    colorTextSecondary: "#5a6b62",
    colorBackground: "transparent",
    colorInputBackground: "#f4f6f4",
    colorInputText: "#121816",
    colorNeutral: "#5a6b62",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full! max-w-none!",
    cardBox: "w-full! max-w-none! shadow-none! border-0! rounded-none!",
    card: "w-full! max-w-none! bg-transparent! shadow-none! border-0! p-0!",
    scrollBox: "bg-transparent!",
    navbar: "hidden!",
    navbarMobileMenuButton: "hidden!",
    headerTitle: "hidden!",
    headerSubtitle: "hidden!",
    pageScrollBox: "p-0!",
    page: "gap-4!",
    profilePage: "gap-4!",
    profileSection: "border border-border rounded-xl bg-bg-elevated px-4 py-3.5 shadow-none!",
    profileSectionTitle: "mb-2!",
    profileSectionTitleText: "font-display! text-sm! font-semibold! text-fg!",
    profileSectionHeader: "gap-2!",
    profileSectionContent: "gap-2!",
    profileSectionPrimaryButton:
      "text-accent! text-xs! font-medium! hover:underline! shadow-none! bg-transparent!",
    profileSectionUpdateButton:
      "text-accent! text-xs! font-medium! hover:underline! shadow-none! bg-transparent!",
    accordionTriggerButton: "text-fg! hover:bg-bg-muted!",
    formButtonPrimary:
      "bg-accent! text-accent-fg! shadow-none! hover:brightness-110!",
    formFieldInput:
      "rounded-xl! border-border! bg-bg! text-fg! shadow-none!",
    formFieldLabel: "text-fg-muted! text-xs!",
    badge: "rounded-md! bg-bg-muted! text-fg-muted! text-[10px]! font-semibold!",
    avatarBox: "h-11! w-11!",
    identityPreview: "rounded-xl! border-border!",
    menuButton: "text-fg-muted! hover:bg-bg-muted!",
    button: "rounded-xl!",
    buttonArrowIcon: "text-fg-muted!",
  },
} as const;

function AccountSummary({
  onManage,
}: {
  onManage: (tab: AccountTab) => void;
}) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    "—";
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Your account";
  const google = user?.externalAccounts?.find((a) => a.provider === "google");

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      setSigningOut(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-16 rounded-xl bg-bg-muted" />
        <div className="h-12 rounded-xl bg-bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk CDN avatar
            <img
              src={user.imageUrl}
              alt=""
              className="h-14 w-14 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft font-display text-lg font-semibold text-accent">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-display text-base font-semibold text-fg">{name}</p>
            <p className="mt-0.5 text-sm text-fg-muted">{primaryEmail}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="accent">Primary email</Badge>
              {google && <Badge tone="neutral">Google connected</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => onManage("profile")}>
            Edit profile
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onManage("security")}>
            Security
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="text-danger hover:bg-danger-soft hover:text-danger"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-bg/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            Email
          </p>
          <p className="mt-1 truncate text-sm text-fg">{primaryEmail}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            Sign-in method
          </p>
          <p className="mt-1 text-sm text-fg">
            {google ? "Google · password optional" : "Email & password"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AccountProfile() {
  const [mode, setMode] = useState<"summary" | "manage">("summary");
  const [tab, setTab] = useState<AccountTab>("profile");

  const hash = useMemo(
    () => (tab === "security" ? "#/security" : "#/"),
    [tab],
  );

  if (mode === "summary") {
    return (
      <AccountSummary
        onManage={(next) => {
          setTab(next);
          setMode("manage");
          if (typeof window !== "undefined") {
            window.location.hash = next === "security" ? "/security" : "/";
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-border bg-bg p-0.5 text-xs">
          {(
            [
              { id: "profile", label: "Profile" },
              { id: "security", label: "Security" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                if (typeof window !== "undefined") {
                  window.location.hash = item.id === "security" ? "/security" : "/";
                }
              }}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition",
                tab === item.id
                  ? "bg-accent-soft text-accent"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => setMode("summary")}>
          Done
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-bg/40">
        <div className="mg-clerk-account px-3 py-3 sm:px-4 sm:py-4">
          <UserProfile
            key={hash}
            routing="hash"
            appearance={clerkAppearance}
          />
        </div>
      </div>
    </div>
  );
}
