export function BadgePreview({
  svgUrl,
  styleLabel,
}: {
  svgUrl: string;
  styleLabel: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-fg-subtle">
        Preview
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={svgUrl}
        alt={styleLabel}
        width={220}
        height={56}
        className="rounded-lg border border-border bg-bg"
      />
    </div>
  );
}
