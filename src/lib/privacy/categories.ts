export type ConsentCategoryId =
  | "essential"
  | "performance"
  | "analytics"
  | "personalization"
  | "productImprovement";

export type ConsentCategories = Record<ConsentCategoryId, boolean>;

export type ConsentCategoryDef = {
  id: ConsentCategoryId;
  label: string;
  locked?: boolean;
  bullets: string[];
  /** Whether MoneyGap currently loads scripts for this category. */
  currentlyActive: boolean;
  inactiveNote?: string;
};

export const CONSENT_CATEGORY_DEFS: ConsentCategoryDef[] = [
  {
    id: "essential",
    label: "Essential",
    locked: true,
    currentlyActive: true,
    bullets: [
      "Keeps your account secure.",
      "Maintains login sessions.",
      "Protects authentication.",
      "Cannot be disabled.",
    ],
  },
  {
    id: "performance",
    label: "Performance",
    currentlyActive: false,
    inactiveNote: "No performance measurement scripts are loaded today.",
    bullets: [
      "Helps us improve speed.",
      "Identifies slow pages.",
      "Improves reliability.",
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    currentlyActive: false,
    inactiveNote: "No third-party analytics scripts are loaded today.",
    bullets: [
      "Shows us how MoneyGap is being used.",
      "Improves product decisions.",
      "Anonymous whenever possible.",
    ],
  },
  {
    id: "personalization",
    label: "Personalization",
    currentlyActive: true,
    bullets: [
      "Optional saved preferences (theme still works without this).",
      "Dashboard layout preferences.",
      "Language and recent context.",
      "User interface preferences.",
    ],
  },
  {
    id: "productImprovement",
    label: "Product Improvement",
    currentlyActive: false,
    inactiveNote: "No anonymous feature-usage trackers are loaded today.",
    bullets: [
      "Anonymous feature usage.",
      "Helps prioritize new functionality.",
    ],
  },
];

export function defaultCategories(allOptional = false): ConsentCategories {
  return {
    essential: true,
    performance: allOptional,
    analytics: allOptional,
    personalization: allOptional,
    productImprovement: allOptional,
  };
}

export function acceptAllCategories(): ConsentCategories {
  return {
    essential: true,
    performance: true,
    analytics: true,
    personalization: true,
    productImprovement: true,
  };
}

export function rejectOptionalCategories(): ConsentCategories {
  return defaultCategories(false);
}

export function normalizeCategories(
  input: Partial<ConsentCategories> | null | undefined,
): ConsentCategories {
  const base = rejectOptionalCategories();
  if (!input) return base;
  return {
    essential: true,
    performance: Boolean(input.performance),
    analytics: Boolean(input.analytics),
    personalization: Boolean(input.personalization),
    productImprovement: Boolean(input.productImprovement),
  };
}
