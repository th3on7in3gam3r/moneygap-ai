import { GuidesSearchClient } from "@/components/guides/guides-search";
import { buildSearchIndex } from "@/lib/guides";
import { buildPageMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Search Guides",
  description:
    "Search MoneyGap Guides by framework, category, difficulty, tags, and CLI commands.",
  path: "/guides/search",
});

export default async function GuidesSearchPage() {
  const index = await buildSearchIndex();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Guides", path: "/guides" },
              { name: "Search", path: "/guides/search" },
            ]),
          ),
        }}
      />
      <section className="border-b border-border bg-hero">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Search Guides
          </h1>
          <p className="mt-3 max-w-xl text-fg-muted">
            Filter by framework, category, difficulty, tags, and CLI commands.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <GuidesSearchClient index={index} />
      </section>
    </>
  );
}
