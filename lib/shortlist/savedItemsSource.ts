/**
 * Saved-camp refs for features like Registration Tracker.
 *
 * Guest-local shortlist is the current source. Authenticated `saved_items`
 * can later return the same item shape — tracker and Saved UI should take a
 * SavedItemsSource rather than reading localStorage directly.
 */

import type { ShortlistItem, ShortlistState } from "@/lib/shortlist/types";

export type SavedItemsSourceKind = "guest_local" | "account_saved_items";

export type SavedItemsSource = {
  kind: SavedItemsSourceKind;
  items: ShortlistItem[];
};

export function guestLocalSavedItemsSource(
  state: Pick<ShortlistState, "items">,
): SavedItemsSource {
  return { kind: "guest_local", items: state.items };
}

/**
 * Adapter for a future account `saved_items` loader.
 * Callers map published refs into ShortlistItem[] — do not copy prices/names.
 */
export function accountSavedItemsSource(
  items: ShortlistItem[],
): SavedItemsSource {
  return { kind: "account_saved_items", items };
}
