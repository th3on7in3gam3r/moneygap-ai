import type { IntegrationCredentialPayload, NormalizedIntegrationData } from "@/db/schema";
import type {
  ConnectionContext,
  IntegrationConnector,
  TokenBundle,
} from "@/lib/integrations/types";
import { emptyNormalized } from "@/lib/integrations/types";

function appUrl(): string {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function createStubConnector(input: {
  slug: string;
  category: IntegrationConnector["category"];
  authType: IntegrationConnector["authType"];
}): IntegrationConnector {
  return {
    slug: input.slug,
    category: input.category,
    authType: input.authType,
    validateCredentials: async (creds) =>
      Boolean(creds.apiKey || creds.accessToken),
    fetchRaw: async () => ({
      stub: true,
      message: `${input.slug} connector is registered; live sync not yet enabled.`,
    }),
    normalize: (raw): NormalizedIntegrationData =>
      emptyNormalized(input.slug, input.category, [
        typeof raw === "object" && raw && "message" in raw
          ? String((raw as { message: string }).message)
          : "Stub connector — configure live sync later.",
      ]),
  };
}

export const githubConnector: IntegrationConnector = {
  slug: "github",
  category: "developer",
  authType: "oauth2",
  getAuthUrl(state: string) {
    const clientId = process.env.GITHUB_INTEGRATION_CLIENT_ID;
    if (!clientId) {
      throw new Error("GITHUB_INTEGRATION_CLIENT_ID is not configured");
    }
    const redirect = `${appUrl()}/api/integrations/oauth/github/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      scope: "read:user repo",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode(code: string): Promise<TokenBundle> {
    const clientId = process.env.GITHUB_INTEGRATION_CLIENT_ID;
    const clientSecret = process.env.GITHUB_INTEGRATION_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("GitHub OAuth env not configured");
    }
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    if (!res.ok) throw new Error("GitHub token exchange failed");
    const data = (await res.json()) as {
      access_token?: string;
      error?: string;
    };
    if (!data.access_token) {
      throw new Error(data.error ?? "GitHub did not return an access token");
    }
    return { accessToken: data.access_token };
  },
  async fetchRaw(ctx: ConnectionContext) {
    const token = ctx.credentials?.accessToken;
    if (!token) return { warning: "No access token" };
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "MoneyGap-Integration-Hub",
      },
    });
    if (!res.ok) {
      return { error: `GitHub API ${res.status}` };
    }
    return res.json();
  },
  normalize(raw: unknown): NormalizedIntegrationData {
    const user = raw as { login?: string; id?: number; public_repos?: number };
    if (!user?.login) {
      return emptyNormalized("github", "developer", ["Could not load GitHub user"]);
    }
    return {
      provider: "github",
      category: "developer",
      metrics: { publicRepos: user.public_repos ?? 0 },
      entities: [{ type: "user", label: user.login, id: String(user.id ?? "") }],
      freshness: new Date().toISOString(),
      warnings: [],
    };
  },
};

export const stripeConnector: IntegrationConnector = {
  slug: "stripe",
  category: "payments",
  authType: "api_key",
  async validateCredentials(creds: IntegrationCredentialPayload) {
    return Boolean(creds.apiKey?.startsWith("sk_") || creds.apiKey?.startsWith("rk_"));
  },
  async fetchRaw(ctx: ConnectionContext) {
    const key = ctx.credentials?.apiKey;
    if (!key) return { warning: "No API key" };
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return { error: `Stripe API ${res.status}` };
    }
    return res.json();
  },
  normalize(raw: unknown): NormalizedIntegrationData {
    const bal = raw as {
      available?: { amount: number; currency: string }[];
      error?: string;
      warning?: string;
    };
    if (bal.error || bal.warning) {
      return emptyNormalized("stripe", "payments", [
        bal.error ?? bal.warning ?? "Stripe sync issue",
      ]);
    }
    const available = bal.available?.[0];
    return {
      provider: "stripe",
      category: "payments",
      metrics: available
        ? {
            availableMinor: available.amount,
            currency: available.currency,
          }
        : {},
      entities: [],
      freshness: new Date().toISOString(),
      warnings: [],
    };
  },
};

/** HubSpot — OAuth for customers; Private App `pat-` token still works as fallback. */
export const hubspotConnector: IntegrationConnector = {
  slug: "hubspot",
  category: "crm",
  authType: "oauth2",
  getAuthUrl(state: string) {
    const clientId = process.env.HUBSPOT_INTEGRATION_CLIENT_ID?.trim();
    if (!clientId) {
      throw new Error(
        "HUBSPOT_INTEGRATION_CLIENT_ID is not configured (create a HubSpot Legacy App)",
      );
    }
    const redirect = `${appUrl()}/api/integrations/oauth/hubspot/callback`;
    const scope =
      process.env.HUBSPOT_INTEGRATION_SCOPES?.trim() ||
      "crm.objects.contacts.read";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      scope,
      state,
    });
    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode(code: string): Promise<TokenBundle> {
    const clientId = process.env.HUBSPOT_INTEGRATION_CLIENT_ID?.trim();
    const clientSecret = process.env.HUBSPOT_INTEGRATION_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new Error("HubSpot OAuth env not configured");
    }
    const redirect = `${appUrl()}/api/integrations/oauth/hubspot/callback`;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      code,
    });
    const res = await fetch("https://api.hubapi.com/oauth/v3/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      message?: string;
      status?: string;
    };
    if (!res.ok || !data.access_token) {
      throw new Error(
        data.message ?? data.status ?? "HubSpot token exchange failed",
      );
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined,
    };
  },
  async validateCredentials(creds: IntegrationCredentialPayload) {
    const token = creds.accessToken || creds.apiKey;
    return Boolean(token && token.length >= 20);
  },
  async fetchRaw(ctx: ConnectionContext) {
    const token = ctx.credentials?.accessToken || ctx.credentials?.apiKey;
    if (!token) return { warning: "No HubSpot access token" };

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    const [contactsRes, accountRes] = await Promise.all([
      fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts?limit=5&archived=false",
        { headers },
      ),
      fetch("https://api.hubapi.com/account-info/v3/details", { headers }),
    ]);

    const contactsJson = contactsRes.ok
      ? ((await contactsRes.json()) as {
          total?: number;
          results?: {
            id: string;
            properties?: { email?: string; firstname?: string };
          }[];
        })
      : { error: `Contacts API ${contactsRes.status}` };

    const accountJson = accountRes.ok
      ? ((await accountRes.json()) as {
          portalId?: number;
          accountType?: string;
          timeZone?: string;
          companyCurrency?: string;
        })
      : null;

    if (!contactsRes.ok) {
      return {
        error:
          typeof contactsJson === "object" &&
          contactsJson &&
          "error" in contactsJson
            ? String((contactsJson as { error: string }).error)
            : `HubSpot API ${contactsRes.status}`,
      };
    }

    return {
      account: accountJson,
      contacts: contactsJson,
    };
  },
  normalize(raw: unknown): NormalizedIntegrationData {
    const data = raw as {
      error?: string;
      warning?: string;
      account?: { portalId?: number; accountType?: string };
      contacts?: {
        total?: number;
        results?: {
          id: string;
          properties?: { email?: string; firstname?: string };
        }[];
      };
    };
    if (data.error || data.warning) {
      return emptyNormalized("hubspot", "crm", [
        data.error ?? data.warning ?? "HubSpot sync issue",
      ]);
    }
    const results = data.contacts?.results ?? [];
    return {
      provider: "hubspot",
      category: "crm",
      metrics: {
        contactSample: results.length,
        ...(data.contacts?.total != null
          ? { contactTotal: data.contacts.total }
          : {}),
        ...(data.account?.portalId != null
          ? { portalId: data.account.portalId }
          : {}),
      },
      entities: results.slice(0, 5).map((c) => ({
        type: "contact",
        id: c.id,
        label:
          [c.properties?.firstname, c.properties?.email]
            .filter(Boolean)
            .join(" · ") || `Contact ${c.id}`,
      })),
      freshness: new Date().toISOString(),
      warnings:
        results.length === 0
          ? ["Connected — no contacts returned yet (empty CRM is OK)."]
          : [],
    };
  },
};

export function createApiKeyConnector(input: {
  slug: string;
  category: IntegrationConnector["category"];
}): IntegrationConnector {
  return {
    slug: input.slug,
    category: input.category,
    authType: "api_key",
    validateCredentials: async (creds) => Boolean(creds.apiKey && creds.apiKey.length >= 8),
    fetchRaw: async () => ({
      stub: true,
      message: `${input.slug} API key stored; live fetch not yet enabled.`,
    }),
    normalize: (raw) =>
      emptyNormalized(input.slug, input.category, [
        typeof raw === "object" && raw && "message" in raw
          ? String((raw as { message: string }).message)
          : "API key connected — live sync pending.",
      ]),
  };
}

/** Cadence Pulse — website collect key (`pck_…`) from the Cadence install snippet. */
export const cadencePulseConnector: IntegrationConnector = {
  slug: "cadence_pulse",
  category: "analytics",
  authType: "api_key",
  async validateCredentials(creds: IntegrationCredentialPayload) {
    const key = creds.apiKey?.trim() ?? "";
    return /^pck_[A-Za-z0-9_-]{8,}$/.test(key);
  },
  async fetchRaw() {
    return {
      ok: true,
      message: "Cadence Pulse collect key stored for site pixel + Hub health.",
    };
  },
  normalize(raw: unknown): NormalizedIntegrationData {
    const body = raw as { message?: string };
    return {
      provider: "cadence_pulse",
      category: "analytics",
      metrics: { collectKeyConfigured: 1 },
      entities: [],
      freshness: new Date().toISOString(),
      warnings: body.message ? [] : ["Collect key connected."],
    };
  },
};

