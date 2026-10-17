/**
 * Map a public camp session onto the shared listing contract.
 * Program typical ages are never copied. Missing facts stay null / unknown.
 */

import type {
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import { buildCampDetailHref } from "@/lib/camps/campDetail";
import {
  UNKNOWN_ACCESSIBILITY,
  type CompassListing,
} from "@/lib/listings/types";

export function campSessionToListing(input: {
  program: CampProgram;
  provider: Provider;
  session: CampSession;
  venue?: Venue | null;
}): CompassListing {
  const { program, provider, session, venue } = input;
  const verified =
    session.providerConfirmed === true && Boolean(session.sourceCheckedDate);
  const area =
    venue?.neighbourhood?.trim() ||
    venue?.city?.trim() ||
    null;
  const singleDay =
    session.scheduleFormat === "single_day"
      ? true
      : session.scheduleFormat == null || session.scheduleFormat === "unknown"
        ? null
        : session.startDate &&
            session.endDate &&
            session.startDate === session.endDate
          ? true
          : false;

  return {
    id: session.id,
    category: "camps",
    title: program.name,
    href: buildCampDetailHref(program.slug, { sessionId: session.id }),
    providerName: provider.name,
    areaLabel: area,
    ageMin: session.ageMin ?? null,
    ageMax: session.ageMax ?? null,
    ageMinInclusive: session.ageMinInclusive ?? null,
    ageMaxInclusive: session.ageMaxInclusive ?? null,
    primaryCategory: program.primaryCategory ?? null,
    indoorOutdoor: "unknown",
    settingFeatures: [],
    lastVerifiedOn: session.sourceCheckedDate ?? null,
    verification: verified
      ? "provider_confirmed"
      : session.sourceCheckedDate
        ? "source_checked"
        : "unverified",
    exampleNote: null,
    accessibility: {
      ...UNKNOWN_ACCESSIBILITY,
      supportTags: [...(program.accessibilitySupportTags ?? [])],
    },
    transitAccess: null,
    priceAmount:
      typeof session.priceAmount === "number" ? session.priceAmount : null,
    priceUnit: session.priceUnit ?? null,
    currency: session.currency ?? null,
    startDate: session.startDate ?? null,
    endDate: session.endDate ?? null,
    singleDay,
    packingItems: [...(program.packingItems ?? [])],
  };
}
