import type {
  FixFlowFramework,
  FixFlowGitProvider,
  RepoContext,
} from "@/lib/fixflow/types";

export type RepoProvider = {
  id: FixFlowGitProvider;
  detectFramework: (input: {
    packageJson?: string | null;
    configFiles?: string[];
  }) => FixFlowFramework;
  listStructureHints: (paths: string[]) => string[];
  readManifests: (files: Record<string, string>) => {
    dependencies: Record<string, string>;
  };
  getRepoContext: (input: {
    fullName?: string;
    defaultBranch?: string;
    connected: boolean;
    packageJson?: string | null;
    paths?: string[];
    message?: string;
  }) => RepoContext;
};

export function frameworkFromStackLabel(
  frontend: string | null | undefined,
): FixFlowFramework {
  const f = (frontend ?? "").toLowerCase();
  if (f.includes("next")) return "Next.js";
  if (f.includes("astro")) return "Astro";
  if (f.includes("nuxt")) return "Nuxt";
  if (f.includes("remix")) return "Remix";
  if (f.includes("svelte")) return "SvelteKit";
  if (f.includes("vue")) return "Vue";
  if (f.includes("react")) return "React";
  return "Unknown";
}

export function detectFrameworkFromManifests(input: {
  packageJson?: string | null;
  configFiles?: string[];
}): FixFlowFramework {
  const configs = (input.configFiles ?? []).map((c) => c.toLowerCase());
  let deps: Record<string, string> = {};
  try {
    if (input.packageJson) {
      const pkg = JSON.parse(input.packageJson) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    }
  } catch {
    /* ignore */
  }
  if (deps.next || configs.some((c) => c.includes("next.config"))) return "Next.js";
  if (deps.astro || configs.some((c) => c.includes("astro.config"))) return "Astro";
  if (deps.nuxt || configs.some((c) => c.includes("nuxt.config"))) return "Nuxt";
  if (deps["@remix-run/react"] || configs.some((c) => c.includes("remix.config")))
    return "Remix";
  if (deps["@sveltejs/kit"] || configs.some((c) => c.includes("svelte.config")))
    return "SvelteKit";
  if (deps.vue || deps.nuxt) return deps.nuxt ? "Nuxt" : "Vue";
  if (deps.react) return "React";
  return "Unknown";
}

function parseDeps(packageJson?: string | null): Record<string, string> {
  try {
    if (!packageJson) return {};
    const pkg = JSON.parse(packageJson) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  } catch {
    return {};
  }
}

export const baseRepoProviderHelpers = {
  detectFramework: detectFrameworkFromManifests,
  listStructureHints(paths: string[]): string[] {
    return paths.slice(0, 40);
  },
  readManifests(files: Record<string, string>) {
    return { dependencies: parseDeps(files["package.json"]) };
  },
};

export function createGitlabStubProvider(): RepoProvider {
  return {
    id: "gitlab",
    ...baseRepoProviderHelpers,
    getRepoContext(input) {
      return {
        provider: "gitlab",
        fullName: input.fullName ?? "",
        defaultBranch: input.defaultBranch ?? "main",
        framework: detectFrameworkFromManifests({
          packageJson: input.packageJson,
          configFiles: input.paths,
        }),
        structureHints: input.paths?.slice(0, 20) ?? [],
        dependencies: parseDeps(input.packageJson),
        connected: false,
        message:
          input.message ??
          "GitLab is catalogued in Integration Hub but not connected for FixFlow yet.",
      };
    },
  };
}
