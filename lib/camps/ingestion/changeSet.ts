/**
 * Field-level diffs between approved catalog values (CURRENT) and observed
 * source facts (PROPOSED).
 *
 * The change set is what a human reviews, so it must be explicit about what
 * kind of change is proposed: `added` (catalog had nothing), `changed` (both
 * sides have a value), `removed` (the source no longer states a fact Compass
 * publishes) and, when asked for, `unchanged`.
 *
 * A change set never mutates anything. It is evidence for review.
 */

import type { CampFieldChange, CampFieldChangeType } from "@/data/camps/ingestion/types";
import { clampConfidence } from "@/lib/camps/ingestion/confidence";

/**
 * Neutral MEDIUM default: without a per-field score from the extractor we do
 * not claim high certainty. Nothing publishes on confidence alone.
 */
export const DEFAULT_CHANGE_CONFIDENCE = 0.8;

export type GenerateChangeSetOptions = {
  /** Per-field extractor confidence, keyed by field name. */
  confidenceByField?: Record<string, number>;
  /** Fallback for fields absent from `confidenceByField`. */
  defaultConfidence?: number;
  /** Snapshot the proposed values were observed in — provenance for review. */
  sourceSnapshotId?: string | null;
  /** Include `unchanged` rows (useful for a full field audit view). */
  includeUnchanged?: boolean;
  /** Internal/plumbing keys that must never appear as catalog changes. */
  ignoreFields?: readonly string[];
};

type FieldRecord = Record<string, unknown>;

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => valuesEqual(item, b[index]));
  }

  const left = a as FieldRecord;
  const right = b as FieldRecord;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  if (leftKeys.some((key, index) => key !== rightKeys[index])) return false;
  return leftKeys.every((key) => valuesEqual(left[key], right[key]));
}

/** Field order: proposed fields first, then catalog-only fields. */
function orderedFieldNames(
  current: FieldRecord,
  proposed: FieldRecord,
  ignore: ReadonlySet<string>,
): string[] {
  const ordered: string[] = [];
  for (const key of Object.keys(proposed)) {
    if (!ignore.has(key)) ordered.push(key);
  }
  for (const key of Object.keys(current)) {
    if (!ignore.has(key) && !ordered.includes(key)) ordered.push(key);
  }
  return ordered;
}

function classify(
  hasCurrent: boolean,
  hasProposed: boolean,
  currentValue: unknown,
  proposedValue: unknown,
): CampFieldChangeType {
  if (!hasCurrent && hasProposed) return "added";
  if (hasCurrent && !hasProposed) return "removed";
  return valuesEqual(currentValue, proposedValue) ? "unchanged" : "changed";
}

/**
 * Build the CURRENT → PROPOSED diff. Pass `null`/`undefined` as `current` for a
 * brand-new record: every proposed field is reported as `added`.
 */
export function generateChangeSet(
  current: FieldRecord | null | undefined,
  proposed: FieldRecord | null | undefined,
  options: GenerateChangeSetOptions = {},
): CampFieldChange[] {
  const currentFields = current ?? {};
  const proposedFields = proposed ?? {};
  const ignore = new Set(options.ignoreFields ?? []);
  const fallback = options.defaultConfidence ?? DEFAULT_CHANGE_CONFIDENCE;

  const changes: CampFieldChange[] = [];
  for (const field of orderedFieldNames(currentFields, proposedFields, ignore)) {
    const hasCurrent =
      Object.prototype.hasOwnProperty.call(currentFields, field) &&
      currentFields[field] !== undefined;
    const hasProposed =
      Object.prototype.hasOwnProperty.call(proposedFields, field) &&
      proposedFields[field] !== undefined;
    if (!hasCurrent && !hasProposed) continue;

    const changeType = classify(
      hasCurrent,
      hasProposed,
      currentFields[field],
      proposedFields[field],
    );
    if (changeType === "unchanged" && !options.includeUnchanged) continue;

    changes.push({
      field,
      changeType,
      ...(hasCurrent ? { oldValue: currentFields[field] } : {}),
      ...(hasProposed ? { newValue: proposedFields[field] } : {}),
      confidence: clampConfidence(options.confidenceByField?.[field] ?? fallback),
      sourceSnapshotId: options.sourceSnapshotId ?? null,
    });
  }
  return changes;
}

/** True when the change set proposes at least one real edit. */
export function hasMaterialChanges(changes: readonly CampFieldChange[]): boolean {
  return changes.some((change) => change.changeType !== "unchanged");
}

export function materialChanges(changes: readonly CampFieldChange[]): CampFieldChange[] {
  return changes.filter((change) => change.changeType !== "unchanged");
}

export function changedFieldNames(changes: readonly CampFieldChange[]): string[] {
  return materialChanges(changes).map((change) => change.field);
}

/** Lowest confidence across the material changes (1 when nothing changed). */
export function changeSetConfidence(changes: readonly CampFieldChange[]): number {
  const material = materialChanges(changes);
  if (material.length === 0) return 1;
  return material.reduce((lowest, change) => Math.min(lowest, change.confidence), 1);
}
