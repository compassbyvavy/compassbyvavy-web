"use client";

import Link from "next/link";
import { useCallback, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  CampPackingItem,
  CampProgram,
  CampSession,
  Provider,
  Venue,
} from "@/data/camps/types";
import {
  buildAllSessionDetailRows,
  parseMatchingSessionIds,
  resolveSessionSelection,
  sanitizeCampsReturnPath,
  sessionMatchesListingFilters,
  type CampSessionDetailRow,
} from "@/lib/camps/campDetail";
import type { RegistrationDisplayStateId } from "@/lib/camps/registrationAction";

export type CampDetailClientProps = {
  program: CampProgram;
  provider: Provider;
  sessions: CampSession[];
  venuesById: Record<string, Venue>;
  nowIso?: string;
  showDevBanner?: boolean;
  /** Override provenance banner (e.g. real-dev catalog). */
  catalogBanner?: string | null;
};

function statusChipClass(state: RegistrationDisplayStateId): string {
  if (state === "registration_open") return "camp-status-chip camp-status-open";
  if (state === "waitlist") return "camp-status-chip camp-status-wait";
  return "camp-status-chip camp-status-muted";
}

function SessionFactBlock({ row }: { row: CampSessionDetailRow }) {
  const action = row.registration;
  return (
    <div className="camp-detail-selected" data-session-id={row.session.id}>
      <div className="camp-detail-selected-head">
        <h3>Selected session</h3>
        <span className={statusChipClass(action.displayState)}>{action.label}</span>
      </div>
      <dl className="camp-card-meta">
        <div className="camp-card-meta-row">
          <dt>Venue</dt>
          <dd>{row.venueLabel}</dd>
        </div>
        <div className="camp-card-meta-row">
          <dt>Dates</dt>
          <dd>{row.datesLabel}</dd>
        </div>
        <div className="camp-card-meta-row">
          <dt>Eligibility</dt>
          <dd>
            {row.ageEligibilityLabel}
            {row.ageAssessmentNote ? (
              <span className="camp-card-note"> · {row.ageAssessmentNote}</span>
            ) : null}
          </dd>
        </div>
        <div className="camp-card-meta-row">
          <dt>Hours</dt>
          <dd>{row.hoursLabel}</dd>
        </div>
        <div className="camp-card-meta-row">
          <dt>Care</dt>
          <dd>{row.careLabel}</dd>
        </div>
        <div className="camp-card-meta-row">
          <dt>Price</dt>
          <dd>{row.priceLabel}</dd>
        </div>
      </dl>
      {row.session.feeNotes ? (
        <p className="camp-card-note">Fee notes: {row.session.feeNotes}</p>
      ) : null}
      <div className="camp-detail-reg-actions">
        {action.buttonText && action.href ? (
          <a
            className="camp-card-cta"
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {action.buttonText}
          </a>
        ) : (
          <p className="camp-card-note" role="status">
            No verified outbound registration link for this session.
          </p>
        )}
      </div>
      <p className="camp-detail-source">
        {row.sourceCheckedDate ? (
          <>
            Source checked {row.sourceCheckedDate}
            {row.providerConfirmed === true
              ? " · provider confirmed"
              : row.providerConfirmed === false
                ? " · source-checked only (not provider-confirmed)"
                : " · confirmation status unknown"}
            {row.sourceUrl ? (
              <>
                {" · "}
                <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
                  View source
                </a>
              </>
            ) : null}
          </>
        ) : (
          <>Source check date to confirm</>
        )}
      </p>
    </div>
  );
}

function NarrativeSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="camp-detail-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

/** Accessible, initially collapsed disclosure — Enter/Space via native summary. */
function CollapsedDetailSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="camp-detail-accordion" id={id}>
      <summary className="camp-detail-accordion-summary">{title}</summary>
      <div className="camp-detail-accordion-body">{children}</div>
    </details>
  );
}

