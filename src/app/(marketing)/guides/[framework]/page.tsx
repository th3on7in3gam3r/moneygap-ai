import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getFramework,
  getTopic,
  isFrameworkId,
  listPublishedForFramework,
  listPublishedGuides,
} from "@/lib/guides";
import { buildPageMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export async function generateStaticParams() {
  const published = await listPublishedGuides();
  const ids = [...new Set(published.map((p) => p.frameworkId))];
  return ids.map((framework) => ({ framework }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ framework: string }>;
}) {
  const { framework: fw } = await params;
  const meta = getFramework(fw);
  if (!meta) return {};
  return buildPageMetadata({
    title: `${meta.name} Guides`,
    description: meta.summary,
    path: `/guides/${meta.slug}`,
  });
}

export default async function FrameworkGuidesPage({
  params,
}: {
  params: Promise<{ framework: string }>;
}) {
  const { framework: fw } = await params;
  if (!isFrameworkId(fw)) notFound();
  const framework = getFramework(fw)!;
  const topics = await listPublishedForFramework(fw);
  if (topics.length === 0) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Guides", path: "/guides" },
              { name: framework.name, path: `/guides/${fw}` },
            ]),
          ),
        }}
      />
      <section className="border-b border-border bg-hero">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Guides
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg">
            {framework.name}
          </h1>
          <p className="mt-3 max-w-2xl text-fg-muted">{framework.summary}</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <ul className="grid gap-3 sm:grid-cols-2">
          {topics.map((id) => {
            const topic = getTopic(id)!;
            return (
              <li key={id}>
                <Link
                  href={`/guides/${fw}/${id}`}
                  className="block rounded-xl border border-border/80 bg-bg-elevated/40 p-5 transition hover:border-accent/40"
                >
                  <p className="font-display text-lg font-semibold text-fg">
                    {topic.name}
                  </p>
                  <p className="mt-2 text-sm text-fg-muted">{topic.summary}</p>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-sm text-fg-muted">
          <Link href="/guides" className="text-accent hover:underline">
            ← All frameworks
          </Link>
        </p>
      </section>
    </>
  );
}
