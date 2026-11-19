/**
 * Local stand-in for camp_invites and camp_submissions.
 * The migration is in supabase/migrations and is not applied on this branch.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { initialState } from "@/lib/camps/listingForm/fixtures";
import type { ListingState } from "@/lib/camps/listingForm/types";

function storePath(): string {
  return process.env.LISTING_FORM_STORE ?? path.join(process.cwd(), "data/camps/listing-form/state.json");
}

export function readListingState(): ListingState {
  const file = storePath();
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as ListingState;
    if (!parsed.invites) return initialState();
    return parsed;
  } catch {
    return initialState();
  }
}

export function writeListingState(state: ListingState): void {
  const file = storePath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
}