function PackingLists({ items }: { items: CampPackingItem[] }) {
  const required = items.filter((i) => i.kind === "required");
  const suggested = items.filter((i) => i.kind === "suggested");
  return (
    <div className="camp-detail-packing">
      <div>
        <h3>Provider-required</h3>
        {required.length === 0 ? (
          <p className="camp-card-note">No provider-required items verified.</p>
        ) : (
          <ul>
            {required.map((i) => (
              <li key={`req-${i.text}`}>{i.text}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3>Suggested (not required)</h3>
        {suggested.length === 0 ? (
          <p className="camp-card-note">No suggested items listed.</p>
        ) : (
          <ul>
            {suggested.map((i) => (
              <li key={`sug-${i.text}`}>{i.text}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function matchBadge(
  matched: boolean | null,
): { label: string; className: string } | null {
  if (matched === null) return null;
  if (matched) {
    return {
      label: "Matched your filters",
      className: "camp-detail-match-badge camp-detail-match-yes",
    };
  }
  return {
    label: "Other session (did not match filters)",
    className: "camp-detail-match-badge camp-detail-match-other",
  };
}

export function CampDetailClient({
  program,
  provider,
  sessions,
  venuesById,
  nowIso,
  showDevBanner = false,
  catalogBanner = null,
}: CampDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = nowIso ? new Date(nowIso) : undefined;

  const sessionParam = searchParams.get("session");
  const returnTo = sanitizeCampsReturnPath(searchParams.get("from"));
  const matchingSessionIds = useMemo(
    () => parseMatchingSessionIds(searchParams.get("matches"), sessions),
    [searchParams, sessions],
  );

  const selection = useMemo(
    () => resolveSessionSelection(sessions, sessionParam),
    [sessions, sessionParam],
  );

  const rows = useMemo(
    () => buildAllSessionDetailRows(sessions, venuesById, { now }),
    [sessions, venuesById, now],
  );

  const orderedRows = useMemo(() => {
    if (matchingSessionIds == null) return rows;
    const matchSet = new Set(matchingSessionIds);
    const matched = rows.filter((r) => matchSet.has(r.session.id));
    const other = rows.filter((r) => !matchSet.has(r.session.id));
    return [...matched, ...other];
  }, [rows, matchingSessionIds]);

  const selectedRow =
    selection.kind === "selected"
      ? rows.find((r) => r.session.id === selection.selectedSessionId) ?? null
      : null;

  const setSession = useCallback(
    (sessionId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sessionId) params.set("session", sessionId);
      else params.delete("session");
      if (!params.get("from")) params.set("from", "/camps");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const packing = program.packingItems ?? [];
  const hasMatchContext = matchingSessionIds != null;
  const otherCount =
    hasMatchContext && matchingSessionIds
      ? sessions.length - matchingSessionIds.length
      : 0;

  return (
    <div className="camp-detail">
      {catalogBanner ? (
        <p className="camps-preview-banner" role="status">
          {catalogBanner}
        </p>
      ) : showDevBanner ? (
        <p className="camps-preview-banner" role="status">
          DEV ONLY — fictional camp detail via fixture gate. Not production
          directory data. Browsing does not require an account.
        </p>
      ) : null}

      <nav className="camp-detail-nav" aria-label="Camps breadcrumb">
        <Link href={returnTo}>← Back to camps</Link>
      </nav>

      <header className="camp-detail-identity">
        <p className="camp-card-provider">{provider.name}</p>
        <h1>{program.name}</h1>
        {program.primaryCategory || (program.secondaryThemes?.length ?? 0) > 0 ? (
          <div className="camp-card-pills" aria-label="Categories">
            {program.primaryCategory ? (
              <span className="camp-pill">{program.primaryCategory}</span>
            ) : null}
            {(program.secondaryThemes ?? []).map((theme) => (
              <span key={theme} className="camp-pill">
                {theme}
              </span>
            ))}
          </div>
        ) : (
          <p className="camp-card-note">Category to confirm</p>
        )}
        <dl className="camp-card-meta camp-detail-identity-meta">
          {provider.websiteUrl ? (
            <div className="camp-card-meta-row">
              <dt>Provider</dt>
              <dd>
                <a
                  href={provider.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {provider.name} website
                </a>
              </dd>
            </div>
          ) : (
            <div className="camp-card-meta-row">
              <dt>Provider</dt>
              <dd>{provider.name}</dd>
            </div>
          )}
        </dl>
        <p className="camp-detail-venue-note" role="note">
          Each session lists its own venue. A program may run at more than one
          place.
        </p>
        {program.description ? (
          <p className="camp-detail-lede">{program.description}</p>
        ) : null}
        <p className="camp-card-note">
          Use each session’s age range below — overview ages are a guide only.
        </p>
      </header>

      {selection.kind === "invalid" ? (
        <p className="camps-age-filter-notice" role="status">
          {selection.notice}
        </p>
      ) : null}

      <NarrativeSection id="camp-detail-sessions" title="Sessions">
        {rows.length === 0 ? (
          <p role="status">
            Upcoming dates not yet verified. No session rows are invented for
            this program.
          </p>
        ) : (
          <>
            <p className="camp-detail-section-lede">
              Each row is one session with its own dates, venue, ages, hours,
              care, price, and registration.
            </p>
            {hasMatchContext && otherCount > 0 ? (
              <p className="camps-age-filter-notice" role="status">
                Showing {matchingSessionIds!.length} session
                {matchingSessionIds!.length === 1 ? "" : "s"} that matched your
                listing filters, plus {otherCount} other session
                {otherCount === 1 ? "" : "s"} for this program.
              </p>
            ) : null}
            <fieldset className="camp-detail-session-fieldset">
              <legend className="visually-hidden">
                Select a camp session for {program.name}
              </legend>
              <div className="camp-detail-table-wrap">
                <table className="camp-detail-table">
                  <thead>
                    <tr>
                      <th scope="col">Select</th>
                      <th scope="col">Dates</th>
                      <th scope="col">Venue</th>
                      <th scope="col">Ages</th>
                      <th scope="col">Hours</th>
                      <th scope="col">Care</th>
                      <th scope="col">Price</th>
                      <th scope="col">Registration</th>
                      {hasMatchContext ? (
                        <th scope="col">Filter match</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {orderedRows.map((row) => {
                      const selected =
                        selection.kind === "selected" &&
                        selection.selectedSessionId === row.session.id;
                      const matched = sessionMatchesListingFilters(
                        row.session.id,
                        matchingSessionIds,
                      );
                      const badge = matchBadge(matched);
                      const radioLabel = `Select session ${row.datesLabel} at ${row.venueLabel}`;
                      return (
                        <tr
                          key={row.session.id}
                          data-session-id={row.session.id}
                          data-filter-match={
                            matched == null
                              ? undefined
                              : matched
                                ? "yes"
                                : "no"
                          }
                          className={selected ? "is-selected" : undefined}
                        >
                          <td>
                            <input
                              type="radio"
                              name="camp-session"
                              checked={selected}
                              aria-label={radioLabel}
                              onChange={() => setSession(row.session.id)}
                            />
                          </td>
                          <td>{row.datesLabel}</td>
                          <td>{row.venueLabel}</td>
                          <td>
                            {row.ageEligibilityLabel}
                            {row.ageAssessmentNote ? (
                              <span className="camp-card-note">
                                {" "}
                                ({row.ageAssessmentNote})
                              </span>
                            ) : null}
                          </td>
                          <td>{row.hoursLabel}</td>
                          <td>{row.careLabel}</td>
                          <td>{row.priceLabel}</td>
                          <td>
                            <span
                              className={statusChipClass(
                                row.registration.displayState,
                              )}
                            >
                              {row.registration.label}
                            </span>
                          </td>
                          {hasMatchContext && badge ? (
                            <td>
                              <span className={badge.className}>
                                {badge.label}
                              </span>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </fieldset>
            {selection.kind !== "selected" ? (
              <p className="camp-card-note">
                Select a session to focus eligibility, hours, care, price, and
                registration — or open a flat listing result that pre-selects
                one.
              </p>
            ) : null}
          </>
        )}
      </NarrativeSection>

      {selectedRow ? <SessionFactBlock row={selectedRow} /> : null}

      <NarrativeSection id="camp-detail-experience" title="Experience">
        {program.experienceSummary?.trim() ? (
          <p>{program.experienceSummary}</p>
        ) : (
          <p className="camp-card-note">Experience details to confirm.</p>
        )}
      </NarrativeSection>

      <NarrativeSection id="camp-detail-prerequisites" title="Prerequisites">
        {program.prerequisites && program.prerequisites.length > 0 ? (
          <ul>
            {program.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="camp-card-note">
            No provider-confirmed prerequisites verified.
          </p>
        )}
      </NarrativeSection>

      <NarrativeSection id="camp-detail-support" title="Support information">
        {program.supportInfo?.trim() ? (
          <p>{program.supportInfo}</p>
        ) : (
          <p className="camp-card-note">Support information to confirm.</p>
        )}
        {(program.accessibilitySupportTags?.length ?? 0) > 0 ? (
          <ul>
            {program.accessibilitySupportTags!.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
      </NarrativeSection>

      <CollapsedDetailSection
        id="camp-detail-cancellation"
        title="Cancellation Policy"
      >
        {program.policiesSummary?.trim() ? (
          <p>{program.policiesSummary}</p>
        ) : (
          <p className="camp-card-note">
            Cancellation policy not verified — confirm with the provider.
          </p>
        )}
      </CollapsedDetailSection>

      <CollapsedDetailSection id="camp-detail-packing" title="What to Bring">
        {packing.length === 0 ? (
          <p className="camp-card-note">
            Packing list not verified — nothing is marked required or suggested
            here.
          </p>
        ) : (
          <PackingLists items={packing} />
        )}
      </CollapsedDetailSection>

      <NarrativeSection id="camp-detail-prep" title="Preparation">
        {program.preparationNotes?.trim() ? (
          <p>{program.preparationNotes}</p>
        ) : (
          <p className="camp-card-note">Preparation notes to confirm.</p>
        )}
      </NarrativeSection>
    </div>
  );
}
