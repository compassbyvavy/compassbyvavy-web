import type { DueRef, SpotAdapter, SpotReading } from "../types";

export const activenet: SpotAdapter = {
  pageUrl(ref: DueRef): string {
    const activityId = ref.externalRef.activityId;
    if (activityId == null || activityId === "") return "";
    return `https://anc.ca.apm.activecommunities.com/ymcagta/rest/activity/detail/${encodeURIComponent(String(activityId))}`;
  },

  parse(ref: DueRef, body: string): SpotReading | { error: string } {
    let status = "";
    try {
      const payload = JSON.parse(body) as { body?: { detail?: { space_status?: string } } };
      status = payload.body?.detail?.space_status?.trim() ?? "";
    } catch {
      return { error: "activenet response was not json" };
    }
    if (!status) return { error: "activenet detail had no space_status" };
    const source = activenet.pageUrl(ref);
    const remaining = /^(\d+)\s+openings?\s+remaining$/i.exec(status);
    if (remaining) {
      return { spots_left: Number(remaining[1]), state: "available", source_url: source };
    }
    if (/wait\s*list/i.test(status)) {
      return { spots_left: null, state: "waitlist", source_url: source };
    }
    if (/sold out|full/i.test(status)) {
      return { spots_left: null, state: "full", source_url: source };
    }
    return { error: `space_status ${status} was not a count, full, or waitlist` };
  },
};
