/**
 * Price normalization for Canadian camp listings.
 *
 * A bare `$350` on an Ontario provider page is CAD in practice, but that is an
 * assumption, so it is recorded as one (`currency_symbol_only_assumed_cad`) and
 * scored slightly lower than an explicit `CAD $350`. Tax wording is captured as
 * a flag rather than folded into the amount — "+ HST" is not a price change.
 */

import type { CampCurrency, PriceUnit } from "@/data/camps/types";
import {
  normalizationFailure,
  type NormalizationResult,
} from "@/lib/camps/ingestion/normalize/types";

export type NormalizedPrice = {
  amount: number | null;
  currency: CampCurrency;
  unit: PriceUnit | null;
  /** Source says tax is charged on top of the stated amount. */
  taxExtra: boolean;
};

const EMPTY: NormalizedPrice = {
  amount: null,
  currency: "unknown",
  unit: null,
  taxExtra: false,
};

/** A camp price above this is almost certainly a phone number or postal code. */
const MAX_PLAUSIBLE_PRICE = 100_000;

export function normalizePriceCad(rawInput: string): NormalizationResult<NormalizedPrice> {
  const raw = rawInput.trim();
  if (raw === "") return normalizationFailure(raw, EMPTY, "price_not_stated");

  const text = raw.toLowerCase().replace(/\s+/g, " ");
  const unit = detectUnit(text);
  const taxExtra = /\+\s*(?:tax|hst|gst)|plus (?:tax|hst|gst)|tax(?:es)? extra/.test(text);

  if (/\bfree\b|\bno (?:cost|charge|fee)\b|\$0(?:\.00)?\b/.test(text)) {
    return {
      value: { amount: 0, currency: "CAD", unit, taxExtra: false },
      raw,
      confidence: 0.9,
      warnings: [],
    };
  }

  const amounts = [...text.matchAll(/(?:\$|\bcad\b|\busd\b)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g)]
    .map((match) => ({
      matched: match[0],
      amount: Number(`${match[1].replace(/,/g, "")}.${match[2] ?? "0"}`),
    }))
    .filter((candidate) => looksMonetary(candidate.matched, candidate.amount, text));

  if (amounts.length === 0) {
    return normalizationFailure(raw, EMPTY, "price_not_recognized");
  }

  const warnings: string[] = [];
  if (amounts.length > 1) warnings.push("multiple_amounts_found_using_first");

  const amount = amounts[0].amount;
  if (amount > MAX_PLAUSIBLE_PRICE) {
    return normalizationFailure(raw, EMPTY, "price_out_of_plausible_range");
  }

  let currency: CampCurrency = "CAD";
  let confidence = 0.9;
  if (/\bcad\b|\bc\$|\bcdn\b/.test(text)) {
    confidence = 0.97;
  } else if (/\busd\b|\bus\$|\bu\.s\. dollars?\b/.test(text)) {
    currency = "USD";
    confidence = 0.9;
    warnings.push("currency_stated_usd");
  } else if (text.includes("$")) {
    warnings.push("currency_symbol_only_assumed_cad");
  } else {
    currency = "unknown";
    confidence = 0.6;
    warnings.push("currency_not_stated");
  }

  if (!unit) warnings.push("price_unit_not_stated");
  if (taxExtra) warnings.push("tax_charged_on_top");

  return { value: { amount, currency, unit, taxExtra }, raw, confidence, warnings };
}

function detectUnit(text: string): PriceUnit | null {
  if (/per week|\/\s*week|\/\s*wk|weekly|full week|per wk|a week/.test(text)) return "per_week";
  if (/per day|\/\s*day|daily|single day|day rate/.test(text)) return "per_day";
  if (/per session|\/\s*session|each session/.test(text)) return "per_session";
  if (/full (?:program|summer|season)|entire (?:program|summer|season)|whole summer/.test(text)) {
    return "full_program";
  }
  return null;
}

/**
 * Guards against reading a year, an age, or a street number as a price. A bare
 * number only counts when the string carries a currency marker or price wording.
 */
function looksMonetary(matched: string, amount: number, text: string): boolean {
  if (!Number.isFinite(amount) || amount < 0) return false;
  if (/\$|cad|usd/.test(matched)) return true;
  return /\bprice|\bcost|\bfee|\btuition|\brate\b|dollars?\b/.test(text);
}
