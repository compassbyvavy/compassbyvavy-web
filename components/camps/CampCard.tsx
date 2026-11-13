import Link from "next/link";
import type { CampProgram, CampSession, Provider, Venue } from "@/data/camps/types";
import { keepRangesTogether } from "@/components/camps/keepRangesTogether";
import { SaveControl } from "@/components/shortlist/SaveControl";
import { buildCampPageView } from "@/lib/camps/campPage";
import { saveRefForCard } from "@/lib/shortlist/refs";

export type CampCardProps = {
  program: CampProgram;
  provider: Provider;
  /** Only sessions that already match the active filters. */
  matchingSessions: CampSession[];
  venuesById: Record<string, Venue>;
  href?: string;
  now?: Date;
  /** Kept for callers; the card no longer shows a load-failed state itself. */
  loadFailed?: boolean;
  flatSessionNote?: string | null;
  dateOverlapLabel?: string | null;
  ctaLabel?: string;
  groupedDisclosure?: boolean;
};

/**
 * Camp card (Nov 13 redesign). Built from the same view as the camp page, so
 * the card and the page always say the same thing: who runs it and where,
 * the spots status, then ages, dates, hours and price.
 */
export function CampCard({
  program,
  provider,
  matchingSessions,
  venuesById,
  href,
  now,
  flatSessionNote,
  ctaLabel = "See dates and details",
}: CampCardProps) {
  const view = buildCampPageView({ program, provider, sessions: matchingSessions, venuesById, now });
  const detailHref = href ?? `/camps/${program.slug}`;
  const saveRef = saveRefForCard(program, matchingSessions);
  const titleId = `camp-card-${program.id}`;

  return (
    <article className="cc" data-program-id={program.id} aria-labelledby={titleId}>
      <div className="cc-top">
        <p className="cc-by">
          {provider.name}
          {view.area ? <span> · {view.area}</span> : null}
        </p>
        <SaveControl
          refToSave={saveRef}
          label={saveRef.kind === "camp_session" ? `${program.name} session` : program.name}
          variant="heart"
        />
      </div>

      <h3 className="cc-title" id={titleId}>
        <Link href={detailHref}>{program.name}</Link>
      </h3>
      {flatSessionNote ? <p className="cc-note">{flatSessionNote}</p> : null}

      <p className={`cc-status is-${view.status.tone}`}>{view.status.text}</p>

      <dl className="cc-facts">
        {view.answers.map((a) => (
          <div key={a.label}>
            <dt>{a.label}</dt>
            <dd>{keepRangesTogether(a.value)}</dd>
          </div>
        ))}
      </dl>

      <Link className="cc-cta" href={detailHref} aria-describedby={titleId}>
        {ctaLabel} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
