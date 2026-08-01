import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  markOnly = false,
}: {
  className?: string;
  href?: string;
  markOnly?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 text-fg no-underline", className)}
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path
            d="M4 16.5 9.2 9.8l3.3 3.6L20 6.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.5 6.5H20v3.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!markOnly && (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight">
          MoneyGap<span className="text-accent"> AI</span>
        </span>
      )}
    </Link>
  );
}
