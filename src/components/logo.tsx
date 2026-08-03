import Image from "next/image";
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
      aria-label="MoneyGap AI"
      className={cn("inline-flex items-center gap-2.5 text-fg no-underline", className)}
    >
      <span className="relative h-8 w-8 shrink-0">
        <Image
          src="/mg-mark.png"
          alt=""
          width={64}
          height={40}
          className="h-8 w-8 object-contain dark:hidden"
          priority
        />
        <Image
          src="/mg-mark-dark.png"
          alt=""
          width={64}
          height={40}
          className="hidden h-8 w-8 object-contain dark:block"
          priority
        />
      </span>
      {!markOnly && (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight" aria-hidden>
          MoneyGap<span className="text-accent"> AI</span>
        </span>
      )}
    </Link>
  );
}
