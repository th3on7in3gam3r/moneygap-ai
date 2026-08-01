import type { ConfidenceIntelJson } from "@/db/schema";
import type { FindingLike } from "@/lib/confidence/types";

/** Validation Engine™ — implementation checklist (not Trust QA) */
export function buildValidationChecklist(
  f: FindingLike,
  risk: ConfidenceIntelJson["risk"],
): string[] {
  const items = [
    "Confirm recommendation matches live site / product state",
    "Review estimated impact labels before committing budget",
    "Implement on a feature branch — never push straight to main/master",
    "Run smoke checks on desktop and mobile after change",
  ];

  if (risk.level === "high" || risk.security >= 50) {
    items.push("Security review for auth/payment/PII paths");
  }
  if (risk.database >= 45) {
    items.push("Backup or migrate safely before schema/data changes");
  }
  if (risk.deployment >= 45) {
    items.push("Verify staging/preview deploy before production");
  }
  if (risk.rollbackComplexity >= 50) {
    items.push("Document rollback steps and owner before merge");
  }
  if ((f.fixes?.length ?? 0) === 0) {
    items.push("Define concrete fix steps with the team before starting");
  }
  items.push("Mark opportunity complete in MoneyGap only after verified");

  return items;
}
