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
      <p className="text-sm text-fg-muted">{styleLabel}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${svgUrl}${svgUrl.includes("?") ? "&" : "?"}v=2`}
        alt={styleLabel}
        width={280}
        height={64}
        className="max-w-full rounded-lg border border-border bg-bg"
      />
    </div>
  );
}
