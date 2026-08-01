"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: NotificationItem[];
        unreadCount?: number;
      };
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setLoaded(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const boot = setTimeout(() => {
      void load();
    }, 0);
    const id = setInterval(() => {
      void load();
    }, 60_000);
    return () => {
      clearTimeout(boot);
      clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
      ),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  }

  function clearAll() {
    startTransition(() => {
      void (async () => {
        setItems([]);
        setUnreadCount(0);
        const res = await fetch("/api/notifications", { method: "DELETE" });
        if (!res.ok) {
          void load();
        }
      })();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next || !loaded) void load();
        }}
        className="relative rounded-lg border border-border p-2 text-fg-muted transition hover:bg-bg-muted hover:text-fg"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-md bg-gap px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-lg">
          <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-fg">Notifications</p>
              <p className="text-xs text-fg-muted">MoneyGap Monitor™ updates</p>
            </div>
            {items.length > 0 ? (
              <button
                type="button"
                disabled={pending}
                onClick={clearAll}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-fg-muted transition hover:bg-bg-muted hover:text-fg disabled:opacity-50"
              >
                {pending ? "Clearing…" : "Clear"}
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-fg-muted">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div
                    className={cn(
                      "border-b border-border/70 px-3 py-3 last:border-0",
                      !n.readAt && "bg-accent-soft/30",
                    )}
                  >
                    <p className="text-sm font-medium text-fg">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{n.body}</p>
                    <p className="mt-1 text-[10px] text-fg-subtle">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                );
                if (n.href) {
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => {
                        if (!n.readAt) void markRead(n.id);
                        setOpen(false);
                      }}
                      className="block transition hover:bg-bg-muted/60"
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="block w-full text-left transition hover:bg-bg-muted/60"
                    onClick={() => {
                      if (!n.readAt) void markRead(n.id);
                    }}
                  >
                    {inner}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
