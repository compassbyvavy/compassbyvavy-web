/**
 * Id factories for ingestion rows.
 *
 * Every stage that writes a row takes its id factory by injection so tests can
 * assert exact ids while production uses UUIDs (the Supabase tables use `uuid`
 * primary keys).
 */

import { randomUUID } from "node:crypto";

export type IdFactory = () => string;

export function newIngestionId(): string {
  return randomUUID();
}

/** Prefixed UUID — readable in logs, still unique (memory store / fixtures). */
export function createPrefixedIdFactory(prefix: string): IdFactory {
  return () => `${prefix}-${randomUUID()}`;
}

/** Deterministic ids for tests: `snap-1`, `snap-2`, … */
export function createSequentialIdFactory(prefix: string, start = 1): IdFactory {
  let next = start;
  return () => `${prefix}-${next++}`;
}
