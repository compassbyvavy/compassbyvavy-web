/** Normalizers: source text → typed catalog-shaped values, with warnings. */

export { normalizeAgeRange, type NormalizedAgeRange } from "@/lib/camps/ingestion/normalize/ageRange";
export {
  normalizeDateRange,
  type NormalizeDateRangeOptions,
  type NormalizedDateRange,
} from "@/lib/camps/ingestion/normalize/dateRange";
export { normalizePriceCad, type NormalizedPrice } from "@/lib/camps/ingestion/normalize/price";
export {
  monthDayWindowIdentity,
  padMonthDay,
  parseMonthDayWindows,
  type MonthDayWindow,
} from "@/lib/camps/ingestion/normalize/monthDayWindow";
export {
  findRegistrationLink,
  normalizeRegistrationPlatform,
  type RegistrationPlatformSignals,
} from "@/lib/camps/ingestion/normalize/registrationPlatform";
export { normalizeTimeRange, type NormalizedTimeRange } from "@/lib/camps/ingestion/normalize/timeRange";
export {
  normalizeUrl,
  type NormalizeUrlOptions,
  type NormalizedUrl,
} from "@/lib/camps/ingestion/normalize/url";
export {
  normalizationFailure,
  type NormalizationResult,
} from "@/lib/camps/ingestion/normalize/types";
