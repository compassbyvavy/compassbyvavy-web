/**
 * Enforceable production safeguard for Indoor Play development fixtures.
 *
 * Comments and DEV_ONLY markers in fixtures.dev.ts are not enough — callers
 * must load fixtures through this gate. Public Discover play stays
 * coming_soon; this module is the only supported access path for UI previews.
 */

import {
  DEV_ONLY_INDOOR_PLAY_FIXTURES,
  indoorPlayDevVenues,
} from "@/data/play/fixtures.dev";
import type { IndoorPlayVenue } from "@/data/play/types";
import {
  PLAY_REVIEW_PREVIEW_FLAG,
  isPlayReviewPreviewEnabled,
} from "@/lib/play/reviewPreviewGate";

export type IndoorPlayDevFixturesBundle = {
  DEV_ONLY_INDOOR_PLAY_FIXTURES: true;
  venues: IndoorPlayVenue[];
};

export type IndoorPlayDevFixtureLoadOptions = {
  allowReviewPreview?: boolean;
  hostname?: string | null;
  nodeEnv?: string;
  reviewFlag?: string | null;
};

function isProductionNodeEnv(nodeEnv?: string): boolean {
  return (nodeEnv ?? process.env.NODE_ENV) === "production";
}

function bundle(): IndoorPlayDevFixturesBundle {
  return {
    DEV_ONLY_INDOOR_PLAY_FIXTURES,
    venues: indoorPlayDevVenues,
  };
}

/**
 * Soft gate: null in production unless the Cloudflare review-preview dual
 * gate is on. Public Discover play stays coming_soon either way.
 */
export function loadIndoorPlayDevFixtures(
  options: IndoorPlayDevFixtureLoadOptions = {},
): IndoorPlayDevFixturesBundle | null {
  const reviewPreview =
    options.allowReviewPreview ??
    isPlayReviewPreviewEnabled({
      reviewFlag:
        options.reviewFlag !== undefined
          ? options.reviewFlag
          : process.env[PLAY_REVIEW_PREVIEW_FLAG],
      hostname: options.hostname,
    });
  if (isProductionNodeEnv(options.nodeEnv) && !reviewPreview) return null;
  return bundle();
}

export function areIndoorPlayDevFixturesAllowed(): boolean {
  return !isProductionNodeEnv();
}
