/**
 * City of Mississauga — Eligible Camp List, Winter 2026 (child care subsidy list).
 * Source: https://www.mississauga.ca/wp-content/uploads/sites/5/2026/08/10101041/Eligible-Camp-List-Winter-2026-1.pdf
 *
 * "Activity #" in that PDF is the PUBLIC activity number, not the internal
 * ActiveNet activity_id. Example: Malton Winter Fun Dec 21 is public 147884,
 * internal 145871. Use scripts/activenet-match-winter-ids.ts to find the
 * internal ids before adding any mapping to the availability registry.
 *
 * REVIEW: transcribed via a summarising tool on 2026-11-10, not by hand.
 * Spot-check against the PDF before relying on it. Meadowvale numbers verified
 * against City activity data on 2026-11-10: no swap.
 *
 * Every row in the PDF lists 7:30 AM - 6:00 PM ("all camps include extended hours").
 * ActiveNet list `time_range` for Winter Fun is the core day 9:00 AM - 4:00 PM.
 *
 * Churchill Meadows has Winter Fun Jr (4–5) on the PDF and in ActiveNet. There
 * is no Churchill Meadows Winter Fun 6–12 in the City's "winter fun" list.
 *
 * ActiveNet returns 34 Winter Fun rows vs 30 PDF rows. The four extra list
 * rows are Carmen Corbasson and River Grove Dec 29 (Fun and Jr) — see
 * MISSISSAUGA_WINTER_2026_ACTIVENET_ONLY. They are not on the subsidy PDF
 * (Carmen 147719 and River Grove 148282 are the week-1 PDF numbers).
 */

export type WinterListedSession = {
  centre: string;
  program: "Winter Fun" | "Winter Fun Jr";
  ages: "6-12" | "4-5";
  startDate: "2026-12-21" | "2026-12-29";
  days: "Mon-Wed" | "Tue-Thu";
  publicActivityNumber: string;
};

const W1 = { startDate: "2026-12-21", days: "Mon-Wed" } as const;
const W2 = { startDate: "2026-12-29", days: "Tue-Thu" } as const;
const FUN = { program: "Winter Fun", ages: "6-12" } as const;
const JR = { program: "Winter Fun Jr", ages: "4-5" } as const;

export const MISSISSAUGA_WINTER_2026_LISTED: readonly WinterListedSession[] = [
  { centre: "Burnhamthorpe Community Centre", ...JR, ...W1, publicActivityNumber: "160781" },
  { centre: "Burnhamthorpe Community Centre", ...JR, ...W2, publicActivityNumber: "147918" },
  { centre: "Burnhamthorpe Community Centre", ...FUN, ...W1, publicActivityNumber: "160780" },
  { centre: "Burnhamthorpe Community Centre", ...FUN, ...W2, publicActivityNumber: "147917" },
  { centre: "Carmen Corbasson Community Centre", ...JR, ...W1, publicActivityNumber: "147720" },
  // Corrected 2026-11-10 from City activity data (list date_range_start 2026-12-21); the PDF as transcribed said Dec 29.
  { centre: "Carmen Corbasson Community Centre", ...FUN, ...W1, publicActivityNumber: "147719" },
  { centre: "Churchill Meadows Community Centre", ...JR, ...W1, publicActivityNumber: "156676" },
  { centre: "Churchill Meadows Community Centre", ...JR, ...W2, publicActivityNumber: "148030" },
  { centre: "Frank McKechnie Community Centre", ...JR, ...W1, publicActivityNumber: "147848" },
  { centre: "Frank McKechnie Community Centre", ...JR, ...W2, publicActivityNumber: "157490" },
  { centre: "Frank McKechnie Community Centre", ...FUN, ...W1, publicActivityNumber: "147847" },
  { centre: "Frank McKechnie Community Centre", ...FUN, ...W2, publicActivityNumber: "157489" },
  { centre: "Huron Park Community Centre", ...JR, ...W1, publicActivityNumber: "166851" },
  { centre: "Huron Park Community Centre", ...JR, ...W2, publicActivityNumber: "166852" },
  { centre: "Huron Park Community Centre", ...FUN, ...W1, publicActivityNumber: "166849" },
  { centre: "Huron Park Community Centre", ...FUN, ...W2, publicActivityNumber: "166850" },
  { centre: "Malton Community Centre", ...JR, ...W1, publicActivityNumber: "147885" },
  { centre: "Malton Community Centre", ...JR, ...W2, publicActivityNumber: "156066" },
  { centre: "Malton Community Centre", ...FUN, ...W1, publicActivityNumber: "147884" },
  { centre: "Malton Community Centre", ...FUN, ...W2, publicActivityNumber: "156065" },
  { centre: "Meadowvale Community Centre", ...JR, ...W1, publicActivityNumber: "143070" },
  { centre: "Meadowvale Community Centre", ...JR, ...W2, publicActivityNumber: "143541" },
  { centre: "Meadowvale Community Centre", ...FUN, ...W1, publicActivityNumber: "143540" },
  { centre: "Meadowvale Community Centre", ...FUN, ...W2, publicActivityNumber: "143069" },
  { centre: "Mississauga Valley Community Centre", ...JR, ...W1, publicActivityNumber: "156568" },
  { centre: "Mississauga Valley Community Centre", ...JR, ...W2, publicActivityNumber: "156575" },
  { centre: "Mississauga Valley Community Centre", ...FUN, ...W1, publicActivityNumber: "156570" },
  { centre: "Mississauga Valley Community Centre", ...FUN, ...W2, publicActivityNumber: "156574" },
  { centre: "River Grove Community Centre", ...JR, ...W1, publicActivityNumber: "148283" },
  // Corrected 2026-11-10 from City activity data (list date_range_start 2026-12-21); the PDF as transcribed said Dec 29.
  { centre: "River Grove Community Centre", ...FUN, ...W1, publicActivityNumber: "148282" },
];

/**
 * Winter Fun rows observed on ActiveNet that are not on the Eligible Camp
 * List PDF. Matcher output lists these as unmatchedListRows. Do not treat
 * them as subsidy-list sessions. Public numbers and internal IDs checked
 * 2026-11-10 against POST /rest/activities/list keyword "winter fun".
 */
export const MISSISSAUGA_WINTER_2026_ACTIVENET_ONLY: readonly WinterListedSession[] = [
  { centre: "Carmen Corbasson Community Centre", ...FUN, ...W2, publicActivityNumber: "166679" },
  { centre: "Carmen Corbasson Community Centre", ...JR, ...W2, publicActivityNumber: "166681" },
  { centre: "River Grove Community Centre", ...FUN, ...W2, publicActivityNumber: "166836" },
  { centre: "River Grove Community Centre", ...JR, ...W2, publicActivityNumber: "166837" },
];
