import type { GrowthDigestPayload } from "@/lib/email/types";

/**
 * Abstraction for digest body content. v1 = rule-based.
 * Future: OpenAIDigestContentProvider implementing the same interface.
 */
export type DigestContentProvider = {
  buildForUser(input: {
    userId: string;
    workspaceId: string;
    unsubscribeToken: string;
  }): Promise<GrowthDigestPayload | null>;
};
