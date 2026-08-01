import { redirect } from "next/navigation";
import { ClientsManager } from "@/app/dashboard/clients/clients-manager";
import { listClients } from "@/lib/agency/clients";
import { loadAgencyContext } from "@/lib/agency/workspace";

export default async function ClientsPage() {
  let ctx;
  try {
    ctx = await loadAgencyContext();
  } catch {
    redirect("/sign-in");
  }
  if (!ctx.isAgency) {
    redirect("/dashboard/settings");
  }

  const clients = await listClients(ctx.workspace.id);
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Clients</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Manage agency clients, assignments, and growth history.
        </p>
      </div>
      <ClientsManager
        initialClients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          websiteUrl: c.websiteUrl,
          industry: c.industry,
          status: c.status,
          assignedUserId: c.assignedUserId,
          websites: c.websites?.map((w) => ({ id: w.id, domain: w.domain })),
        }))}
      />
    </div>
  );
}
