import { notFound } from "next/navigation";
import { GuideArticle } from "@/components/guides/guide-article";
import { GuideSidebar } from "@/components/guides/guide-sidebar";
import {
  isFrameworkId,
  isTopicId,
  listPublishedForFramework,
  listPublishedGuides,
  loadGuide,
  relatedGuides,
} from "@/lib/guides";
import { buildPageMetadata, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export async function generateStaticParams() {
  const published = await listPublishedGuides();
  return published.map((p) => ({
    framework: p.frameworkId,
    topic: p.topicId,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ framework: string; topic: string }>;
}) {
  const { framework, topic } = await params;
  const guide = await loadGuide(framework, topic);
  if (!guide) return {};
  return buildPageMetadata({
    title: guide.title,
    description: guide.description,
    path: guide.path,
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ framework: string; topic: string }>;
}) {
  const { framework, topic } = await params;
  if (!isFrameworkId(framework) || !isTopicId(topic)) notFound();

  const guide = await loadGuide(framework, topic);
  if (!guide) notFound();

  const [related, topicIds] = await Promise.all([
    relatedGuides(framework, topic),
    listPublishedForFramework(framework),
  ]);

  const techArticle = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updated ?? undefined,
    author: {
      "@type": "Organization",
      name: "MoneyGap AI",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Guides", path: "/guides" },
              {
                name: guide.framework.name,
                path: `/guides/${framework}`,
              },
              { name: guide.topic.name, path: guide.path },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(techArticle) }}
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <GuideSidebar
              frameworkId={framework}
              frameworkName={guide.framework.name}
              topicIds={topicIds}
              activeTopicId={topic}
            />
          </div>
        </aside>
        <GuideArticle guide={guide} related={related} />
      </div>
    </>
  );
}
