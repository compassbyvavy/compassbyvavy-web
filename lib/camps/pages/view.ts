/**
 * Turns a camp listing into the page: six facts, a deal that ends, and the
 * "(2025–26)" tag. Nothing here invents a value.
 */
import { formatLongDate } from "@/lib/camps/campPage";
import {
  ASK_THE_CAMP,
  STALE_BEFORE,
  type CampListing,
  type Picker,
  type Sourced,
} from "@/lib/camps/pages/types";
import { parentCopy } from "@/lib/voice/copy";

export type FactDisplay = {
  label: string;
  value: string;
  detail: string | null;
  missing: boolean;
  /** True when the fact shows the (2025–26) tag. */
  stale: boolean;
};

export type BuiltCampPage = {
  slug: string;
  title: string;
  providerLine: string;
  breakLabel: string;
  summary: string | null;
  facts: FactDisplay[];
  deal: string | null;
  status: {
    tone: "wait" | "open" | "full";
    headline: string;
    detail: string | null;
    checked: string | null;
  };
  catchLine: string | null;
  confirmed: string | null;
  approved: string | null;
  picker: Picker;
  sessionsTitle: string;
  week: CampListing["week"];
  weekNote: string | null;
  activities: CampListing["activities"];
  costRows: CampListing["costRows"];
  costNote: string | null;
  beforeYouGo: CampListing["beforeYouGo"];
  refunds: CampListing["refunds"];
  sources: Array<{ label: string; url: string; checked: string | null }>;
  registerUrl: string | null;
  priceFrom: string;
  pills: Array<{ href: string; label: string }>;
};

const BREAK_LABEL = parentCopy.breaks;

export function isStaleCheck(checkedOn: string | null | undefined): boolean {
  return Boolean(checkedOn) && checkedOn! < STALE_BEFORE;
}

export function showDeal(deal: CampListing["deal"], today: string): string | null {
  if (!deal) return null;
  if (today > deal.endsOn) return null;
  return deal.text;
}

function fact(label: string, sourced: Sourced, showChecked: boolean): FactDisplay {
  const missing = sourced.value == null || sourced.value.trim() === "";
  const checked = !missing && showChecked && sourced.checkedOn ? `${parentCopy.checked} ${formatLongDate(sourced.checkedOn)}` : null;
  const detail = missing ? null : [sourced.detail?.trim() || null, checked].filter(Boolean).join(" · ") || null;
  return {
    label,
    value: missing ? ASK_THE_CAMP : sourced.value!,
    detail,
    missing,
    stale: !missing && isStaleCheck(sourced.checkedOn),
  };
}

export function seasonTag(): string {
  return parentCopy.seasonTag;
}

export function buildCampListingPage(
  listing: CampListing,
  options: { today: string; approvedOn?: string | null; summary?: string | null },
): BuiltCampPage {
  const deal = showDeal(listing.deal, options.today);
  const sessionsTitle = parentCopy.pickYourCamp;
  const pills: BuiltCampPage["pills"] = [{ href: "#sessions", label: parentCopy.pickYourCamp }];
  if (listing.costRows?.length) pills.push({ href: "#cost", label: parentCopy.cost });
  if (listing.activities && (listing.activities.quote || listing.activities.bullets.length)) {
    pills.push({ href: "#about", label: parentCopy.whatKidsDo });
  }
  if (listing.week?.length) pills.push({ href: "#week", label: parentCopy.theWeek });
  if (listing.beforeYouGo.length) pills.push({ href: "#logistics", label: parentCopy.beforeYouGo });
  if (listing.refunds.length) pills.push({ href: "#money", label: parentCopy.refunds });
  pills.push({ href: "#checked", label: parentCopy.howWeChecked });

  const sources = listing.sources.map((source) => ({
    label: source.label,
    url: source.url,
    checked: source.checkedOn ? formatLongDate(source.checkedOn) : null,
  }));
  const summarySource = options.summary === undefined ? listing.summary : options.summary;

  return {
    slug: listing.slug,
    title: listing.name,
    providerLine: `${listing.provider} · ${listing.place}`,
    breakLabel: BREAK_LABEL[listing.breakId],
    summary: summarySource?.trim() ? summarySource.trim() : null,
    facts: [
      fact(parentCopy.ages, listing.ages, false),
      fact(parentCopy.dates, listing.dates, true),
      fact(parentCopy.price, listing.price, true),
      fact(parentCopy.hours, listing.hours, false),
      fact(parentCopy.care, listing.care, false),
      fact(parentCopy.lunch, listing.lunch, false),
    ],
    deal,
    status: {
      tone: listing.registration === "open" ? "open" : listing.registration === "full" || listing.registration === "closed" ? "full" : "wait",
      headline: listing.statusHeadline,
      detail: listing.statusDetail,
      checked: listing.statusChecked,
    },
    catchLine: listing.catchLine,
    confirmed: listing.confirmedOn ? `${parentCopy.confirmed}, ${formatLongDate(listing.confirmedOn)}` : null,
    approved: options.approvedOn ? `${parentCopy.approved} ${formatLongDate(options.approvedOn)}` : null,
    picker: listing.picker,
    sessionsTitle,
    week: listing.week,
    weekNote: listing.weekNote,
    activities: listing.activities,
    costRows: listing.costRows
      ? listing.costRows.map((row) => ({
          ...row,
          note: row.noteEndsOn && options.today > row.noteEndsOn ? null : row.note,
        }))
      : null,
    costNote: listing.costNoteEndsOn && options.today > listing.costNoteEndsOn ? null : listing.costNote,
    beforeYouGo: listing.beforeYouGo,
    refunds: listing.refunds,
    sources,
    registerUrl: listing.registerUrl,
    priceFrom: listing.priceFrom,
    pills,
  };
}
