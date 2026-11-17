/**
 * Review pack markdown. The script writes the file; this function only formats
 * facts that are already on the listing.
 */
import { formatLongDate } from "@/lib/camps/campPage";
import { flagsForCamp, breakPrices } from "@/lib/camps/pages/flags";
import { previewPath, tokenExpiresOn, type BatchToken } from "@/lib/camps/pages/preview";
import { ASK_THE_CAMP, type CampListing, type Sourced, type WatcherSignal } from "@/lib/camps/pages/types";
import type { LinkCheck } from "@/lib/camps/pages/flags";

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function factRow(field: string, sourced: Sourced): string {
  const value = sourced.value?.trim() ? sourced.value : ASK_THE_CAMP;
  const detail = sourced.detail?.trim() ? ` (${sourced.detail.trim()})` : "";
  const source = sourced.sourceUrl ?? "";
  const checked = sourced.checkedOn ? formatLongDate(sourced.checkedOn) : "";
  return `| ${cell(field)} | ${cell(value + detail)} | ${cell(source)} | ${cell(checked)} |`;
}

export function renderReviewPack(input: {
  batch: BatchToken;
  listings: CampListing[];
  today: string;
  watcher?: Record<string, WatcherSignal | undefined>;
  links?: Record<string, LinkCheck | undefined>;
}): string {
  const expires = tokenExpiresOn(input.batch.createdOn);
  const lines: string[] = [
    `# Batch ${String(input.batch.batch).padStart(2, "0")} review pack`,
    "",
    "No fact below was guessed. A missing fact is Ask the camp.",
    `The preview token stops working on ${formatLongDate(expires)}, or when this batch is published.`,
    "Open a preview on a branch deploy by putting that site's origin in front of the path. The pages are not linked from the public site.",
    "",
  ];

  const summaries: string[] = [];
  for (const listing of input.listings) {
    const flags = flagsForCamp(listing, {
      today: input.today,
      breakPrices: breakPrices(input.listings, listing.breakId),
      watcher: input.watcher?.[listing.slug] ?? null,
      link: input.links?.[listing.slug] ?? null,
    });
    const path = previewPath(listing, input.batch.token);
    lines.push(`## ${listing.provider} — ${listing.name}`, "");
    lines.push(`Preview: ${path}`, "");
    lines.push("| Field | Value | Source | Checked |", "| --- | --- | --- | --- |");
    lines.push(factRow("Ages", listing.ages));
    lines.push(factRow("Dates", listing.dates));
    lines.push(factRow("Price", listing.price));
    lines.push(factRow("Hours", listing.hours));
    lines.push(factRow("Before & after care", listing.care));
    lines.push(factRow("Lunch", listing.lunch));
    if (listing.registerUrl) lines.push(`| Register link | ${cell(listing.registerUrl)} |  |  |`);
    for (const source of listing.sources) {
      lines.push(
        `| Source | ${cell(source.label)} | ${cell(source.url)} | ${source.checkedOn ? cell(formatLongDate(source.checkedOn)) : ""} |`,
      );
    }
    lines.push("");
    if (!flags.length) lines.push("**Flags:** No flags", "");
    else {
      lines.push("**Flags:**", "");
      for (const flag of flags) lines.push(`- ${flag}`);
      lines.push("");
    }
    summaries.push(`- ${listing.provider} — ${listing.name}: ${flags.length} flag${flags.length === 1 ? "" : "s"} — ${path}`);
  }

  lines.push("## Summary", "");
  lines.push(...summaries);
  lines.push("");
  return lines.join("\n");
}
