import Link from "next/link";
import { StartFreeButton } from "@/components/auth-buttons";
import { ExtensionWaitlistForm } from "@/components/extension/waitlist-form";
import { Button } from "@/components/ui/button";
import { buildPageMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Browser Extension — Coming Soon",
  description:
    "MoneyGap AI browser extension: Growth Intelligence on any live page — MoneyGap Score™, Fix Path™ shares, Coming Soon for Chrome.",
  path: "/extension",
});

function storeUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_EXTENSION_STORE_URL?.trim();
  return raw && raw.startsWith("http") ? raw : null;
}

export default function ExtensionLandingPage() {
  const chromeStore = storeUrl();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Browser Extension", path: "/extension" },
            ]),
          ),
        }}
      />
      <section className="relative overflow-hidden bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-80" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 lg:pb-28 lg:pt-24">
          <p className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl lg:text-6xl">
            MoneyGap AI
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Chrome extension · Coming Soon
          </p>
          <h1 className="mt-5 max-w-2xl font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Growth Intelligence on any live page
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
            Scan the page you’re on, see a MoneyGap Score™, and share Fix Path™
            links — without leaving the browser. The extension is not available
            to install yet.
          </p>

          <div className="mt-10 max-w-lg">
            {chromeStore ? (
              <div className="flex flex-wrap gap-3">
                <Button href={chromeStore} size="lg">
                  Add to Chrome
                </Button>
                <StartFreeButton label="Open MoneyGap AI" size="lg" />
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm font-medium text-fg">
                  Get notified when it ships
                </p>
                <ExtensionWaitlistForm source="extension_page" />
                <div className="mt-4">
                  <StartFreeButton
                    label="Analyze your site in the app"
                    size="md"
                  />
                </div>
              </>
            )}
          </div>

          <p className="mt-10 max-w-lg text-sm text-fg-subtle">
            Shared reports from the extension already work on MoneyGap AI —{" "}
            <Link
              href="/docs/browser-extension"
              className="text-accent underline-offset-2 hover:underline"
            >
              learn how shares work
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
