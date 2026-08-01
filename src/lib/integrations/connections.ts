import { and, asc, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db";
import {
  integrationConnections,
  integrationCredentials,
  integrationProviders,
  type IntegrationCredentialPayload,
  type IntegrationConnectionStatus,
} from "@/db/schema";
import { writeIntegrationAudit } from "@/lib/integrations/audit";
import {
  encryptCredentials,
  decryptCredentials,
  IntegrationCryptoError,
  isEncryptionConfigured,
  signOAuthState,
} from "@/lib/integrations/crypto";
import { ensureIntegrationCatalog } from "@/lib/integrations/ensure-catalog";
import { computeIntegrationHealth } from "@/lib/integrations/health";
import { getConnector } from "@/lib/integrations/registry";

export async function listIntegrationsOverview(workspaceId: string) {
  await ensureIntegrationCatalog();
  const [providers, connections] = await Promise.all([
    db.query.integrationProviders.findMany({
      orderBy: [asc(integrationProviders.sortOrder), asc(integrationProviders.name)],
    }),
    db.query.integrationConnections.findMany({
      where: eq(integrationConnections.workspaceId, workspaceId),
    }),
  ]);

  const providerCategories = Object.fromEntries(
    providers.map((p) => [p.slug, p.category]),
  );
  const health = computeIntegrationHealth({ connections, providerCategories });

  const bySlug = Object.fromEntries(connections.map((c) => [c.providerSlug, c]));

  return {
    providers: providers.map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      authType: p.authType,
      scopes: p.scopes ?? [],
      status: p.status,
      description: p.description,
      meta: p.meta,
      connection: bySlug[p.slug]
        ? {
            id: bySlug[p.slug]!.id,
            status: bySlug[p.slug]!.status,
            lastSyncAt: bySlug[p.slug]!.lastSyncAt?.toISOString() ?? null,
            lastError: bySlug[p.slug]!.lastError,
            healthScore: bySlug[p.slug]!.healthScore,
            permissions: bySlug[p.slug]!.permissions ?? [],
            snapshot: bySlug[p.slug]!.normalizedSnapshot,
          }
        : null,
    })),
    health,
    connectionMap: providers.map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      status: (bySlug[p.slug]?.status ?? "disconnected") as
        | IntegrationConnectionStatus
        | "disconnected",
    })),
  };
}

async function upsertConnection(input: {
  workspaceId: string;
  providerSlug: string;
  status: IntegrationConnectionStatus;
  permissions?: string[];
  userId?: string;
  lastError?: string | null;
}) {
  const existing = await db.query.integrationConnections.findFirst({
    where: and(
      eq(integrationConnections.workspaceId, input.workspaceId),
      eq(integrationConnections.providerSlug, input.providerSlug),
    ),
  });

  if (existing) {
    const [row] = await db
      .update(integrationConnections)
      .set({
        status: input.status,
        permissions: input.permissions ?? existing.permissions,
        lastError: input.lastError ?? null,
        connectedByUserId: input.userId ?? existing.connectedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, existing.id))
      .returning();
    return row!;
  }

  const [row] = await db
    .insert(integrationConnections)
    .values({
      workspaceId: input.workspaceId,
      providerSlug: input.providerSlug,
      status: input.status,
      permissions: input.permissions ?? [],
      lastError: input.lastError ?? null,
      connectedByUserId: input.userId ?? null,
    })
    .returning();
  return row!;
}

async function storeCredentials(
  connectionId: string,
  payload: IntegrationCredentialPayload,
) {
  if (!isEncryptionConfigured()) {
    throw new IntegrationCryptoError(
      "INTEGRATION_ENCRYPTION_KEY is not configured",
    );
  }
  const enc = encryptCredentials(payload);
  const existing = await db.query.integrationCredentials.findFirst({
    where: eq(integrationCredentials.connectionId, connectionId),
  });
  if (existing) {
    await db
      .update(integrationCredentials)
      .set({
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        keyVersion: enc.keyVersion,
        updatedAt: new Date(),
      })
      .where(eq(integrationCredentials.id, existing.id));
  } else {
    await db.insert(integrationCredentials).values({
      connectionId,
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      keyVersion: enc.keyVersion,
    });
  }
}

