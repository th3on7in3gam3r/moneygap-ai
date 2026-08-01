export type ImplementationStatus = "open" | "saved" | "in_progress" | "completed";

export type LifecycleStatus =
  | "detected"
  | "reviewed"
  | "planned"
  | "in_progress"
  | "completed"
  | "improved"
  | "resolved";

/** Map Action Center implementationStatus → lifecycle */
export function lifecycleFromImplementation(status: string): LifecycleStatus {
  switch (status) {
    case "saved":
      return "reviewed";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "open":
    default:
      return "detected";
  }
}

/** Map lifecycle → Action Center implementationStatus */
export function implementationFromLifecycle(
  status: LifecycleStatus,
): ImplementationStatus {
  switch (status) {
    case "reviewed":
      return "saved";
    case "planned":
    case "in_progress":
      return "in_progress";
    case "completed":
    case "improved":
    case "resolved":
      return "completed";
    case "detected":
    default:
      return "open";
  }
}

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  detected: "Detected",
  reviewed: "Reviewed",
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  improved: "Improved",
  resolved: "Resolved",
};
