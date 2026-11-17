/**
 * One token per batch. It stops working when the batch is published, or 30 days
 * after it was created. A wrong token never opens the page.
 */
import type { CampListing } from "@/lib/camps/pages/types";

export type BatchToken = {
  batch: number;
  token: string;
  createdOn: string;
};

export type PreviewDecision = "ok" | "wrong" | "expired";

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The first day the token is no longer valid. */
export function tokenExpiresOn(createdOn: string): string {
  return addDays(createdOn, 30);
}

export function previewAccess(input: {
  batch: BatchToken | null;
  supplied: string | null | undefined;
  today: string;
  /** Set when Publish batch has run. */
  publishedOn: string | null;
}): PreviewDecision {
  if (!input.batch) return "wrong";
  const supplied = (input.supplied ?? "").trim();
  if (!supplied || supplied !== input.batch.token || supplied.length < 32) return "wrong";
  if (input.publishedOn) return "expired";
  if (input.today >= tokenExpiresOn(input.batch.createdOn)) return "expired";
  return "ok";
}

export function previewPath(listing: CampListing, token: string): string {
  return `/camps/preview/${listing.slug}?t=${encodeURIComponent(token)}`;
}