async function loadCredentials(
  connectionId: string,
): Promise<IntegrationCredentialPayload | null> {
  const row = await db.query.integrationCredentials.findFirst({
    where: eq(integrationCredentials.connectionId, connectionId),
  });
  if (!row) return null;
  return decryptCredentials({ ciphertext: row.ciphertext, iv: row.iv });
}

/** Decrypt Hub vault credentials for a connected provider (Developer Mode, etc.). */
export async function getProviderCredentials(
  workspaceId: string,
  providerSlug: string,
): Promise<{
  connectionId: string;
  status: IntegrationConnectionStatus;
  credentials: IntegrationCredentialPayload;
} | null> {
  const existing = await db.query.integrationConnections.findFirst({
    where: and(
      eq(integrationConnections.workspaceId, workspaceId),
      eq(integrationConnections.providerSlug, providerSlug),
    ),
  });
  if (!existing || existing.status !== "connected") return null;
  const credentials = await loadCredentials(existing.id);
  if (!credentials) return null;
  return {
    connectionId: existing.id,
    status: existing.status,
    credentials,
  };
}

export async function beginConnect(input: {
  workspaceId: string;
  userId: string;
  providerSlug: string;
  apiKey?: string;
}) {
  await ensureIntegrationCatalog();
  const provider = await db.query.integrationProviders.findFirst({
    where: eq(integrationProviders.slug, input.providerSlug),
  });
  if (!provider || provider.status === "deprecated") {
    return { ok: false as const, error: "Provider not found", status: 404 as const };
  }

  const connector = getConnector(input.providerSlug);
  if (!connector) {
    return { ok: false as const, error: "Connector missing", status: 500 as const };
  }

  if (!isEncryptionConfigured()) {
    return {
      ok: false as const,
      error: "INTEGRATION_ENCRYPTION_KEY is not configured",
      status: 503 as const,
    };
  }

  if (connector.authType === "oauth2") {
    const hubspotOauthReady =
      input.providerSlug !== "hubspot" ||
      Boolean(
        process.env.HUBSPOT_INTEGRATION_CLIENT_ID?.trim() &&
          process.env.HUBSPOT_INTEGRATION_CLIENT_SECRET?.trim(),
      );

    if (connector.getAuthUrl && hubspotOauthReady) {
      try {
        const state = signOAuthState({
          workspaceId: input.workspaceId,
          providerSlug: input.providerSlug,
          userId: input.userId,
          nonce: randomBytes(8).toString("hex"),
          exp: Date.now() + 1000 * 60 * 15,
        });
        const authUrl = connector.getAuthUrl(state);
        await upsertConnection({
          workspaceId: input.workspaceId,
          providerSlug: input.providerSlug,
          status: "pending",
          permissions: provider.scopes ?? [],
          userId: input.userId,
        });
        await writeIntegrationAudit({
          workspaceId: input.workspaceId,
          actorUserId: input.userId,
          action: "oauth_start",
          providerSlug: input.providerSlug,
        });
        return { ok: true as const, mode: "oauth" as const, authUrl };
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "OAuth start failed",
          status: 503 as const,
        };
      }
    }

    // HubSpot: Private App token fallback when OAuth app env is not set yet
    if (input.providerSlug === "hubspot") {
      const token =
        input.apiKey?.trim() || process.env.HUBSPOT_ACCESS_TOKEN?.trim();
      if (token) {
        const creds: IntegrationCredentialPayload = {
          accessToken: token,
          apiKey: token,
        };
        if (connector.validateCredentials) {
          const valid = await connector.validateCredentials(creds);
          if (!valid) {
            return {
              ok: false as const,
              error: "Invalid HubSpot token",
              status: 400 as const,
            };
          }
        }
        const connection = await upsertConnection({
          workspaceId: input.workspaceId,
          providerSlug: input.providerSlug,
          status: "connected",
          permissions: provider.scopes ?? [],
          userId: input.userId,
        });
        await storeCredentials(connection.id, creds);
        await writeIntegrationAudit({
          workspaceId: input.workspaceId,
          actorUserId: input.userId,
          action: "connect",
          providerSlug: input.providerSlug,
          connectionId: connection.id,
        });
        await syncConnection({
          workspaceId: input.workspaceId,
          userId: input.userId,
          providerSlug: input.providerSlug,
        });
        return {
          ok: true as const,
          mode: "api_key" as const,
          connection,
          message:
            "Connected with Private App token (dev fallback). Configure HUBSPOT_INTEGRATION_CLIENT_ID/SECRET for customer OAuth.",
        };
      }
    }

    if (!connector.getAuthUrl) {
      const connection = await upsertConnection({
        workspaceId: input.workspaceId,
        providerSlug: input.providerSlug,
        status: "pending",
        permissions: provider.scopes ?? [],
        userId: input.userId,
        lastError: "OAuth not configured for this provider yet",
      });
      await writeIntegrationAudit({
        workspaceId: input.workspaceId,
        actorUserId: input.userId,
        action: "connect_pending",
        providerSlug: input.providerSlug,
        connectionId: connection.id,
      });
      return {
        ok: true as const,
        mode: "pending" as const,
        connection,
        message: "Provider registered as pending — OAuth app not configured.",
      };
    }

    return {
      ok: false as const,
      error:
        input.providerSlug === "hubspot"
          ? "Set HUBSPOT_INTEGRATION_CLIENT_ID and HUBSPOT_INTEGRATION_CLIENT_SECRET (Legacy App), or HUBSPOT_ACCESS_TOKEN for Private App testing."
          : "OAuth app not configured for this provider",
      status: 503 as const,
    };
  }

  // API key
  let apiKey = input.apiKey?.trim();
  if (!apiKey && input.providerSlug === "hubspot") {
    apiKey = process.env.HUBSPOT_ACCESS_TOKEN?.trim() || undefined;
  }
  if (!apiKey) {
    return {
      ok: false as const,
      error: "apiKey is required for this provider",
      status: 400 as const,
    };
  }
  const creds: IntegrationCredentialPayload = { apiKey };
  if (connector.validateCredentials) {
    const valid = await connector.validateCredentials(creds);
    if (!valid) {
      return { ok: false as const, error: "Invalid credentials", status: 400 as const };
    }
  }

  const connection = await upsertConnection({
    workspaceId: input.workspaceId,
    providerSlug: input.providerSlug,
    status: "connected",
    permissions: provider.scopes ?? [],
    userId: input.userId,
  });
  await storeCredentials(connection.id, creds);
  await writeIntegrationAudit({
    workspaceId: input.workspaceId,
    actorUserId: input.userId,
    action: "connect",
    providerSlug: input.providerSlug,
    connectionId: connection.id,
  });

  // Soft sync
  try {
    await syncConnection({
      workspaceId: input.workspaceId,
      userId: input.userId,
      providerSlug: input.providerSlug,
    });
  } catch {
    // soft-fail
  }

  return { ok: true as const, mode: "api_key" as const, connection };
}

