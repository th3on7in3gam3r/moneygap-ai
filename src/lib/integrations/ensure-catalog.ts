import { eq } from "drizzle-orm";
import { db } from "@/db";
import { integrationProviders } from "@/db/schema";
import { SEED_INTEGRATION_PROVIDERS } from "@/lib/integrations/catalog";

let ensured = false;

export async function ensureIntegrationCatalog() {
  if (ensured) return;
  for (const row of SEED_INTEGRATION_PROVIDERS) {
    const existing = await db.query.integrationProviders.findFirst({
      where: eq(integrationProviders.slug, row.slug),
    });
    if (!existing) {
      await db.insert(integrationProviders).values({
        slug: row.slug,
        name: row.name,
        category: row.category,
        authType: row.authType,
        scopes: row.scopes,
        status: row.status,
        description: row.description,
        meta: row.meta ?? null,
        sortOrder: row.sortOrder,
      });
    } else if (
      existing.authType !== row.authType ||
      existing.description !== row.description
    ) {
      await db
        .update(integrationProviders)
        .set({
          authType: row.authType,
          scopes: row.scopes,
          description: row.description,
          status: row.status,
        })
        .where(eq(integrationProviders.slug, row.slug));
    }
  }
  ensured = true;
}
