/**
 * The only supported access path to DEV-ONLY ingestion fixtures.
 *
 * Mirrors `lib/camps/devFixtures.ts` for the published catalog: a soft loader
 * that returns null in production and a hard loader that throws. Ingestion
 * fixtures describe lifecycle scenarios (changed, unchanged, new, ambiguous,
 * blocked, failed) — they are never parent-facing catalog data.
 */

import {
  buildIngestionFixturesBundle,
  type IngestionFixturesBundle,
} from "@/data/camps/ingestion/fixtures";
import {
  areIngestionDevFixturesAllowed,
  assertIngestionDevOnly,
} from "@/lib/camps/ingestion/devGate";

export type { IngestionFixturesBundle };

/** Soft gate: null in production, fixture bundle otherwise. */
export function loadIngestionDevFixtures(): IngestionFixturesBundle | null {
  if (!areIngestionDevFixturesAllowed()) return null;
  return buildIngestionFixturesBundle();
}

/** Hard gate: throws in production so accidental use fails loudly. */
export function requireIngestionDevFixtures(): IngestionFixturesBundle {
  assertIngestionDevOnly("Camps ingestion fixtures");
  return buildIngestionFixturesBundle();
}

/** True only when the enforceable gate would allow fixture access. */
export function areIngestionFixturesAvailable(): boolean {
  return areIngestionDevFixturesAllowed();
}
