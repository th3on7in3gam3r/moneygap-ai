import { StartFreeButton } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";

export function CtaBand({
  title,
  description,
  primaryLabel = "Start free analysis",
  secondaryHref = "/pricing",
  secondaryLabel = "View pricing",
}: {
  title: string;
  description: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="border-t border-border bg-bg-elevated py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="overflow-hidden rounded-[1.75rem] border border-border bg-hero px-6 py-12 sm:px-12">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-fg-muted">{description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <StartFreeButton label={primaryLabel} size="lg" />
              <Button href={secondaryHref} variant="secondary" size="lg">
                {secondaryLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
