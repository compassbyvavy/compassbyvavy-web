import Link from "next/link";
import type { CampProgram, CampSession, Provider, Venue } from "@/data/camps/types";
import {
  buildCampCardSummary,
  type CampCardStatusSummary,
} from "@/lib/camps/campCardSummary";
import type { RegistrationDisplayStateId } from "@/lib/camps/registrationAction";

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

export function CampCard({
  program,
  provider,
  matchingSessions,
  venuesById,
  href,
  now,
  loadFailed,
  flatSessionNote,
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

  return (
    <article className="camp-card" data-program-id={program.id}>
      <div
        className={
          hasPhoto ? "camp-card-media" : "camp-card-media camp-card-media-fallback"
        }
        aria-hidden={hasPhoto ? undefined : true}
      >
        {hasPhoto ? (
          // Provisional fixture URLs — next/image CDN not wired for camps yet.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="camp-card-media-img"
            src={program.imageSrc!}
            alt={program.imageAlt?.trim() || `${program.name} photo`}
          />
        ) : (
          <div className="camp-card-media-placeholder" title="No photo">
            <span className="camp-card-media-mark" />
          </div>
        )}
      </div>

      <div className="camp-card-body">
        <div className="camp-card-top">
          <div>
            <p className="camp-card-provider">{provider.name}</p>
            <h3 className="camp-card-title">{program.name}</h3>
          </div>
          <span className={statusChipClass(chipState)}>
            {statusChipLabel(summary.status)}
          </span>
        </div>

        {flatSessionNote ? (
          <p className="camp-card-flat-note">{flatSessionNote}</p>
        ) : null}

        {program.description ? (
          <p className="camp-card-description">{program.description}</p>
        ) : null}

        <div className="camp-card-pills" aria-label="Categories and eligibility">
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
          {summary.eligibilityLabel ? (
            <span className="camp-pill camp-pill-amber">
              {summary.eligibilityLabel}
            </span>
          ) : (
            <span className="camp-pill camp-pill-amber">Ages to confirm</span>
          )}
        </div>

        <dl className="camp-card-meta">
          <div className="camp-card-meta-row">
            <dt>Dates</dt>
            <dd>{summary.dates.label}</dd>
          </div>
          <div className="camp-card-meta-row">
            <dt>Location</dt>
            <dd>
              {summary.venue.label}
              {summary.venue.kind === "multi" ? (
                <span className="camp-card-note">
                  {" "}
                  ({summary.venue.venueNames.join("; ")})
                </span>
              ) : null}
            </dd>
          </div>
          <div className="camp-card-meta-row">
            <dt>Hours</dt>
            <dd>
              {summary.hours.label}
              {summary.hours.careNote ? (
                <span className="camp-card-note">
                  {" "}
                  · {summary.hours.careNote}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>

        <p className={priceClass}>{summary.price.label}</p>
        {summary.price.kind === "mixed_units" ? (
          <p className="camp-card-note">{summary.price.detail}</p>
        ) : null}

        <div className="camp-card-actions">
          <Link className="camp-card-cta" href={detailHref}>
            View dates &amp; details
          </Link>
        </div>
      </div>
    </article>
  );
}