export async function completeOAuthConnect(input: {
  workspaceId: string;
  userId: string;
  providerSlug: string;
  code: string;
}) {
  const connector = getConnector(input.providerSlug);
  if (!connector?.exchangeCode) {
    throw new Error("OAuth exchange not supported");
  }
  const tokens = await connector.exchangeCode(input.code);
  const provider = await db.query.integrationProviders.findFirst({
    where: eq(integrationProviders.slug, input.providerSlug),
  });
  const connection = await upsertConnection({
    workspaceId: input.workspaceId,
    providerSlug: input.providerSlug,
    status: "connected",
    permissions: provider?.scopes ?? [],
    userId: input.userId,
  });
  await storeCredentials(connection.id, tokens);
  await writeIntegrationAudit({
    workspaceId: input.workspaceId,
    actorUserId: input.userId,
    action: "oauth_complete",
    providerSlug: input.providerSlug,
    connectionId: connection.id,
  });
  await syncConnection({
    workspaceId: input.workspaceId,
    userId: input.userId,
    providerSlug: input.providerSlug,
  });
  return connection;
}

export async function disconnectIntegration(input: {
  workspaceId: string;
  userId: string;
  providerSlug: string;
}) {
  const existing = await db.query.integrationConnections.findFirst({
    where: and(
      eq(integrationConnections.workspaceId, input.workspaceId),
      eq(integrationConnections.providerSlug, input.providerSlug),
    ),
  });
  if (!existing) {
    return { ok: false as const, error: "Not connected", status: 404 as const };
  }

  const connector = getConnector(input.providerSlug);
  const creds = await loadCredentials(existing.id).catch(() => null);
  if (connector?.disconnect) {
    try {
      await connector.disconnect({
        workspaceId: input.workspaceId,
        connectionId: existing.id,
        providerSlug: input.providerSlug,
        credentials: creds,
      });
    } catch {
      // soft-fail revoke
    }
  }

  await db
    .delete(integrationCredentials)
    .where(eq(integrationCredentials.connectionId, existing.id));

  await db
    .update(integrationConnections)
    .set({
      status: "disconnected",
      lastError: null,
      normalizedSnapshot: null,
      healthScore: null,
      updatedAt: new Date(),
    })
    .where(eq(integrationConnections.id, existing.id));

  await writeIntegrationAudit({
    workspaceId: input.workspaceId,
    actorUserId: input.userId,
    action: "disconnect",
    providerSlug: input.providerSlug,
    connectionId: existing.id,
  });

  return { ok: true as const };
}

