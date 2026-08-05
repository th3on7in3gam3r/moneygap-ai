import { SEED_INTEGRATION_PROVIDERS } from "@/lib/integrations/catalog";
import {
  createApiKeyConnector,
  createStubConnector,
  cadencePulseConnector,
  githubConnector,
  hubspotConnector,
  stripeConnector,
} from "@/lib/integrations/connectors";
import type { IntegrationConnector } from "@/lib/integrations/types";

const REFERENCE: Record<string, IntegrationConnector> = {
  github: githubConnector,
  stripe: stripeConnector,
  hubspot: hubspotConnector,
  cadence_pulse: cadencePulseConnector,
};

let cache: Map<string, IntegrationConnector> | null = null;

export function getConnectorRegistry(): Map<string, IntegrationConnector> {
  if (cache) return cache;
  const map = new Map<string, IntegrationConnector>();
  for (const seed of SEED_INTEGRATION_PROVIDERS) {
    if (REFERENCE[seed.slug]) {
      map.set(seed.slug, REFERENCE[seed.slug]!);
      continue;
    }
    if (seed.authType === "api_key") {
      map.set(
        seed.slug,
        createApiKeyConnector({ slug: seed.slug, category: seed.category }),
      );
    } else {
      map.set(
        seed.slug,
        createStubConnector({
          slug: seed.slug,
          category: seed.category,
          authType: seed.authType,
        }),
      );
    }
  }
  cache = map;
  return map;
}

export function getConnector(slug: string): IntegrationConnector | null {
  return getConnectorRegistry().get(slug) ?? null;
}
