import { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-fg-muted">Loading Intelligent Onboarding™…</p>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}
