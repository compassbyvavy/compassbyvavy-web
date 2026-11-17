import type { DiscoverPlaceTypeRow } from "@/lib/discover/workbook";

export type ExistingPlace = {
  id: string;
  name: string;
  label: string;
};

/** Pull id, name and place_type from a generated venue seed. */
export function placesFromSeedSql(sql: string): ExistingPlace[] {
  return sql
    .split(/insert into public\.places/i)
    .slice(1)
    .flatMap((chunk) => {
      const match = chunk.match(
        /values \('([^']+)', '([^']*)', '([^']*)',[\s\S]*?::public\.discover_category, '([^']+)'/,
      );
      if (!match) return [];
      return [{ id: match[1], name: match[3], label: match[4] }];
    });
}

export type PlaceTypeMapping = {
  placeId: string;
  name: string;
  label: string;
  placeTypeId?: string;
  reason: string;
};

/** Map a place only when its stored label is exactly one Live type name. */
export function mapExistingPlaces(
  places: ExistingPlace[],
  types: DiscoverPlaceTypeRow[],
): PlaceTypeMapping[] {
  const live = new Map<string, string[]>();
  for (const type of types) {
    if (type.status !== "Live") continue;
    const key = type.name.trim().toLowerCase();
    live.set(key, [...(live.get(key) ?? []), type.id]);
  }
  return places.map((place) => {
    const matches = live.get(place.label.trim().toLowerCase()) ?? [];
    if (matches.length === 1) {
      return {
        placeId: place.id,
        name: place.name,
        label: place.label,
        placeTypeId: matches[0],
        reason: "exact name",
      };
    }
    if (matches.length > 1) {
      return {
        placeId: place.id,
        name: place.name,
        label: place.label,
        reason: "more than one Live type has this name",
      };
    }
    return {
      placeId: place.id,
      name: place.name,
      label: place.label,
      reason: "no Live place type has this exact name",
    };
  });
}
