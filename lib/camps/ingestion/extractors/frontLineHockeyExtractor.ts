/**
 * Front Line Hockey School extractor.
 *
 * Fourth structurally different provider on the existing Camps pipeline
 * (Prompt 9B-C1). Official inventory is spread across multiple WooCommerce
 * product pages. Each reviewed product URL is its own CampSource; this
 * extractor reads one page at a time. The generic runner is unchanged.
 *
 * Data-truth:
 * - Grain is one offering per product page. Player/Goalie are variants.
 * - Years come from the product title/headings only — not SKUs, image paths,
 *   or capture date.
 * - Ages are taken only when the page states ages. Dual groups 5–9 and 10–14
 *   on the same product (shared dates, hours, price, and Player Type only)
 *   stay one offering with envelope 5–14 plus recoverable structured bands.
 *   December’s per-band ice times stay on those bands; core hours stay null.
 *   Hockey levels (House League / Rep / A) are not converted to ages.
 * - Venue is only Vic Johnston Arena when this page says so. Street address
 *   from another page is not borrowed.
 * - "$" / "plus HST" does not become CAD.
 * - WooCommerce "N in stock" is not remaining seats. Add to Cart is not a
 *   registration-lifecycle signal.
 */

import type {
  CampExtractedRecord,
  CleanSourceDocument,
  RegistrationPlatform,
} from "@/data/camps/ingestion/types";
import { clampConfidence } from "@/lib/camps/ingestion/confidence";
import { sameCanonicalHost } from "@/lib/camps/ingestion/canonicalizeUrl";
import {
  buildExtractedRecord,
  makeFieldObservation,
  type CampExtractor,
  type ExtractorInput,
  type ExtractorResult,
  type ExtractorSupportInput,
} from "@/lib/camps/ingestion/extractors/types";
import { FRONT_LINE_HOCKEY_OFFERING_GRAIN } from "@/lib/camps/ingestion/extractors/offeringGrain";
import { documentLines } from "@/lib/camps/ingestion/extractors/textScan";
import { normalizePriceCad } from "@/lib/camps/ingestion/normalize/price";
import {
  FRONT_LINE_HOCKEY_EXTRACTOR_KEY,
  FRONT_LINE_HOCKEY_HOSTS,
  FRONT_LINE_HOCKEY_PROVIDER_NAME,
  classifyFrontLineCampType,
  frontLineCampToken,
  frontLineProductSlugFromUrl,
  frontLineSessionSourceIdentity,
  frontLineVenueSourceIdentity,
  parseFrontLineAvailability,
  parseFrontLineBodyPrices,
  parseFrontLineDateWindow,
  parseFrontLineEligibility,
  parseFrontLineHours,
  parseFrontLineProductTitle,
  parseFrontLineStatedYear,
  parseFrontLineVenue,
  parseFrontLineWooVariations,
  resolveFrontLineGoaliePrice,
  type FrontLineAgeBand,
  type FrontLineOffering,
} from "@/lib/camps/ingestion/extractors/frontLineHockeyProduct";

export {
  FRONT_LINE_HOCKEY_EXTRACTOR_KEY,
  FRONT_LINE_HOCKEY_HOST,
  FRONT_LINE_HOCKEY_HOSTS,
  FRONT_LINE_HOCKEY_PROVIDER_NAME,
  FRONT_LINE_HOCKEY_VENUE_NAME,
  frontLineCampToken,
  frontLineProductSlugFromUrl,
  frontLineSessionSourceIdentity,
  parseFrontLineWooVariations,
} from "@/lib/camps/ingestion/extractors/frontLineHockeyProduct";

export type FrontLineHockeyFacts = {
  provider: {
    name: string;
    websiteUrl: string;
    registrationPlatform: RegistrationPlatform;
  };
  venue: {
    name: string;
    addressLine: string;
    city: string | null;
    province: null;
    postalCode: null;
    neighbourhood: string | null;
  } | null;
  offering: FrontLineOffering | null;
  policies: {
    playerPriceAmount: number | null;
    goaliePriceAmount: number | null;
    playerPriceCopy: string | null;
    goaliePriceCopy: string | null;
    taxExtra: boolean;
    girlsOnly: boolean;
    campType: string | null;
    eligibilityCopy: string | null;
    ageBands: FrontLineAgeBand[];
    datesTbd: boolean;
    availabilityCopy: string | null;
    wooCommerceStockCopy: string | null;
    rawGoalieVariantAmount: number | null;
  };
  raw: {
    productTitle: string | null;
    productSlug: string | null;
    campToken: string | null;
    dates: string | null;
    hours: string | null;
    venue: string | null;
    eligibility: string | null;
    ageBands: FrontLineAgeBand[];
    playerPrice: string | null;
    goaliePrice: string | null;
    goalieVariationDescription: string | null;
    rawGoalieVariantAmount: number | null;
    availability: string | null;
  };
  warnings: string[];
  knownGaps: string[];
};

