"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  PUBLIC_DOC_CATEGORY_LABELS,
  type PublicDocCategory,
  type PublicDocEntry,
} from "@/lib/docs/catalog";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: PublicDocCategory[] = [
  "start",
  "product",
  "privacy",
  "platform",
  "grow",
];

export function DocsSidebar({ docs }: { docs: PublicDocEntry[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    label: PUBLIC_DOC_CATEGORY_LABELS[category],
    items: docs.filter((d) => d.category === category),
  })).filter((g) => g.items.length > 0);

  const nav = (
    <nav aria-label="Documentation" className="space-y-6">
      <div>
        <Link
          href="/docs"
          className={cn(
            "block text-sm font-medium transition",
            pathname === "/docs" ? "text-accent" : "text-fg-muted hover:text-fg",
          )}
        >
          Documentation home
        </Link>
      </div>
      {groups.map((group) => (
        <div key={group.category}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
            {group.label}
          </p>
          <ul className="mt-2 space-y-1">
            {group.items.map((doc) => {
              const href = `/docs/${doc.slug}`;
              const active = pathname === href;
              return (
                <li key={doc.slug}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-lg px-2 py-1.5 text-sm transition",
                      active
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-fg-muted hover:bg-bg-muted hover:text-fg",
                    )}
                  >
                    {doc.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm font-medium text-fg"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Guides
          <ChevronDown
            className={cn("size-4 transition", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {open ? <div className="mt-3 rounded-xl border border-border bg-bg-elevated p-4">{nav}</div> : null}
      </div>
      <aside className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto lg:block">
        {nav}
      </aside>
    </>
  );
}
