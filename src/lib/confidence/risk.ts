import type { ConfidenceIntelJson } from "@/db/schema";
import type { FindingLike, ConfidenceEnrichContext } from "@/lib/confidence/types";
import { clampScore } from "@/lib/confidence/types";

function difficultyBump(d?: string | null): number {
  if (d === "hard" || d === "high") return 25;
  if (d === "medium") return 10;
  return 0;
}

/** Risk Engine™ — implementation risk dimensions */
export function computeRisk(
  f: FindingLike,
  ctx: ConfidenceEnrichContext,
): ConfidenceIntelJson["risk"] {
  const mod = (f.moduleId ?? "").toLowerCase();
  const cat = (f.category ?? "").toLowerCase();
  const title = (f.title ?? "").toLowerCase();
  const blob = `${mod} ${cat} ${title}`;

  const isDb =
    /schema|database|migration|drizzle|prisma|sql|data/.test(blob);
  const isAuth = /auth|clerk|login|permission|security|pii|gdpr/.test(blob);
  const isPay = /payment|stripe|checkout|billing/.test(blob);
  const isDeploy = /deploy|hosting|cdn|edge|infra/.test(blob);

  const base = 25 + difficultyBump(f.difficulty);
  const sev =
    f.severity === "critical" ? 20 : f.severity === "high" ? 12 : 0;

  const breakingChanges = clampScore(
    base + sev + (isAuth || isPay || isDb ? 20 : 0),
  );
  const deployment = clampScore(
    30 +
      (ctx.hasTechProfile ? 0 : 18) +
      (isDeploy ? 15 : 5) +
      difficultyBump(f.difficulty) * 0.5,
  );
  const database = clampScore(isDb ? 55 + difficultyBump(f.difficulty) : 20);
  const security = clampScore(
    isAuth || isPay ? 60 + difficultyBump(f.difficulty) : 22,
  );
  const rollbackComplexity = clampScore(
    28 +
      difficultyBump(f.difficulty) +
      (ctx.hasTechProfile ? 0 : 20) +
      (isDb ? 15 : 0) +
      (isAuth ? 10 : 0),
  );

  const avg =
    (breakingChanges +
      deployment +
      database +
      security +
      rollbackComplexity) /
    5;
  const level: "low" | "medium" | "high" =
    avg >= 60 ? "high" : avg >= 40 ? "medium" : "low";

  return {
    level,
    breakingChanges,
    deployment,
    database,
    security,
    rollbackComplexity,
    summary:
      level === "high"
        ? "Elevated implementation risk — review security/data paths and plan rollback before shipping."
        : level === "medium"
          ? "Moderate risk — use a feature branch and validation checklist before merge."
          : "Lower implementation risk — still review estimated impact and checklist before acting.",
  };
}