export function parseFrontLineHockeyFacts(
  document: CleanSourceDocument,
  options: { sourceUrl?: string | null; rawHtml?: string | null } = {},
): FrontLineHockeyFacts {
  const warnings: string[] = [];
  const knownGaps: string[] = [];
  const rawHtml = options.rawHtml ?? "";
  const sourceUrl = options.sourceUrl ?? "";
  const lines = documentLines(document);
  const title = parseFrontLineProductTitle(rawHtml, document.title);
  const statedYear = parseFrontLineStatedYear(title, document.headings);
  const productSlug =
    frontLineProductSlugFromUrl(sourceUrl) ??
    frontLineProductSlugFromUrl(canonicalFormAction(rawHtml));
  const variations = parseFrontLineWooVariations(rawHtml);
  const dates = parseFrontLineDateWindow(lines, statedYear);
  const hours = parseFrontLineHours(lines);
  const eligibility = parseFrontLineEligibility(lines);
  const venue = parseFrontLineVenue(lines);
  const bodyPrices = parseFrontLineBodyPrices(lines);
  const availability = parseFrontLineAvailability(rawHtml, variations);

  if (statedYear == null) warnings.push("year_not_stated");
  if (dates.datesTbd) {
    warnings.push("dates_tbd");
    knownGaps.push("session_iso_dates_tbd");
  } else if (!dates.startDate || !dates.endDate) {
    warnings.push("dates_not_stated");
    knownGaps.push("session_iso_dates_unparsed");
  }
  if (hours.multipleBands) {
    warnings.push("core_hours_vary_by_age_group");
    knownGaps.push("single_core_hours_not_stated");
  } else if (!hours.start) {
    warnings.push("hours_not_found");
  }
  if (eligibility.ageMin == null) {
    warnings.push("ages_not_stated");
    knownGaps.push("age_eligibility_not_stated_on_product");
  }
  if (!venue) {
    warnings.push("venue_not_stated_on_this_product");
    knownGaps.push("venue_not_borrowed_from_other_front_line_pages");
  }
  if (/house league|rep\.|“a” players/i.test(lines.join(" "))) {
    warnings.push("hockey_level_copy_not_converted_to_ages");
  }

  const playerFromVariation = variations.find((row) => row.playerType === "player")?.displayPrice ?? null;
  const goalieVariation = variations.find((row) => row.playerType === "goalie") ?? null;
  const playerPriceAmount = bodyPrices.playerAmount ?? playerFromVariation;
  const goalieResolved = resolveFrontLineGoaliePrice({
    bodyAmount: bodyPrices.goalieAmount,
    bodyCopy: bodyPrices.goalieCopy,
    variationAmount: goalieVariation?.displayPrice ?? null,
  });
  warnings.push(...goalieResolved.warnings);
  const goaliePriceAmount = goalieResolved.amount;
  if (playerPriceAmount == null) warnings.push("player_price_not_found");

  const priceProbe = normalizePriceCad(
    bodyPrices.playerCopy ?? (playerPriceAmount != null ? `$${playerPriceAmount}` : ""),
  );
  if (priceProbe.warnings.includes("currency_symbol_only_assumed_cad")) {
    warnings.push("currency_not_stated");
  }
  if (bodyPrices.taxExtra) warnings.push("hst_stated_tax_not_folded_into_amount");

  if (availability.availabilityCopy && /\d+\s+in stock/i.test(availability.availabilityCopy)) {
    warnings.push("woocommerce_stock_count_not_used_as_remaining_seats");
    knownGaps.push("remaining_seats_not_inferred_from_woocommerce_stock");
  }
  if (availability.soldOut) {
    warnings.push("sold_out_mapped_to_confirmed_full_not_registration_closed");
  } else {
    warnings.push("availability_unknown_add_to_cart_is_not_a_lifecycle");
    knownGaps.push("registration_status_not_inferred_from_add_to_cart");
  }

  const productUrl = sourceUrl || canonicalFormAction(rawHtml) || "";
  const girlsOnly = /girls only/i.test(title);
  const campType = classifyFrontLineCampType(title);
  const campToken = frontLineCampToken(title, campType);

  let offering: FrontLineOffering | null = null;
  if (!productSlug) warnings.push("product_slug_not_found");
  if (campToken) {
    const sourceIdentity = frontLineSessionSourceIdentity(campToken, dates.dateToken);
    offering = {
      productSlug: productSlug ?? "",
      productTitle: title,
      productUrl,
      weekIdentity: dates.dateToken,
      listedDateWindow: dates.listedDateWindow,
      startDate: dates.startDate,
      endDate: dates.endDate,
      datesTbd: dates.datesTbd,
      statedYear,
      ageMin: eligibility.ageMin,
      ageMax: eligibility.ageMax,
      ageBands: eligibility.bands,
      eligibilityCopy: eligibility.copy,
      campToken,
      rawGoalieVariantAmount: goalieResolved.rawVariantAmount,
      coreHoursStart: hours.start,
      coreHoursEnd: hours.end,
      hoursCopy: hours.copy,
      venueName: venue?.name ?? null,
      venueCity: venue?.city ?? null,
      venueNeighbourhood: venue?.neighbourhood ?? null,
      venueCopy: venue?.copy ?? null,
      playerPriceAmount,
      goaliePriceAmount,
      playerPriceCopy: bodyPrices.playerCopy ?? (playerPriceAmount != null ? `$${playerPriceAmount}` : null),
      goaliePriceCopy: goalieResolved.copy,
      currency: "unknown",
      taxExtra: bodyPrices.taxExtra,
      girlsOnly,
      campType,
      availabilityCopy: availability.availabilityCopy,
      soldOut: availability.soldOut,
      registrationUrl: productUrl,
      sourceIdentity,
    };
  } else {
    warnings.push("camp_token_not_found");
  }

  return {
    provider: {
      name: FRONT_LINE_HOCKEY_PROVIDER_NAME,
      websiteUrl: "https://frontlinehockeyschool.ca/",
      registrationPlatform: "WooCommerce",
    },
    venue: venue
      ? {
          name: venue.name,
          addressLine: venue.name,
          city: venue.city,
          province: null,
          postalCode: null,
          neighbourhood: venue.neighbourhood,
        }
      : null,
    offering,
    policies: {
      playerPriceAmount,
      goaliePriceAmount,
      playerPriceCopy: offering?.playerPriceCopy ?? null,
      goaliePriceCopy: offering?.goaliePriceCopy ?? null,
      taxExtra: bodyPrices.taxExtra,
      girlsOnly,
      campType,
      eligibilityCopy: eligibility.copy,
      ageBands: eligibility.bands,
      datesTbd: dates.datesTbd,
      availabilityCopy: availability.availabilityCopy,
      wooCommerceStockCopy: availability.availabilityCopy,
      rawGoalieVariantAmount: goalieResolved.rawVariantAmount,
    },
    raw: {
      productTitle: title,
      productSlug,
      campToken,
      dates: dates.listedDateWindow,
      hours: hours.copy,
      venue: venue?.copy ?? null,
      eligibility: eligibility.copy,
      ageBands: eligibility.bands,
      playerPrice: offering?.playerPriceCopy ?? null,
      goaliePrice: offering?.goaliePriceCopy ?? null,
      goalieVariationDescription: goalieVariation?.description ?? null,
      rawGoalieVariantAmount: goalieResolved.rawVariantAmount,
      availability: availability.availabilityCopy,
    },
    warnings,
    knownGaps,
  };
}

