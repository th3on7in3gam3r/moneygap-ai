import Link from "next/link";
import { MarkdownBody } from "@/components/growth-academy/markdown-body";
import { GuideProductRail } from "@/components/guides/guide-product-rail";
import { markdownToHtml } from "@/lib/growth-academy/markdown";
import type { GuideModel } from "@/lib/guides";
import { CATEGORY_LABELS } from "@/lib/guides";

function Section({
  title,
  markdown,
}: {
  title: string;
  markdown?: string;
}) {
  if (!markdown?.trim()) return null;
  const { html } = markdownToHtml(markdown);
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>
      <div className="mt-4">
        <MarkdownBody html={html} />
      </div>
    </section>
  );
}

export function GuideArticle({
  guide,
  related,
}: {
  guide: GuideModel;
  related: { path: string; title: string }[];
}) {
  const s = guide.sections;
  return (
    <article>
      <header className="border-b border-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          {guide.framework.name} · {CATEGORY_LABELS[guide.topic.category]}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {guide.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-fg-muted">
          {guide.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          <span className="rounded-md bg-bg-muted px-2 py-1">{guide.difficulty}</span>
          {guide.tags.slice(0, 6).map((t) => (
            <span key={t} className="rounded-md bg-bg-muted px-2 py-1">
              {t}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          <Section title="Problem Overview" markdown={s.problemOverview} />
          <Section title="Why It Matters" markdown={s.whyItMatters} />
          <Section
            title="Framework-Specific Explanation"
            markdown={s.frameworkExplanation}
          />
          <Section title="Step-by-Step Solution" markdown={s.steps} />
          <Section title="Code Examples" markdown={s.codeExamples} />
          <Section title="Common Mistakes" markdown={s.commonMistakes} />
          <Section title="Validation Checklist" markdown={s.validationChecklist} />
          <Section title="AI Readiness Notes" markdown={s.aiReadinessNotes} />
          <Section title="Deployment Checklist" markdown={s.deploymentChecklist} />
          <Section title="Browser Extension Tips" markdown={s.extensionTips} />

          {related.length > 0 ? (
            <section className="mt-12 border-t border-border pt-8">
              <h2 className="font-display text-xl font-semibold text-fg">
                Related Guides
              </h2>
              <ul className="mt-4 space-y-2">
                {related.map((r) => (
                  <li key={r.path}>
                    <Link
                      href={r.path}
                      className="text-sm text-accent underline-offset-2 hover:underline"
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <GuideProductRail cliCommands={guide.cliCommands} />
        </div>
      </div>
    </article>
  );
}
