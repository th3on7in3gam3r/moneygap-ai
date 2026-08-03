import type { GrowthBadgeStyle, GrowthBadgeStatus } from "@/db/schema";

export type { GrowthBadgeStyle, GrowthBadgeStatus };

export type GrowthBadgeDto = {
  id: string;
  publicId: string;
  workspaceId: string;
  websiteId: string;
  style: GrowthBadgeStyle;
  status: GrowthBadgeStatus;
  issuedAt: string;
  revokedAt: string | null;
  domain: string;
  websiteUrl: string;
  websiteName: string;
  moneyGapScore: number | null;
  reportId: string | null;
  analyzedAt: string | null;
  beforeScore: number | null;
  afterScore: number | null;
  improvementPoints: number | null;
  styleLabel: string;
  verifyUrl: string;
  svgUrl: string;
  embedHtml: string;
};

export type GrowthJourney = {
  beforeScore: number | null;
  afterScore: number | null;
  improvementPoints: number | null;
  improvementPercent: number | null;
};

export type VerifyBadgePayload = {
  publicId: string;
  verified: boolean;
  status: GrowthBadgeStatus;
  style: GrowthBadgeStyle;
  styleLabel: string;
  websiteName: string;
  domain: string;
  websiteUrl: string;
  moneyGapScore: number | null;
  analyzedAt: string | null;
  issuedAt: string;
  journey: GrowthJourney;
  disclaimer: string;
};
