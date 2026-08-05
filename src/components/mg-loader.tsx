"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type MgLoaderProps = {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Full-screen dimmed overlay (e.g. while fetching a modal). */
  overlay?: boolean;
};

const SIZE = {
  sm: { box: "h-10 w-10", img: 40, ring: "h-14 w-14" },
  md: { box: "h-14 w-14", img: 56, ring: "h-20 w-20" },
  lg: { box: "h-20 w-20", img: 80, ring: "h-28 w-28" },
} as const;

export function MgLoader({
  label = "Loading…",
  className,
  size = "md",
  overlay = false,
}: MgLoaderProps) {
  const s = SIZE[size];

  const body = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={cn("relative flex items-center justify-center", s.ring)}>
        <span
          className="absolute inset-0 rounded-full border-2 border-accent/25 border-t-accent animate-spin"
          aria-hidden
        />
        <span
          className="absolute inset-1 rounded-full bg-accent/10 animate-pulse-soft"
          aria-hidden
        />
        <span className={cn("relative z-10", s.box)}>
          <Image
            src="/mg-mark.png"
            alt=""
            width={s.img}
            height={s.img}
            className="h-full w-full object-contain dark:hidden"
            priority
          />
          <Image
            src="/mg-mark-dark.png"
            alt=""
            width={s.img}
            height={s.img}
            className="hidden h-full w-full object-contain dark:block"
            priority
          />
        </span>
      </div>
      {label ? (
        <p className="text-xs font-medium tracking-wide text-fg-muted">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );

  if (!overlay) return body;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
    >
      <div className="rounded-2xl border border-border bg-bg px-8 py-7 shadow-lg">
        {body}
      </div>
    </div>
  );
}
