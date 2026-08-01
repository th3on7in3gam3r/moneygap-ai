import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-bg px-6 py-10 text-center",
        className,
      )}
    >
      <p className="font-display text-lg font-semibold text-fg">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">{description}</p>
      {actionLabel && actionHref ? (
        <div className="mt-4">
          <Button href={actionHref} size="sm">
            {actionLabel}
          </Button>
        </div>
      ) : actionHref ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex text-sm font-semibold text-accent hover:underline"
        >
          Learn more →
        </Link>
      ) : null}
    </div>
  );
}
