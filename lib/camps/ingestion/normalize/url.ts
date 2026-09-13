/**
 * URL normalization for extracted links.
 *
 * Produces both the resolved absolute URL (what a parent would click) and the
 * canonical form (what ingestion uses for identity). Non-web schemes are kept
 * as stated but get no canonical identity, so a `mailto:` registration contact
 * never collides with a page.
 */

import { tryCanonicalizeSourceUrl } from "@/lib/camps/ingestion/canonicalizeUrl";
import {
  normalizationFailure,
  type NormalizationResult,
} from "@/lib/camps/ingestion/normalize/types";

export type NormalizedUrl = {
  url: string | null;
  canonicalUrl: string | null;
};

const EMPTY: NormalizedUrl = { url: null, canonicalUrl: null };

export type NormalizeUrlOptions = {
  /** Page URL used to resolve relative hrefs. */
  baseUrl?: string | null;
};

export function normalizeUrl(
  rawInput: string,
  options: NormalizeUrlOptions = {},
): NormalizationResult<NormalizedUrl> {
  const raw = rawInput.trim();
  if (raw === "") return normalizationFailure(raw, EMPTY, "url_not_stated");
  if (raw.startsWith("#")) return normalizationFailure(raw, EMPTY, "url_is_fragment_only");
  if (/^(?:javascript|data|vbscript):/i.test(raw)) {
    return normalizationFailure(raw, EMPTY, "unsupported_url_scheme");
  }

  const warnings: string[] = [];
  let absolute: URL;
  try {
    absolute = options.baseUrl ? new URL(raw, options.baseUrl) : new URL(raw);
    if (options.baseUrl && !/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      warnings.push("resolved_against_base_url");
    }
  } catch {
    return normalizationFailure(raw, EMPTY, "url_not_parseable");
  }

  if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
    return {
      value: { url: absolute.toString(), canonicalUrl: null },
      raw,
      confidence: 0.6,
      warnings: [...warnings, "non_http_url"],
    };
  }

  const canonicalUrl = tryCanonicalizeSourceUrl(absolute.toString());
  return {
    value: { url: absolute.toString(), canonicalUrl },
    raw,
    confidence: 0.95,
    warnings,
  };
}
