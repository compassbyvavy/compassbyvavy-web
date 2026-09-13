/**
 * Shared shape for normalizers.
 *
 * Every normalizer returns the raw source text alongside whatever it managed to
 * parse, plus warnings for anything it had to assume. A failed parse yields
 * nulls and keeps `raw` — an unreadable fact stays visible to reviewers instead
 * of disappearing or being invented.
 */

export type NormalizationResult<T> = {
  value: T;
  /** Exactly what the source stated, trimmed. */
  raw: string;
  /** 0…1 confidence in `value`. 0 means nothing was parsed. */
  confidence: number;
  /** Machine-readable notes: assumptions made, units rejected, parse failures. */
  warnings: string[];
};

export function normalizationFailure<T>(
  raw: string,
  emptyValue: T,
  warning: string,
): NormalizationResult<T> {
  return { value: emptyValue, raw: raw.trim(), confidence: 0, warnings: [warning] };
}