function canonicalFormAction(rawHtml: string): string | null {
  const match = /<form[^>]*class="[^"]*variations_form[^"]*"[^>]*action="([^"]+)"/i.exec(rawHtml);
  return match?.[1] ?? null;
}

function supports(input: ExtractorSupportInput): boolean {
  if (input.source.extractorKey === FRONT_LINE_HOCKEY_EXTRACTOR_KEY) return true;
  for (const host of FRONT_LINE_HOCKEY_HOSTS) {
    if (sameCanonicalHost(input.source.canonicalUrl, `https://${host}`)) return true;
  }
  return /frontlinehockeyschool\.ca/i.test(input.source.canonicalUrl);
}

function structuredAgeBands(bands: FrontLineAgeBand[]): Array<{
  ageMin: number;
  ageMax: number;
  hoursStart: string | null;
  hoursEnd: string | null;
}> {
  return bands.map((band) => ({
    ageMin: band.ageMin,
    ageMax: band.ageMax,
    hoursStart: band.hoursStart,
    hoursEnd: band.hoursEnd,
  }));
}

function structuredPriceOptions(offering: FrontLineOffering): Array<{
  key: "player" | "goalie";
  label: "Player" | "Goalie";
  amount: number;
  unit: null;
  currency: FrontLineOffering["currency"];
}> {
  const options: Array<{
    key: "player" | "goalie";
    label: "Player" | "Goalie";
    amount: number;
    unit: null;
    currency: FrontLineOffering["currency"];
  }> = [];
  if (offering.playerPriceAmount != null) {
    options.push({
      key: "player",
      label: "Player",
      amount: offering.playerPriceAmount,
      unit: null,
      currency: offering.currency,
    });
  }
  if (offering.goaliePriceAmount != null) {
    options.push({
      key: "goalie",
      label: "Goalie",
      amount: offering.goaliePriceAmount,
      unit: null,
      currency: offering.currency,
    });
  }
  return options;
}

