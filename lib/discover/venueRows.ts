/**
 * VenueRecord → Supabase table rows (snake_case, one array per table).
 *
 * Used by scripts/discover/build-venue-seed.ts to write a seed, and by tests
 * to build PostgREST-shaped responses so the production mapper
 * (lib/discover/venuesSupabase.ts) is checked against the same columns.
 *
 * Child-row ids are not stored: the seed derives deterministic UUIDs in SQL
 * (md5(place_id || ':' || key)::uuid), so re-running it replaces rather than
 * duplicates. `key` carries the record's own id where one exists.
 */

import type { Provenance, VenueRecord } from "@/data/discover/venueTypes";

export type Row = Record<string, unknown>;

export type VenueTableRows = {
  place: Row;
  children: Record<VenueChildTable, Row[]>;
};

export const VENUE_CHILD_TABLES = [
  "place_hours",
  "place_types",
  "place_age_bands",
  "place_activities",
  "place_prices",
  "place_programs",
  "place_amenities",
  "place_policies",
  "place_links",
  "place_review_sources",
  "place_experience_themes",
] as const;

export type VenueChildTable = (typeof VENUE_CHILD_TABLES)[number];

const n = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

function prov(p: Provenance | (Omit<Provenance, "sourceUrl"> & { sourceUrl?: string | null })): Row {
  return {
    source_url: n(p.sourceUrl),
    source_checked_date: p.sourceCheckedDate,
    verification_status: p.verificationStatus,
    conflict_note: n(p.conflictNote),
  };
}

export function venueRecordToRows(record: VenueRecord): VenueTableRows {
  const p = record.place;
  const place: Row = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: n(p.description),
    category: p.category,
    place_type: n(p.placeType),
    city_id: n(p.cityId),
    venue_id: n(p.venueId),
    address_line: n(p.addressLine),
    neighbourhood: n(p.neighbourhood),
    website_url: n(p.websiteUrl),
    age_min: n(p.ageMin),
    age_max: n(p.ageMax),
    age_min_inclusive: n(p.ageMinInclusive),
    age_max_inclusive: n(p.ageMaxInclusive),
    all_ages: p.allAges,
    setting: p.setting,
    cost_tier: p.costTier,
    typical_visit_minutes: n(p.typicalVisitMinutes),
    typical_visit_note: n(p.typicalVisitNote),
    toddler_friendly: p.toddlerFriendly,
    stroller_friendly: p.strollerFriendly,
    hours_kind: p.hoursKind,
    latitude: n(p.latitude),
    longitude: n(p.longitude),
    source_url: n(p.sourceUrl),
    source_checked_date: n(p.sourceCheckedDate),
    publication_state: p.publicationState,
    published_at: n(p.publishedAt),
    operating_status: p.operatingStatus,
    branch_name: n(p.branchName),
    aliases: p.aliases ?? [],
    postal_code: n(p.postalCode),
  };

  const children: VenueTableRows["children"] = {
    place_hours: record.hours.map((h, i) => ({
      key: `hours:${h.weekday}:${h.opensAt}:${h.validFrom ?? ""}:${i}`,
      weekday: h.weekday,
      opens_at: h.opensAt,
      closes_at: h.closesAt,
      valid_from: n(h.validFrom),
      valid_to: n(h.validTo),
      notes: n(h.notes),
      source_url: n(h.sourceUrl),
      source_checked_date: n(h.sourceCheckedDate),
    })),
    place_types: record.types.map((t, i) => ({
      key: `type:${t.placeType}`,
      ...prov(t),
      place_type: t.placeType,
      is_primary: t.isPrimary,
      sort_order: i,
    })),
    place_age_bands: record.ageBands.map((b) => ({
      key: `band:${b.band}`,
      ...prov(b),
      band: b.band,
      fit: b.fit,
      note: n(b.note),
    })),
    place_activities: record.activities.map((a, i) => ({
      key: `activity:${a.id}`,
      ...prov(a),
      name: a.name,
      description: n(a.description),
      availability: a.availability,
      included_in_admission: a.includedInAdmission,
      extra_cost_note: n(a.extraCostNote),
      schedule: a.schedule,
      schedule_note: n(a.scheduleNote),
      age_min: n(a.ageMin),
      age_max: n(a.ageMax),
      min_height_cm: n(a.minHeightCm),
      max_height_cm: n(a.maxHeightCm),
      max_weight_kg: n(a.maxWeightKg),
      safety_note: n(a.safetyNote),
      sort_order: i,
    })),
    place_prices: record.prices.map((pr, i) => ({
      key: `price:${pr.id}`,
      ...prov(pr),
      kind: pr.kind,
      label: pr.label,
      audience: pr.audience,
      age_min: n(pr.ageMin),
      age_max: n(pr.ageMax),
      duration_minutes: n(pr.durationMinutes),
      includes_note: n(pr.includesNote),
      amount: n(pr.amount),
      is_free: pr.isFree,
      currency: pr.currency,
      required_addon: pr.requiredAddon,
      charge_basis: pr.chargeBasis ?? "unknown",
      plus_tax: n(pr.plusTax),
      day_type: n(pr.dayType),
      adults_included: n(pr.adultsIncluded),
      eligibility: n(pr.eligibility),
      valid_to: n(pr.validTo),
      notes: n(pr.notes),
      sort_order: i,
    })),
    place_programs: record.programs.map((pg, i) => ({
      key: `program:${pg.id}`,
      ...prov(pg),
      name: pg.name,
      description: n(pg.description),
      cadence: pg.cadence,
      schedule_note: n(pg.scheduleNote),
      starts_on: n(pg.startsOn),
      ends_on: n(pg.endsOn),
      age_min: n(pg.ageMin),
      age_max: n(pg.ageMax),
      price_note: n(pg.priceNote),
      registration_url: n(pg.registrationUrl),
      sort_order: i,
    })),
    place_amenities: record.amenities.map((a) => ({
      key: `amenity:${a.amenity}`,
      ...prov(a),
      amenity: a.amenity,
      status: a.status,
      note: n(a.note),
    })),
    place_policies: record.policies.map((po, i) => ({
      key: `policy:${po.kind}:${i}`,
      ...prov(po),
      kind: po.kind,
      body: po.body,
      sort_order: i,
    })),
    place_links: record.links.map((l, i) => ({
      key: `link:${l.kind}:${i}`,
      ...prov(l),
      kind: l.kind,
      value: l.value,
      label: n(l.label),
      sort_order: i,
    })),
    place_review_sources: record.reviewSources.map((r) => ({
      key: `review:${r.id}`,
      ...prov(r),
      kind: r.kind,
      platform: r.platform,
      source_name: r.sourceName,
      coverage_note: r.coverageNote,
      selection_method: n(r.selectionMethod),
      items_reviewed: n(r.itemsReviewed),
      period_from: n(r.periodFrom),
      period_to: n(r.periodTo),
      stated_rating: n(r.statedRating),
      stated_rating_count: n(r.statedRatingCount),
      rating_scale: n(r.ratingScale),
      provider_disclosure: n(r.providerDisclosure),
      provider_attributions: n(r.providerAttributions),
    })),
    place_experience_themes: record.experienceThemes.map((t, i) => ({
      key: `theme:${i}`,
      ...prov(t),
      theme: t.theme,
      summary: t.summary,
      basis: t.basis,
      sentiment: t.sentiment,
      agreement: t.agreement,
      // Resolved to the review source's derived UUID by the seed.
      review_source_key: t.reviewSourceId ? `review:${t.reviewSourceId}` : null,
      sort_order: i,
    })),
  };
  return { place, children };
}
