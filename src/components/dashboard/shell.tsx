"use client";

import {
  BarChart3,
  FileText,
  Gauge,
  Globe2,
  LayoutDashboard,
  Menu,
  ScanSearch,
  Settings,
  Users,
  X,
  Sparkles,
  UsersRound,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type ShellWorkspace = {
  name: string;
  plan: string;
  type: string;
  agencyName?: string | null;
  role?: string | null;
  isClient?: boolean;
};

function buildNav(isAgency: boolean, isClient: boolean) {
  if (isClient) {
    return [
      { href: "/dashboard/my-growth", label: "My Growth", icon: Sprout },
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    ];
  }
  const items = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/analyze", label: "Analyze", icon: ScanSearch },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/money-gaps", label: "Money Gaps", icon: Gauge },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/websites", label: "Websites", icon: Globe2 },
  ];
  if (isAgency) {
    items.push({ href: "/dashboard/clients", label: "Clients", icon: Users });
    items.push({ href: "/dashboard/team", label: "Team", icon: UsersRound });
  }
  items.push({ href: "/dashboard/settings", label: "Settings", icon: Settings });
  return items;
}

function NavLinks({
  pathname,
  isAgency,
  isClient,
  onNavigate,
}: {
  pathname: string;
  isAgency: boolean;
  isClient: boolean;
  onNavigate?: () => void;
}) {
  const nav = buildNav(isAgency, isClient);
  return (
    <nav className="flex flex-col gap-1 px-3">
      {nav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-accent-soft text-accent"
                : "text-fg-muted hover:bg-bg-muted hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  children,
  workspace,
}: {
  children: React.ReactNode;
  workspace?: ShellWorkspace | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isClient = !!workspace?.isClient;
  const isAgency =
    !isClient &&
    (workspace?.type === "agency" || workspace?.type === "enterprise");
  const displayName =
    workspace?.agencyName || workspace?.name || "Workspace";
  const planLabel = workspace?.plan?.replace(/_/g, " ") || "starter";

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-bg-elevated lg:flex lg:flex-col">
        <div className="flex h-16 items-center px-5">
          <Logo href={isClient ? "/dashboard/my-growth" : "/dashboard"} />
        </div>
        <div className="mx-5 mb-4 rounded-xl border border-border bg-bg-muted/50 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.1em] text-fg-subtle">
            {isClient ? "Client access" : "Workspace"}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-fg">{displayName}</p>
          <p className="text-xs capitalize text-fg-muted">
            {isClient
              ? "client"
              : `${planLabel} · ${workspace?.type ?? "individual"}`}
          </p>
        </div>
        <NavLinks
          pathname={pathname}
          isAgency={!!isAgency}
          isClient={isClient}
        />
        <div className="mt-auto border-t border-border p-4">
          <div className="rounded-xl border border-dashed border-border-strong bg-accent-soft/40 p-3">
            <div className="mb-1 flex items-center gap-2 text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                {isClient
                  ? "Your growth"
                  : isAgency
                    ? "Agency Platform"
                    : "Growth Intelligence"}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-fg-muted">
              {isClient
                ? "Review opportunities, comment, and approve recommendations."
                : isAgency
                  ? "Manage clients, brand reports, and portfolio growth."
                  : "Analyze any public website for missing revenue opportunities."}
            </p>
            <Link
              href={
                isClient
                  ? "/dashboard/my-growth"
                  : isAgency
                    ? "/dashboard/clients"
                    : "/dashboard/analyze"
              }
              className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
            >
              {isClient
                ? "My Growth →"
                : isAgency
                  ? "Manage clients →"
                  : "Analyze New Website →"}
            </Link>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-bg-elevated">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo href={isClient ? "/dashboard/my-growth" : "/dashboard"} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-fg-muted hover:bg-bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks
              pathname={pathname}
              isAgency={!!isAgency}
              isClient={isClient}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="rounded-lg border border-border p-2 text-fg-muted lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden text-sm text-fg-muted lg:block">
            {isClient
              ? "Your growth opportunities"
              : "Closing revenue leaks across your portfolio"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationsBell />
            <ThemeToggle />
            <UserButton
              appearance={{
                elements: { avatarBox: "h-8 w-8" },
              }}
            />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
