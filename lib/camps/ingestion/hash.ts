/**
 * Content hashing for camp source change detection.
 *
 * The hash is the cheap gate in front of extraction: identical content means
 * the extractor, matcher, and review queue are all skipped. Hashing normalizes
 * incidental noise (line endings, trailing whitespace, repeated blank lines)
 * so a source that re-renders the same facts does not look "changed".
 *
 * Volatile markup (CSRF tokens, session ids, cache busters, timestamps) is
 * intentionally NOT stripped here — that belongs to the HTML cleaner. Hash
 * over what was fetched; clean before extracting.
 */

import { createHash } from "node:crypto";

/** Prefix keeps stored hashes self-describing if the algorithm ever changes. */
const HASH_ALGORITHM = "sha256";

/** Normalize incidental formatting so equivalent renders hash identically. */
export function normalizeContentForHash(content: string): string {
  return content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Stable content hash, e.g. `sha256:9f86d0…`. */
export function hashSourceContent(content: string): string {
  const digest = createHash(HASH_ALGORITHM)
    .update(normalizeContentForHash(content), "utf8")
    .digest("hex");
  return `${HASH_ALGORITHM}:${digest}`;
}

/**
 * True when two hashes (or two content strings hashed here) are equivalent.
 * Missing values are never "unchanged" — an unknown previous state must fall
 * through to extraction rather than silently skipping a source.
 */
export function sourceContentUnchanged(
  previous: string | null | undefined,
  next: string | null | undefined,
): boolean {
  if (!previous || !next) return false;
  return toHash(previous) === toHash(next);
}

/** Accepts either an already-hashed value or raw content. */
function toHash(value: string): string {
  return value.startsWith(`${HASH_ALGORITHM}:`) ? value : hashSourceContent(value);
}

/** Short display form for admin tables and logs. */
export function shortHash(hash: string | null | undefined): string {
  if (!hash) return "—";
  const digest = hash.includes(":") ? hash.slice(hash.indexOf(":") + 1) : hash;
  return digest.slice(0, 12);
}
