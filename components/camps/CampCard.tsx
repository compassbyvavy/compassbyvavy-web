import Link from "next/link";
import type { CampProgram, CampSession, Provider, Venue } from "@/data/camps/types";
import { SaveControl } from "@/components/shortlist/SaveControl";
import {
  buildCampCardSummary,
  moreMatchingDatesLocationsLabel,
  type CampCardStatusSummary,
} from "@/lib/camps/campCardSummary";
import type { RegistrationDisplayStateId } from "@/lib/camps/registrationAction";
import { saveRefForCard } from "@/lib/shortlist/refs";

export type CampCardProps = {
  program: CampProgram;
  provider: Provider;
  /** Only sessions that already match the active filters / preview scenario. */
  matchingSessions: CampSession[];
  venuesById: Record<string, Venue>;
  /** Detail href — listing/detail pages may not exist yet. */
  href?: string;
  now?: Date;
  loadFailed?: boolean;
  /** Optional flat-view session label shown above meta. */
  flatSessionNote?: string | null;
  /**
   * When a date-range filter is active, matching cards label overlap
   * (not exact containment).
   */
  dateOverlapLabel?: string | null;
  /** Grouped vs flat next-action label. */
  ctaLabel?: string;
  /** When true, show the spec “+ more matching dates/locations” disclosure. */
  groupedDisclosure?: boolean;
};

function statusChipClass(state: RegistrationDisplayStateId): string {
  if (state === "registration_open") return "camp-status-chip camp-status-open";
  if (state === "waitlist") return "camp-status-chip camp-status-wait";
  return "camp-status-chip camp-status-muted";
}

function statusChipLabel(status: CampCardStatusSummary): string {
  if (status.kind === "mixed") return status.label;
  return status.action.label;
}

function statusChipState(status: CampCardStatusSummary): RegistrationDisplayStateId {
  if (status.kind === "mixed") return status.displayState;
  return status.action.displayState;
}

function locationLine(
  venue: ReturnType<typeof buildCampCardSummary>["venue"],
): string {
  if (venue.kind === "unknown") return venue.label;
  if (venue.kind === "multi") return venue.label;
  return venue.label;
}

export function CampCard({
  program,
  provider,
  matchingSessions,
  venuesById,
  href,
  now,
  loadFailed,
  flatSessionNote,
  dateOverlapLabel,
  ctaLabel = "View dates & details",
  groupedDisclosure = false,
}: CampCardProps) {
  const summary = buildCampCardSummary({
    program,
    matchingSessions,
    venuesById,
    now,
    loadFailed,
  });

  const detailHref = href ?? `/camps/${program.slug}`;
  const chipState = statusChipState(summary.status);
  const priceClass =
    summary.price.kind === "known"
      ? "camp-card-price"
      : "camp-card-price camp-card-price-unknown";

  const hasPhoto = Boolean(program.imageSrc);
  const saveRef = saveRefForCard(program, matchingSessions);
  const saveLabel =
    saveRef.kind === "camp_session"
      ? `${program.name} session`
      : program.name;
  const moreMatchingNote = groupedDisclosure
    ? moreMatchingDatesLocationsLabel(matchingSessions.length)
    : matchingSessions.length > 1
      ? `${matchingSessions.length} matching sessions`
      : null;

  return (
    <article className="camp-card" data-program-id={program.id}>
      {hasPhoto ? (
        <div className="camp-card-media">
          {/* Provisional fixture URLs — next/image CDN not wired for camps yet. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="camp-card-media-img"
            src={program.imageSrc!}
            alt={program.imageAlt?.trim() || `${program.name} photo`}
          />
        </div>
      ) : null}

      <div className="camp-card-body">
        <div className="camp-card-top">
          <div className="camp-card-identity">
            <p className="camp-card-provider">{provider.name}</p>
            <h3 className="camp-card-title">{program.name}</h3>
            <p className="camp-card-place">{locationLine(summary.venue)}</p>
          </div>
          <SaveControl refToSave={saveRef} label={saveLabel} variant="heart" />
        </div>

        {flatSessionNote ? (
          <p className="camp-card-flat-note">{flatSessionNote}</p>
        ) : moreMatchingNote ? (
          <p className="camp-card-flat-note">{moreMatchingNote}</p>
        ) : null}

        <div className="camp-card-pills" aria-label="Themes and confirmed support">
          {summary.categoryLabel ? (
            <span className="camp-pill">{summary.categoryLabel}</span>
          ) : (
            <span className="camp-pill camp-pill-amber">Category to confirm</span>
          )}
          {summary.themeLabels.map((theme) => (
            <span key={theme} className="camp-pill">
              {theme}
            </span>
          ))}
          {summary.supportTags.map((tag) => (
            <span key={tag} className="camp-pill camp-pill-support">
              {tag}
            </span>
          ))}
        </div>

        <ul className="camp-card-facts">
          <li>
            <span className="camp-card-fact-label">Dates</span>
            <span>
              {summary.dates.label}
              {dateOverlapLabel && summary.dates.kind === "range" ? (
                <span className="camp-card-note"> · {dateOverlapLabel}</span>
              ) : null}
            </span>
          </li>
          <li>
            <span className="camp-card-fact-label">Hours</span>
            <span>
              {summary.hours.label}
              {summary.hours.careNote ? (
                <span className="camp-card-note"> · {summary.hours.careNote}</span>
              ) : null}
            </span>
          </li>
          <li>
            <span className="camp-card-fact-label">Ages</span>
            <span>
              {summary.eligibilityLabel ?? "Ages to confirm"}
            </span>
          </li>
        </ul>

        <div className="camp-card-footer">
          <div>
            <p className={priceClass}>{summary.price.label}</p>
            {summary.price.kind === "mixed_units" ? (
              <p className="camp-card-note">{summary.price.detail}</p>
            ) : null}
          </div>
          <span className={statusChipClass(chipState)}>
            {statusChipLabel(summary.status)}
          </span>
        </div>

        <p className="camp-card-evidence">{summary.evidence.label}</p>

        <div className="camp-card-actions">
          <Link className="camp-card-cta" href={detailHref}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
