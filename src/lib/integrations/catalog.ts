import type {
  IntegrationAuthType,
  IntegrationCategory,
  IntegrationProviderStatus,
} from "@/db/schema";

export type SeedProvider = {
  slug: string;
  name: string;
  category: IntegrationCategory;
  authType: IntegrationAuthType;
  scopes: string[];
  status: IntegrationProviderStatus;
  description: string;
  sortOrder: number;
  meta?: Record<string, unknown>;
};

function p(
  category: IntegrationCategory,
  items: Omit<SeedProvider, "category" | "sortOrder">[],
  baseOrder: number,
): SeedProvider[] {
  return items.map((item, i) => ({
    ...item,
    category,
    sortOrder: baseOrder + i,
  }));
}

export const SEED_INTEGRATION_PROVIDERS: SeedProvider[] = [
  ...p(
    "analytics",
    [
      {
        slug: "google_analytics",
        name: "Google Analytics",
        authType: "oauth2",
        scopes: ["analytics.readonly"],
        status: "available",
        description: "Traffic, conversions, and audience analytics.",
      },
      {
        slug: "google_search_console",
        name: "Google Search Console",
        authType: "oauth2",
        scopes: ["webmasters.readonly"],
        status: "available",
        description: "Search queries, impressions, and indexing.",
      },
      {
        slug: "microsoft_clarity",
        name: "Microsoft Clarity",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Session recordings and heatmaps.",
      },
    ],
    10,
  ),
  ...p(
    "crm",
    [
      {
        slug: "hubspot",
        name: "HubSpot",
        authType: "oauth2",
        scopes: ["crm.objects.contacts.read"],
        status: "available",
        description: "CRM contacts via Connect with HubSpot (OAuth).",
      },
      {
        slug: "salesforce",
        name: "Salesforce",
        authType: "oauth2",
        scopes: ["api"],
        status: "available",
        description: "Enterprise CRM objects and opportunities.",
      },
      {
        slug: "zoho_crm",
        name: "Zoho CRM",
        authType: "oauth2",
        scopes: ["ZohoCRM.modules.READ"],
        status: "available",
        description: "Zoho CRM modules and leads.",
      },
      {
        slug: "pipedrive",
        name: "Pipedrive",
        authType: "oauth2",
        scopes: ["deals:read", "persons:read"],
        status: "available",
        description: "Sales pipeline and activities.",
      },
    ],
    20,
  ),
  ...p(
    "email",
    [
      {
        slug: "mailchimp",
        name: "Mailchimp",
        authType: "oauth2",
        scopes: ["audiences:read"],
        status: "available",
        description: "Email lists and campaigns.",
      },
      {
        slug: "kit",
        name: "Kit",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Creator email marketing (ConvertKit).",
      },
      {
        slug: "beehiiv",
        name: "Beehiiv",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Newsletter subscribers and publications.",
      },
      {
        slug: "resend",
        name: "Resend",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Transactional email delivery.",
      },
      {
        slug: "activecampaign",
        name: "ActiveCampaign",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Marketing automation and CRM.",
      },
    ],
    30,
  ),
  ...p(
    "cms",
    [
      {
        slug: "wordpress",
        name: "WordPress",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Posts, pages, and site structure.",
      },
      {
        slug: "webflow",
        name: "Webflow",
        authType: "oauth2",
        scopes: ["sites:read"],
        status: "available",
        description: "Webflow sites and CMS collections.",
      },
      {
        slug: "shopify",
        name: "Shopify",
        authType: "oauth2",
        scopes: ["read_products", "read_orders"],
        status: "available",
        description: "Store products, orders, and customers.",
      },
      {
        slug: "wix",
        name: "Wix",
        authType: "oauth2",
        scopes: ["read"],
        status: "available",
        description: "Wix site content and contacts.",
      },
      {
        slug: "squarespace",
        name: "Squarespace",
        authType: "oauth2",
        scopes: ["website.products", "website.orders"],
        status: "available",
        description: "Squarespace commerce and content.",
      },
    ],
    40,
  ),
  ...p(
    "developer",
    [
      {
        slug: "github",
        name: "GitHub",
        authType: "oauth2",
        scopes: ["read:user", "repo"],
        status: "available",
        description: "Repos and deployment activity.",
        meta: { reference: true },
      },
      {
        slug: "gitlab",
        name: "GitLab",
        authType: "oauth2",
        scopes: ["read_api"],
        status: "available",
        description: "Projects and pipelines.",
      },
      {
        slug: "bitbucket",
        name: "Bitbucket",
        authType: "oauth2",
        scopes: ["repository"],
        status: "available",
        description: "Repositories and pull requests.",
      },
    ],
    50,
  ),
  ...p(
    "hosting",
    [
      {
        slug: "vercel",
        name: "Vercel",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Deployments and project domains.",
      },
      {
        slug: "render",
        name: "Render",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Services and deploy status.",
      },
      {
        slug: "netlify",
        name: "Netlify",
        authType: "oauth2",
        scopes: ["read"],
        status: "available",
        description: "Sites and deploy previews.",
      },
      {
        slug: "railway",
        name: "Railway",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Projects and service health.",
      },
      {
        slug: "cloudflare_pages",
        name: "Cloudflare Pages",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Pages projects and deployments.",
      },
    ],
    60,
  ),
  ...p(
    "payments",
    [
      {
        slug: "stripe",
        name: "Stripe",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Customer’s Stripe account (not MoneyGap billing).",
        meta: { reference: true, distinctFromBilling: true },
      },
      {
        slug: "paddle",
        name: "Paddle",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Subscriptions and transactions.",
      },
    ],
    70,
  ),
  ...p(
    "automation",
    [
      {
        slug: "zapier",
        name: "Zapier",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Zap history and connected apps.",
      },
      {
        slug: "make",
        name: "Make",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Scenarios and execution logs.",
      },
      {
        slug: "n8n",
        name: "n8n",
        authType: "api_key",
        scopes: ["read"],
        status: "available",
        description: "Workflows and execution status.",
      },
    ],
    80,
  ),
];
