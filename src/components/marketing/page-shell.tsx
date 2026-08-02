import Link from "next/link";
import { StartFreeButton } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import {
  breadcrumbJsonLd,
  jsonLdScript,
  type BreadcrumbItem,
} from "@/lib/seo";

export function MarketingPageShell({
  eyebrow,
  title,
  description,
  children,
  breadcrumbs,
  primaryCta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  breadcrumbs: BreadcrumbItem[];
  primaryCta?: { label: string; href?: string; signUp?: boolean };
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd(breadcrumbs)),
        }}
      />
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-14 sm:px-8 lg:pb-16 lg:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {primaryCta?.signUp ? (
              <StartFreeButton label={primaryCta.label} size="lg" />
            ) : primaryCta?.href ? (
              <Button href={primaryCta.href} size="lg">
                {primaryCta.label}
              </Button>
            ) : (
              <StartFreeButton label="Analyze your site" size="lg" />
            )}
            <Button href="/pricing" variant="secondary" size="lg">
              View pricing
            </Button>
          </div>
        </div>
      </section>
      {children ? (
        <section className="border-t border-border py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">{children}</div>
        </section>
      ) : null}
      <p className="mx-auto max-w-6xl px-5 pb-12 text-sm text-fg-subtle sm:px-8">
        <Link href="/" className="hover:text-fg">
          ← Home
        </Link>
      </p>
    </>
  );
}
