import { parseJackrabbitHolidayHtml } from "../../../../lib/camps/feeds/jackrabbitHtml";
import type { DueRef, SpotAdapter } from "../types";

export const jackrabbit: SpotAdapter = {
  pageUrl(ref: DueRef): string {
    return typeof ref.externalRef.openingsUrl === "string" ? ref.externalRef.openingsUrl : "";
  },

  parse(ref: DueRef, body: string) {
    return parseJackrabbitHolidayHtml(body, jackrabbit.pageUrl(ref));
  },
};
