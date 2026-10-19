/**
 * Sensory and transit overlays.
 * A badge is shown only for an explicit yes. Unknown is not access.
 */

import type {
  CampProgram,
  CampSession,
  ConfirmedTriState,
  Provider,
  Venue,
} from "@/data/camps/types";

export type AccessToggle = "sensoryRoom" | "elevatorAccess" | "lowStepAccess";

export type AccessRow = {
  programId: string;
  programName: string;
  href: string;
  providerName: string;
  lastVerifiedOn: string | null;
  sensoryRoom: ConfirmedTriState;
  elevatorAccess: ConfirmedTriState;
  lowStepAccess: ConfirmedTriState;
  supportTags: string[];
};

function tri(value: ConfirmedTriState | null | undefined): ConfirmedTriState {
  if (value === "yes" || value === "no") return value;
  return "unknown";
}

export function accessRows(input: {
  programs: CampProgram[];
  providers: Provider[];
  sessions: CampSession[];
}): AccessRow[] {
  const providers = new Map(input.providers.map((provider) => [provider.id, provider]));
  return input.programs.map((program) => {
    const checked = input.sessions
      .filter((session) => session.programId === program.id)
      .map((session) => session.sourceCheckedDate)
      .filter((date): date is string => Boolean(date))
      .sort();
    return {
      programId: program.id,
      programName: program.name,
      href: `/camps/${program.slug}`,
      providerName: providers.get(program.providerId)?.name ?? "Provider unknown",
      lastVerifiedOn: checked.at(-1) ?? null,
      sensoryRoom: tri(program.accessibilityFacts?.sensoryRoom),
      elevatorAccess: tri(program.accessibilityFacts?.elevatorAccess),
      lowStepAccess: tri(program.accessibilityFacts?.lowStepAccess),
      supportTags: [...(program.accessibilitySupportTags ?? [])],
    };
  });
}

export function rowPassesToggles(row: AccessRow, toggles: AccessToggle[]): boolean {
  return toggles.every((toggle) => row[toggle] === "yes");
}

export type TransitStop = {
  venueId: string;
  venueName: string;
  note: string;
  latitude: number | null;
  longitude: number | null;
  wheelchair: ConfirmedTriState;
};

export function transitStops(venues: Venue[]): TransitStop[] {
  return venues.flatMap((venue) => {
    const note = venue.transitAccess?.trim();
    if (!note) return [];
    const latitude =
      typeof venue.latitude === "number" ? venue.latitude : null;
    const longitude =
      typeof venue.longitude === "number" ? venue.longitude : null;
    return [
      {
        venueId: venue.id,
        venueName: venue.name,
        note,
        latitude,
        longitude,
        wheelchair: tri(venue.wheelchairAccessible),
      },
    ];
  });
}

export function stopsWithCoordinates(stops: TransitStop[]): TransitStop[] {
  return stops.filter(
    (stop) => stop.latitude != null && stop.longitude != null,
  );
}
