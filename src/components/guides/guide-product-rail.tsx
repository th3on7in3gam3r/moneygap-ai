import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GuideProductRail({
  cliCommands,
}: {
  cliCommands: string[];
}) {
  const cmds = cliCommands.length
    ? cliCommands
    : ["moneygap scan", "moneygap validate llms", "moneygap generate llms"];

  return (
    <aside className="rounded-xl border border-border/80 bg-bg-elevated/50 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
        MoneyGap tools
      </p>
      <p className="mt-2 text-sm text-fg-muted">
        Educate first — then verify with CLI, extension, or AI Readiness.
      </p>
      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium text-fg">CLI</p>
        {cmds.slice(0, 5).map((c) => (
          <code
            key={c}
            className="block rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs text-fg"
          >
            {c}
          </code>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <Button href="/extension" variant="secondary" size="sm">
          Browser Extension (Coming Soon)
        </Button>
        <Button href="/docs/browser-extension" variant="secondary" size="sm">
          Extension docs
        </Button>
        <Button href="/dashboard/ai-readiness" size="sm">
          Improve AI Readiness
        </Button>
      </div>
      <p className="mt-4 text-xs text-fg-subtle">
        Prefer product docs?{" "}
        <Link href="/docs" className="text-accent underline-offset-2 hover:underline">
          /docs
        </Link>
      </p>
    </aside>
  );
}
