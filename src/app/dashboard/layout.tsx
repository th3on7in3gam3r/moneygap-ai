import { DashboardShell } from "@/components/dashboard/shell";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { isClientRole } from "@/lib/agency/permissions";
import { loadAgencyContext } from "@/lib/agency/workspace";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspace = null;
  try {
    const ctx = await loadAgencyContext();
    workspace = {
      name: ctx.workspace.name,
      plan: ctx.workspace.plan,
      type: ctx.workspace.type,
      agencyName: ctx.workspace.agencyName,
      role: ctx.role,
      isClient: isClientRole(ctx.role),
    };
  } catch {
    workspace = null;
  }

  return (
    <DashboardShell workspace={workspace}>
      <OnboardingGate>{children}</OnboardingGate>
    </DashboardShell>
  );
}

