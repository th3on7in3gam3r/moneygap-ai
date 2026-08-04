import path from "node:path";
import { pathExists, readJson } from "../utils/fs.js";
import type { FrameworkInfo } from "../types/index.js";

type Detector = {
  id: string;
  name: string;
  deps: string[];
  configFiles: string[];
};

const DETECTORS: Detector[] = [
  {
    id: "next",
    name: "Next.js",
    deps: ["next"],
    configFiles: ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.mts"],
  },
  {
    id: "nuxt",
    name: "Nuxt",
    deps: ["nuxt"],
    configFiles: ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"],
  },
  {
    id: "remix",
    name: "Remix",
    deps: ["@remix-run/react", "@remix-run/node"],
    configFiles: ["remix.config.js", "vite.config.ts"],
  },
  {
    id: "astro",
    name: "Astro",
    deps: ["astro"],
    configFiles: ["astro.config.mjs", "astro.config.ts", "astro.config.js"],
  },
  {
    id: "sveltekit",
    name: "SvelteKit",
    deps: ["@sveltejs/kit"],
    configFiles: ["svelte.config.js", "svelte.config.ts"],
  },
  {
    id: "angular",
    name: "Angular",
    deps: ["@angular/core"],
    configFiles: ["angular.json"],
  },
  {
    id: "vite",
    name: "Vite",
    deps: ["vite"],
    configFiles: ["vite.config.ts", "vite.config.js", "vite.config.mjs"],
  },
  {
    id: "vue",
    name: "Vue",
    deps: ["vue"],
    configFiles: [],
  },
  {
    id: "react",
    name: "React",
    deps: ["react"],
    configFiles: [],
  },
];

function depVersion(
  pkg: Record<string, unknown> | null,
  name: string,
): string | null {
  if (!pkg) return null;
  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };
  const v = deps[name];
  return v ? v.replace(/^[\^~>=<\s]+/, "") : null;
}

export async function detectFramework(
  projectRoot: string,
): Promise<FrameworkInfo> {
  const pkg = await readJson<Record<string, unknown>>(
    path.join(projectRoot, "package.json"),
  );

  for (const d of DETECTORS) {
    const hasDep = d.deps.some((dep) => depVersion(pkg, dep));
    let hasConfig = false;
    for (const f of d.configFiles) {
      if (await pathExists(path.join(projectRoot, f))) {
        hasConfig = true;
        break;
      }
    }
    if (hasDep || (hasConfig && d.id !== "vite" && d.id !== "react")) {
      // Prefer stronger signals: next before react/vite
      if (d.id === "vite" || d.id === "react" || d.id === "vue") {
        // defer — check if a stronger framework already matched; we iterate in priority order
      }
      const version = depVersion(pkg, d.deps[0]!);
      if (hasDep || hasConfig) {
        // Skip generic react/vite/vue if a more specific framework is present
        if (d.id === "react" || d.id === "vite" || d.id === "vue") {
          const stronger = ["next", "nuxt", "remix", "astro", "sveltekit", "angular"];
          for (const s of stronger) {
            const sd = DETECTORS.find((x) => x.id === s)!;
            if (sd.deps.some((dep) => depVersion(pkg, dep))) {
              continue;
            }
          }
        }
        if (d.id === "react") {
          const hasNext = depVersion(pkg, "next");
          const hasRemix = depVersion(pkg, "@remix-run/react");
          if (hasNext || hasRemix) continue;
        }
        if (d.id === "vite") {
          if (
            depVersion(pkg, "next") ||
            depVersion(pkg, "nuxt") ||
            depVersion(pkg, "astro") ||
            depVersion(pkg, "@sveltejs/kit")
          ) {
            continue;
          }
        }
        if (d.id === "vue") {
          if (depVersion(pkg, "nuxt")) continue;
        }
        return { id: d.id, name: d.name, version };
      }
    }
  }

  return { id: "unknown", name: "Unknown", version: null };
}