export async function syncConnection(input: {
  workspaceId: string;
  userId?: string;
  providerSlug: string;
}) {
  const existing = await db.query.integrationConnections.findFirst({
    where: and(
      eq(integrationConnections.workspaceId, input.workspaceId),
      eq(integrationConnections.providerSlug, input.providerSlug),
    ),
  });
  if (!existing || existing.status === "disconnected") {
    return { ok: false as const, error: "Not connected", status: 404 as const };
  }

  const connector = getConnector(input.providerSlug);
  if (!connector) {
    return { ok: false as const, error: "Connector missing", status: 500 as const };
  }

  try {
    const creds = await loadCredentials(existing.id);
    const raw = await connector.fetchRaw({
      workspaceId: input.workspaceId,
      connectionId: existing.id,
      providerSlug: input.providerSlug,
      credentials: creds,
    });
    const normalized = connector.normalize(raw);
    const hasError = normalized.warnings.some((w) =>
      /error|fail/i.test(w),
    );
    await db
      .update(integrationConnections)
      .set({
        status: hasError ? "error" : "connected",
        lastSyncAt: new Date(),
        lastError: hasError ? normalized.warnings[0] : null,
        normalizedSnapshot: normalized,
        healthScore: hasError ? 40 : 85,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, existing.id));

    await writeIntegrationAudit({
      workspaceId: input.workspaceId,
      actorUserId: input.userId ?? null,
      action: "sync",
      providerSlug: input.providerSlug,
      connectionId: existing.id,
      meta: { warnings: normalized.warnings },
    });

    return { ok: true as const, snapshot: normalized };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(integrationConnections)
      .set({
        status: "error",
        lastError: message,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, existing.id));
    await writeIntegrationAudit({
      workspaceId: input.workspaceId,
      actorUserId: input.userId ?? null,
      action: "sync_error",
      providerSlug: input.providerSlug,
      connectionId: existing.id,
      meta: { error: message },
    });
    return { ok: false as const, error: message, status: 500 as const };
  }
}
