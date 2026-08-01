import type {
  IntegrationAuthType,
  IntegrationCategory,
  IntegrationCredentialPayload,
  NormalizedIntegrationData,
} from "@/db/schema";

export type TokenBundle = IntegrationCredentialPayload;

export type ConnectionContext = {
  workspaceId: string;
  connectionId: string;
  providerSlug: string;
  credentials: IntegrationCredentialPayload | null;
};

export type IntegrationConnector = {
  slug: string;
  category: IntegrationCategory;
  authType: IntegrationAuthType;
  getAuthUrl?: (state: string) => string;
  exchangeCode?: (code: string) => Promise<TokenBundle>;
  validateCredentials?: (creds: IntegrationCredentialPayload) => Promise<boolean>;
  fetchRaw: (ctx: ConnectionContext) => Promise<unknown>;
  normalize: (raw: unknown) => NormalizedIntegrationData;
  disconnect?: (ctx: ConnectionContext) => Promise<void>;
};

export function emptyNormalized(
  provider: string,
  category: IntegrationCategory,
  warnings: string[] = [],
): NormalizedIntegrationData {
  return {
    provider,
    category,
    metrics: {},
    entities: [],
    freshness: null,
    warnings,
  };
}
