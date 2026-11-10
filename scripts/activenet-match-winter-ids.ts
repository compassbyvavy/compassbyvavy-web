/**
 * Match the City's Winter 2026 list (public activity numbers) to ActiveNet
 * internal activity IDs. Read-only: one search-page GET plus one list POST per
 * results page, sequential. Writes nothing to the repo, publishes nothing.
 *
 *   npx tsx scripts/activenet-match-winter-ids.ts > winter-ids.json
 *
 * Review the output (matched / missing / ambiguous / nameWarnings) before
 * adding any session to lib/camps/availability/activenet/registry.ts.
 */
import { readActiveNetAvailabilityConfig } from "@/lib/camps/availability/activenet/config";
import {
  availabilityFromListItem,
  fetchActiveNetActivityList,
} from "@/lib/camps/availability/activenet/listClient";
import { matchActivityNumbers } from "@/lib/camps/availability/activenet/matchIds";
import { MISSISSAUGA_WINTER_2026_LISTED } from "@/data/camps/real/mississaugaWinter2026EligibleList";

async function main() {
  const config = readActiveNetAvailabilityConfig();
  const list = await fetchActiveNetActivityList({
    search: { keyword: "winter fun" },
    timeoutMs: config.timeoutMs,
    maxPages: 10,
  });
  if (!list.ok) {
    console.error(`List request failed: ${list.error}`);
    process.exitCode = 1;
    return;
  }

  const report = matchActivityNumbers(
    list.items,
    MISSISSAUGA_WINTER_2026_LISTED.map((row) => ({
      activityNumber: row.publicActivityNumber,
      nameIncludes: "Winter Fun",
      nameExcludes: row.program === "Winter Fun" ? "Jr" : undefined,
    })),
  );

  const byNumber = new Map(list.items.map((i) => [i.activityNumber, i]));
  const rows = MISSISSAUGA_WINTER_2026_LISTED.map((row) => {
    const match = report.matched.find((m) => m.activityNumber === row.publicActivityNumber);
    const item = byNumber.get(row.publicActivityNumber);
    return {
      ...row,
      internalActivityId: match?.activityId ?? null,
      listName: match?.name ?? null,
      listLocation: match?.locationLabel ?? null,
      listStart: match?.dateRangeStart ?? null,
      startMatches: match ? match.dateRangeStart?.startsWith(row.startDate) ?? null : null,
      availabilityNow: item ? availabilityFromListItem(item) : null,
    };
  });

  console.log(
    JSON.stringify(
      {
        retrievedAt: new Date().toISOString(),
        listRows: list.items.length,
        skippedRows: list.skippedRows,
        pages: list.pages,
        missing: report.missing,
        ambiguous: report.ambiguous,
        nameWarnings: report.nameWarnings,
        rows,
      },
      null,
      2,
    ),
  );
}

void main();
