import { detectFromPackageJson } from "../src/lib/developer/stack-detect";
import { requireExplicitAuthorize } from "../src/lib/developer/authz";

const nextStack = detectFromPackageJson(
  JSON.stringify({
    dependencies: {
      next: "15",
      react: "19",
      "drizzle-orm": "0.39",
      "@clerk/nextjs": "6",
      stripe: "17",
      resend: "4",
      openai: "4",
      tailwindcss: "4",
    },
  }),
);

if (nextStack.frontend !== "Next.js") {
  throw new Error(`expected Next.js, got ${nextStack.frontend}`);
}
if (nextStack.orm !== "Drizzle") throw new Error("expected Drizzle");
if (nextStack.auth !== "Clerk") throw new Error("expected Clerk");
if (nextStack.payments !== "Stripe") throw new Error("expected Stripe");
if (nextStack.confidence < 40) throw new Error("confidence too low");

const expressStack = detectFromPackageJson(
  JSON.stringify({
    dependencies: { express: "4", prisma: "6", "@prisma/client": "6" },
  }),
);
if (expressStack.backend !== "Express") throw new Error("expected Express");
if (expressStack.orm !== "Prisma") throw new Error("expected Prisma");

if (requireExplicitAuthorize({})) {
  throw new Error("authorize gate should reject missing authorize");
}
if (requireExplicitAuthorize({ authorize: false })) {
  throw new Error("authorize gate should reject false");
}
if (!requireExplicitAuthorize({ authorize: true })) {
  throw new Error("authorize gate should accept true");
}

console.log("stack-detect + authorize smoke OK", {
  nextConfidence: nextStack.confidence,
  expressConfidence: expressStack.confidence,
});
