import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "gap" | "danger" | "success";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]",
        tone === "neutral" && "bg-bg-muted text-fg-muted",
        tone === "accent" && "bg-accent-soft text-accent",
        tone === "gap" && "bg-gap-soft text-gap",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "success" && "bg-accent-soft text-success",
        className,
      )}
    >
      {children}
    </span>
  );
}
