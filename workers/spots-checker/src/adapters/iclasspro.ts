import type { DueRef, SpotAdapter, SpotReading } from "../types";

type CampRow = {
  id?: number;
  hasOpenings?: boolean;
  allowToRequestCampThatIsFull?: boolean;
  openingsDisplay?: string;
};

function parentCount(display: string): number | null {
  const match = /^(\d+)\b/.exec(display.trim());
  if (!match) return null;
  return Number(match[1]);
}

export const iclasspro: SpotAdapter = {
  pageUrl(ref: DueRef): string {
    const org = ref.externalRef.orgCode;
    const locationId = ref.externalRef.locationId;
    const typeId = ref.externalRef.typeId;
    if (typeof org !== "string" || org === "" || locationId == null || typeId == null) return "";
    return `https://app.iclasspro.com/api/open/v1/${encodeURIComponent(org)}/camps?locationId=${encodeURIComponent(String(locationId))}&typeId=${encodeURIComponent(String(typeId))}&sortBy=time`;
  },

  parse(ref: DueRef, body: string): SpotReading | { error: string } {
    let payload: { data?: CampRow[] };
    try {
      payload = JSON.parse(body) as { data?: CampRow[] };
    } catch {
      return { error: "iclasspro response was not json" };
    }
    const campId = Number(ref.externalRef.campId);
    const camp = (payload.data ?? []).find((row) => row.id === campId);
    if (!camp) return { error: `camp ${campId} was not in the listing` };
    const display = camp.openingsDisplay ?? "";
    const source = typeof ref.externalRef.url === "string" ? ref.externalRef.url : iclasspro.pageUrl(ref);
    const count = parentCount(display);
    if (camp.hasOpenings === false) {
      if (camp.allowToRequestCampThatIsFull) {
        return { spots_left: null, state: "waitlist", source_url: source };
      }
      return { spots_left: count === 0 ? 0 : null, state: "full", source_url: source };
    }
    if (count == null && !/^open$/i.test(display.trim()) && display.trim() !== "") {
      return { error: `openings display ${display} had no parent-facing count` };
    }
    return { spots_left: count, state: "available", source_url: source };
  },
};
