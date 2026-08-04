import Link from "next/link";
import { getTopic } from "@/lib/guides/topics";
import type { FrameworkId, TopicId } from "@/lib/guides/types";
import { cn } from "@/lib/utils";

export function GuideSidebar({
  frameworkId,
  frameworkName,
  topicIds,
  activeTopicId,
}: {
  frameworkId: FrameworkId;
  frameworkName: string;
  topicIds: TopicId[];
  activeTopicId?: TopicId;
}) {
  return (
    <nav aria-label={`${frameworkName} guides`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
        {frameworkName}
      </p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {topicIds.map((id) => {
          const topic = getTopic(id);
          if (!topic) return null;
          const href = `/guides/${frameworkId}/${id}`;
          const active = id === activeTopicId;
          return (
            <li key={id}>
              <Link
                href={href}
                className={cn(
                  "block rounded-md px-2 py-1.5 transition",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-fg-muted hover:bg-bg-muted hover:text-fg",
                )}
              >
                {topic.name}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href={`/guides/${frameworkId}`}
        className="mt-4 inline-block text-xs text-accent underline-offset-2 hover:underline"
      >
        All {frameworkName} guides
      </Link>
    </nav>
  );
}
