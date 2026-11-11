/**
 * Match the City's Winter 2026 list (public activity numbers) to ActiveNet
 * internal activity IDs. Read-only: one search-page GET plus one list POST per
 * results page, then one estimateprice GET per unique activity. Writes nothing
 * to the repo, publishes nothing, runs no SQL.
 *
 *   npx tsx scripts/activenet-match-winter-ids.ts > winter-ids.json
 *
 * Review matched / missing / ambiguous / nameWarnings / unmatchedListRows
 * before adding any session to lib/camps/availability/activenet/registry.ts.
 */
import { readActiveNetAvailabilityConfig } from "@/lib/camps/availability/activenet/config";
import { fetchActiveNetEstimatePrice } from "@/lib/camps/availability/activenet/estimatePrice";
import {
  availabilityFromListItem,
  fetchActiveNetActivityList,
  type ActiveNetListItem,
} from "@/lib/camps/availability/activenet/listClient";
import { matchActivityNumbers } from "@/lib/camps/availability/activenet/matchIds";
import { seatAvailabilityFromSpaceKind } from "@/lib/camps/availability/activenet/seatAvailability";
import { MISSISSAUGA_WINTER_2026_LISTED } from "@/data/camps/real/mississaugaWinter2026EligibleList";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function availabilityValue(item: ActiveNetListItem, retrievedAt: string) {
  const parsed = availabilityFromListItem(item);
  return {
    ...parsed,
    retrievedAt,
    seatAvailability: seatAvailabilityFromSpaceKind(parsed.kind),
  };
}

function listCatalog(item: ActiveNetListItem | undefined) {
  return {
    dailyStart: item?.dailyStart ?? null,
    dailyEnd: item?.dailyEnd ?? null,
    timeRangeRaw: item?.timeRangeRaw ?? null,
    dateRangeEnd: item?.dateRangeEnd ?? null,
  };
}

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

  const retrievedAt = new Date().toISOString();
  const report = matchActivityNumbers(
    list.items,
    MISSISSAUGA_WINTER_2026_LISTED.map((row) => ({
      activityNumber: row.publicActivityNumber,
      nameIncludes: "Winter Fun",
      nameExcludes: row.program === "Winter Fun" ? "Jr" : undefined,
    })),
  );

  const prices = new Map<number, Awaited<ReturnType<typeof fetchActiveNetEstimatePrice>>>();
  const uniqueIds = [...new Set(list.items.map((item) => item.activityId))];
  for (const activityId of uniqueIds) {
    prices.set(
      activityId,
      await fetchActiveNetEstimatePrice({ activityId, timeoutMs: config.timeoutMs }),
    );
    await sleep(200);
  }

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
      ...listCatalog(item),
      price: item ? (prices.get(item.activityId) ?? null) : null,
      availabilityNow: item ? availabilityValue(item, retrievedAt) : null,
    };
  });

  const unmatchedListRows = report.unmatchedListRows.map((row) => {
    const item = list.items.find((i) => i.activityId === row.activityId);
    return {
      name: row.name,
      location: row.locationLabel,
      startDate: row.dateRangeStart,
      activityNumber: row.activityNumber,
      activityId: row.activityId,
      ...listCatalog(item),
      price: item ? (prices.get(item.activityId) ?? null) : null,
      availabilityNow: item ? availabilityValue(item, retrievedAt) : null,
    };
  });

  if (unmatchedListRows.length > 0) {
    console.error(
      `Unmatched ActiveNet list rows (${unmatchedListRows.length} of ${list.items.length}; not on the Eligible Camp List PDF):`,
    );
    for (const row of unmatchedListRows) {
      console.error(
        `- ${row.name} | ${row.location ?? "location unknown"} | ${row.startDate ?? "start unknown"} | activity number ${row.activityNumber}`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        retrievedAt,
        listRows: list.items.length,
        matchedRows: report.matched.length,
        skippedRows: list.skippedRows,
        pages: list.pages,
        missing: report.missing,
        ambiguous: report.ambiguous,
        nameWarnings: report.nameWarnings,
        unmatchedListRows,
        rows,
      },
      null,
      2,
    ),
  );
}

void main();
