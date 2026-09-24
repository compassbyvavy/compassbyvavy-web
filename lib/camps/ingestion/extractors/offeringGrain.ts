/**
 * Extractor-declared offering grains. Data only — the matcher interprets field
 * descriptors and never branches on provider names.
 */

import type {
  GrainComparison,
  GrainFieldRef,
  OfferingGrain,
  OfferingGrainDimension,
} from "@/lib/camps/ingestion/extractors/types";

function dimension(
  name: string,
  extracted: GrainFieldRef,
  catalogFields: readonly string[],
  compare: GrainComparison,
): OfferingGrainDimension {
  return { name, extracted, catalogFields, compare };
}

function normalizedField(fields: readonly string[]): GrainFieldRef {
  return { scope: "normalized", fields };
}

const SOURCE_IDENTITY_DIMENSION = dimension(
  "sourceIdentity",
  { scope: "record", fields: ["sourceIdentity"] },
  ["externalId"],
  "exact",
);

function sourceIdentityGrain(input: {
  descriptive: readonly string[];
  pricingVariant: readonly string[];
}): OfferingGrain {
  return {
    identity: [SOURCE_IDENTITY_DIMENSION],
    reconciliation: [SOURCE_IDENTITY_DIMENSION],
    descriptive: input.descriptive,
    pricingVariant: input.pricingVariant,
  };
}

/** Creative Kids Place: week × theme × age band. Reconciliation is the same set. */
export const CREATIVE_KIDS_PLACE_OFFERING_GRAIN: OfferingGrain = {
  identity: [
    dimension("startDate", normalizedField(["startDate"]), ["startDate"], "exact"),
    dimension("endDate", normalizedField(["endDate"]), ["endDate"], "exact"),
    dimension(
      "theme",
      normalizedField(["themeTitleNormalized", "themeTitle"]),
      ["themeTitleNormalized", "themeTitle"],
      "normalized_text",
    ),
    dimension("ageMin", normalizedField(["ageMin"]), ["ageMin"], "number"),
    dimension("ageMax", normalizedField(["ageMax"]), ["ageMax"], "number"),
  ],
  reconciliation: [
    dimension("startDate", normalizedField(["startDate"]), ["startDate"], "exact"),
    dimension("endDate", normalizedField(["endDate"]), ["endDate"], "exact"),
    dimension(
      "theme",
      normalizedField(["themeTitleNormalized", "themeTitle"]),
      ["themeTitleNormalized", "themeTitle"],
      "normalized_text",
    ),
    dimension("ageMin", normalizedField(["ageMin"]), ["ageMin"], "number"),
    dimension("ageMax", normalizedField(["ageMax"]), ["ageMax"], "number"),
  ],
  descriptive: ["outingLabel", "coreHoursStart", "coreHoursEnd", "addOnFeeCad", "addOnLabel"],
  pricingVariant: ["priceAmount", "priceTierKey", "priceTierLabel", "shortWeekPriceAmount"],
};

/**
 * Nutty: yearless window × age is already encoded in sourceIdentity.
 * Annual collision remains an A3 limitation.
 */
export const NUTTY_SCIENTISTS_OFFERING_GRAIN = sourceIdentityGrain({
  descriptive: ["themeTitle", "coreHoursStart", "coreHoursEnd", "ageMin", "ageMax"],
  pricingVariant: ["priceAmount", "priceUnit", "currency"],
});

/**
 * Riverwood: yearless date-window identity is sourceIdentity.
 * Grades are semantic facts, not offering identity. Annual rollover is A3.
 */
export const RIVERWOOD_CONSERVANCY_OFFERING_GRAIN = sourceIdentityGrain({
  descriptive: ["gradeMin", "gradeMax", "seatAvailability", "enrolmentCapPerWeek"],
  pricingVariant: ["priceAmount", "priceUnit", "currency"],
});

/**
 * Front Line: camp-token + date-token in sourceIdentity.
 * Player/Goalie are pricing variants; structured age bands are descriptive.
 */
export const FRONT_LINE_HOCKEY_OFFERING_GRAIN = sourceIdentityGrain({
  descriptive: ["ageMin", "ageMax", "ageBands", "coreHoursStart", "coreHoursEnd"],
  pricingVariant: ["priceOptions", "priceAmount", "priceTierKey"],
});

/**
 * Gymnastics: ISO window × attendance format.
 * Reconciliation uses start + format only so an end-date correction can locate
 * the prior occurrence without declaring it the same identity.
 */
export const GYMNASTICS_MISSISSAUGA_OFFERING_GRAIN: OfferingGrain = {
  identity: [
    dimension("startDate", normalizedField(["startDate"]), ["startDate"], "exact"),
    dimension("endDate", normalizedField(["endDate"]), ["endDate"], "exact"),
    dimension(
      "scheduleFormat",
      normalizedField(["scheduleFormat"]),
      ["scheduleFormat"],
      "exact",
    ),
  ],
  reconciliation: [
    dimension("startDate", normalizedField(["startDate"]), ["startDate"], "exact"),
    dimension(
      "scheduleFormat",
      normalizedField(["scheduleFormat"]),
      ["scheduleFormat"],
      "exact",
    ),
  ],
  descriptive: ["themeTitle", "themeTitleNormalized", "coreHoursStart", "coreHoursEnd"],
  pricingVariant: ["priceAmount", "beforeCare", "afterCare"],
};