function extract(input: ExtractorInput): ExtractorResult {
  const { document, source, snapshot, extractionRunId, newId, rawHtml } = input;
  const observedAt = (input.now ?? new Date()).toISOString();
  const facts = parseFrontLineHockeyFacts(document, {
    sourceUrl: source.canonicalUrl || source.sourceUrl,
    rawHtml,
  });

  const observation = <T,>(value: T, rawValue: string | null, confidence: number) =>
    makeFieldObservation(value, {
      rawValue,
      sourceUrl: source.canonicalUrl,
      sourceSnapshotId: snapshot.id,
      observedAt,
      confidence: clampConfidence(confidence),
      extractionMethod: "regex",
    });

  const records: CampExtractedRecord[] = [];
  records.push(
    buildExtractedRecord({
      id: newId(),
      extractionRunId,
      recordType: "provider",
      sourceIdentity: `${FRONT_LINE_HOCKEY_EXTRACTOR_KEY}:provider`,
      rawFields: { title: document.title, sourceId: source.id },
      normalizedFields: {
        providerId: source.providerId,
        name: facts.provider.name,
        websiteUrl: facts.provider.websiteUrl,
        registrationInfoUrl: null,
        registrationPlatform: facts.provider.registrationPlatform,
        sourceUrl: source.canonicalUrl,
      },
      confidence: 0.95,
      warnings: [],
    }),
  );

  if (facts.venue) {
    records.push(
      buildExtractedRecord({
        id: newId(),
        extractionRunId,
        recordType: "venue",
        sourceIdentity: frontLineVenueSourceIdentity(facts.venue.name),
        rawFields: { addressLine: facts.raw.venue, sourceId: source.id },
        normalizedFields: {
          name: facts.venue.name,
          addressLine: facts.venue.addressLine,
          neighbourhood: facts.venue.neighbourhood,
          city: facts.venue.city,
          province: facts.venue.province,
          postalCode: facts.venue.postalCode,
          sourceUrl: source.canonicalUrl,
          observations: {
            addressLine: observation(facts.venue.addressLine, facts.raw.venue, 0.9),
          },
        },
        confidence: 0.9,
        warnings: ["venue_street_address_not_stated_on_this_product"],
      }),
    );
  }

  const offering = facts.offering;
  if (offering) {
    records.push(
      buildExtractedRecord({
        id: newId(),
        extractionRunId,
        recordType: "program",
        sourceIdentity: `${FRONT_LINE_HOCKEY_EXTRACTOR_KEY}:program:${offering.campToken}`,
        rawFields: {
          heading: offering.productTitle,
          sourceId: source.id,
          productSlug: offering.productSlug,
          campToken: offering.campToken,
          eligibility: facts.raw.eligibility,
          ageBands: facts.raw.ageBands,
          playerPrice: facts.raw.playerPrice,
          goaliePrice: facts.raw.goaliePrice,
          goalieVariationDescription: facts.raw.goalieVariationDescription,
          rawGoalieVariantAmount: facts.raw.rawGoalieVariantAmount,
        },
        normalizedFields: {
          providerId: source.providerId,
          name: offering.productTitle,
          typicalAgeMin: offering.ageMin,
          typicalAgeMax: offering.ageMax,
          marketingAgeMin: offering.ageMin,
          marketingAgeMax: offering.ageMax,
          derivedAvailableAgeMin: offering.ageMin,
          derivedAvailableAgeMax: offering.ageMax,
          seasonStartDate: offering.startDate,
          seasonEndDate: offering.endDate,
          coreHoursStart: offering.coreHoursStart,
          coreHoursEnd: offering.coreHoursEnd,
          registrationUrl: offering.registrationUrl,
          registrationPlatform: facts.provider.registrationPlatform,
          sourceUrl: source.canonicalUrl,
          policies: facts.policies,
          knownGaps: facts.knownGaps,
          observations: {
            playerPriceAmount: observation(
              facts.policies.playerPriceAmount,
              facts.raw.playerPrice,
              0.9,
            ),
            goaliePriceAmount: observation(
              facts.policies.goaliePriceAmount,
              facts.raw.goaliePrice,
              facts.policies.goaliePriceAmount == null ? 0.2 : 0.9,
            ),
            rawGoalieVariantAmount: observation(
              facts.raw.rawGoalieVariantAmount,
              facts.raw.goalieVariationDescription,
              0.9,
            ),
            ageBands: observation(facts.raw.ageBands, facts.raw.eligibility, 0.95),
          },
        },
        confidence: 0.9,
        warnings: facts.warnings,
      }),
    );

    records.push(
      buildExtractedRecord({
        id: newId(),
        extractionRunId,
        recordType: "session",
        sourceIdentity: offering.sourceIdentity,
        rawFields: {
          sourceId: source.id,
          productSlug: offering.productSlug,
          campToken: offering.campToken,
          listedDateWindow: offering.listedDateWindow,
          eligibility: facts.raw.eligibility,
          ageBands: offering.ageBands,
          playerPrice: facts.raw.playerPrice,
          goaliePrice: facts.raw.goaliePrice,
          goalieVariationDescription: facts.raw.goalieVariationDescription,
          rawGoalieVariantAmount: offering.rawGoalieVariantAmount,
          availabilityCopy: offering.availabilityCopy,
          hours: facts.raw.hours,
          venue: facts.raw.venue,
        },
        normalizedFields: {
          externalId: offering.sourceIdentity,
          providerId: source.providerId,
          programName: offering.productTitle,
          weekIdentity: offering.weekIdentity,
          weekNumber: null,
          themeTitle: offering.campType,
          themeTitleNormalized: offering.campType,
          startDate: offering.startDate,
          endDate: offering.endDate,
          listedDateWindow: offering.listedDateWindow,
          ageMin: offering.ageMin,
          ageMax: offering.ageMax,
          ageBands: structuredAgeBands(offering.ageBands),
          priceTierKey: "player",
          priceTierLabel: "player",
          priceAmount: offering.playerPriceAmount,
          priceUnit: null,
          currency: offering.currency,
          priceOptions: structuredPriceOptions(offering),
          shortWeekPriceAmount: null,
          outingLabel: null,
          addOnFeeCad: null,
          addOnLabel: null,
          coreHoursStart: offering.coreHoursStart,
          coreHoursEnd: offering.coreHoursEnd,
          registrationUrl: offering.registrationUrl,
          registrationPlatform: facts.provider.registrationPlatform,
          registrationStatus: null,
          seatAvailability: offering.soldOut ? "confirmed_full" : null,
          sourceUrl: source.canonicalUrl,
          observations: {
            weekIdentity: observation(offering.weekIdentity, offering.listedDateWindow, 0.95),
            playerPriceAmount: observation(offering.playerPriceAmount, offering.playerPriceCopy, 0.9),
            goaliePriceAmount: observation(
              offering.goaliePriceAmount,
              offering.goaliePriceCopy,
              offering.goaliePriceAmount == null ? 0.2 : 0.9,
            ),
            rawGoalieVariantAmount: observation(
              offering.rawGoalieVariantAmount,
              facts.raw.goalieVariationDescription,
              0.9,
            ),
            ageBands: observation(offering.ageBands, offering.eligibilityCopy, 0.95),
            sourceUrl: observation(source.canonicalUrl, source.canonicalUrl, 0.99),
          },
        },
        confidence: 0.9,
        warnings: facts.warnings,
      }),
    );
  }

  const foundEnough = offering != null;
  const thin =
    offering != null &&
    (offering.startDate == null || facts.venue == null || offering.ageMin == null);
  return {
    status: !foundEnough ? "failed" : thin ? "partial" : "success",
    records,
    warnings: [...facts.warnings, ...facts.knownGaps.map((gap) => `known_gap:${gap}`)],
  };
}

export const frontLineHockeyExtractor: CampExtractor = {
  key: FRONT_LINE_HOCKEY_EXTRACTOR_KEY,
  version: "0.1.0",
  grain: FRONT_LINE_HOCKEY_OFFERING_GRAIN,
  supports,
  extract,
};
