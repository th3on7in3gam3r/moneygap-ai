import Link from "next/link";

/** Marketing-site Growth Badge™ — matches embed SVG chrome with MG mark. */
export function FooterGrowthBadge({
  score,
  href = "/dashboard/badge",
}: {
  score?: number;
  href?: string;
}) {
  const tone =
    score == null
      ? "text-teal-500"
      : score >= 80
        ? "text-emerald-500"
        : score >= 65
          ? "text-teal-400"
          : score >= 40
            ? "text-amber-400"
            : "text-red-400";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-3 rounded-xl border border-[#2a3f55] px-2.5 py-2 transition hover:opacity-95"
      style={{
        background: "linear-gradient(135deg, #0f1c2e 0%, #16324f 100%)",
        minWidth: 200,
      }}
      aria-label={
        score != null ? `MoneyGap Score™ ${score}` : "MoneyGap AI Growth Badge™"
      }
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white p-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mg-badge-mark.png"
          alt=""
          width={34}
          height={28}
          className="h-full w-full object-contain object-center"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
          MoneyGap AI
        </span>
        <span className="block text-[13px] font-bold leading-tight text-slate-50">
          {score != null ? "Score™" : "Growth Badge™"}
        </span>
      </span>
      {score != null ? (
        <span
          className={`pr-1 font-display text-[22px] font-extrabold tabular-nums ${tone}`}
        >
          {score}
        </span>
      ) : null}
    </Link>
  );
}
