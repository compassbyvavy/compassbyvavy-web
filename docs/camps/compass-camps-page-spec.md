# Compass by Vavy — Camps page specification

Working page spec, consolidated from discussion and competitor research (ActivityHero, CampMatch).
Includes first-release requirements and acceptance checks. Not an implementation-status report.

## Product direction

Build a complete-directory approach for Mississauga, with neutral inclusion criteria and unusually
clear session information. Do not impose a curated "best three" cap or exclude less-prominent
providers because of their profile or payment status. Coverage is an ongoing process, not a promise
that nothing is missing.

Suggested positioning: "Every camp we can verify — not just our favourites." Pair it with an
explanation of verification and a "Know one we missed?" route.

## First-release priorities

**Search and results come first.** Compact local heading, search, filters, normal results list/grid.
Every included camp must remain reachable. Category carousels may supplement the directory, never
replace it.

**Navigation.** Separate Camps from Classes. Browse by interest, age, school break, duration — keep
these distinct ("STEM," "March Break," "half-day" describe different things). Use local terms
(PA days, not Pro-D days).

**Filters.** Dates, age, location, activity, price, actual care hours. Show selected filters, a reset
action, understandable result counts, explicit sort order. Never silently widen the search to another
city or date range.

**Cards.** Camp name, provider, actual venue/neighbourhood, age or grade, relevant dates, core hours,
care window, price with its unit. Modest images. When filters are active, card details must describe
a session satisfying the combined criteria — not unrelated facts stitched from different sessions.

**Detail page hierarchy.** Identity and venue first, then sessions, eligibility, hours/care, price,
registration. Then experience, prerequisites, support information, policies, preparation. Source/check
information stays near the facts it supports. Packing lists must not push booking information below
the fold.

**Price and care.** Distinguish per-day / per-week / full-program prices. Show confirmed full cost for
multi-week programs when available. Separate optional overnight, meal, and care charges. State actual
before/after-care times and whether separate booking is required. Unknown fees are not zero.

**Registration action matches verified status** — see mapping below. A working registration link is
not evidence of an available seat.

**Verification.** Record source, checked date, and scope for important facts. Separate "source
checked" from "provider confirmed," and both from safety accreditation — distinct attributes, not a
ladder of guaranteed safety; identify the accrediting body and scope when accreditation is verified.
Keep Yes / No / Unknown distinct. Never add unsourced scarcity, ratings, or requirements. Separate
suggested packing items from provider-confirmed requirements.

**Access.** No account or child profile required to browse or read camp details. Each action has a
distinct purpose — a heart and a "Shortlist" button are not unexplained duplicates. General
shortlisting, when introduced, does not require assigning a child first.

**Operationally manageable v1.** Compass's existing calm visual direction, responsive cards,
mobile-friendly filters. Correction reporting, link checks, privacy-conscious outbound-click
measurement. Keep provider / program / venue / dated-session records distinct — do not confuse their
counts.

## Grouped/flat session toggle — build now

One accessible switch, "Group sessions by camp," on by default, beside the result controls (not a
nav tab). Keyboard operable, state exposed to assistive tech.

| Requirement | Specification |
|---|---|
| Group identity | Group by a stable program identifier belonging to one provider. Never merge unrelated programs on matching name/theme/provider alone. One program may have several venues. |
| Grouped view | One program card, category + matching-session info, compact "+ more matching dates/locations." Show variation in hours/eligibility rather than one universal claim. |
| Flat view | One result per actual matching session: exact dates, venue, eligibility, hours, price/unit, status. |
| Filtering | Apply every session-level condition to the *same* session before grouping. Never combine one session's price with another session's hours or eligibility. |
| Price | Grouped prices derive only from matching sessions, labelled "From," unknown fees flagged. Flat results show their own session price/unit. |
| Counts | Label programs and sessions separately — e.g. "12 camps · 37 matching sessions." Toggling changes the displayed unit, not the underlying matches. |
| State | Filters and sort persist across the switch; pagination resets to a valid page. View choice persists on return from details. |
| Detail handoff | Flat result selects its session on the detail page. Grouped result carries matching-session context. |
| Access | Both views public, no account/Plan/profile required. |

Programs awaiting verified dates stay reachable in the grouped view when no session filter rules them
out. Flat mode needs a clearly labelled, separately counted route for "camps awaiting dates" — never
fabricate session rows. Distinguish dates-not-yet-verified from confirmed-no-announced-sessions.

### Acceptance checks

1. A test program with three sessions at two venues produces one grouped card, or three flat results — never three different programs.
2. Filtering to one matching session makes *both* views describe that session's dates, venue, price, hours. Unmatched sessions cannot influence those facts.
3. Filters survive switching either direction; counts stay correctly labelled; pagination cannot create a false empty result.
4. A grouped program with mixed registration states shows a qualified summary (e.g. count of open sessions) — never a blanket "Open" badge implying every session is open.
5. A status update is reflected consistently across grouped cards, flat results, and the selected detail session, under the shared refresh policy.
6. Programs awaiting dates stay reachable without fabricated sessions. Failed requests show a loading error, not "No upcoming sessions."
7. The switch works by keyboard, exposes label/state, requires no login, on desktop or mobile.

## Shared session truth — hard rule

Cards, grouped summaries, flat results, and details derive from the same authoritative session
records and shared status rules. For the same data version, date/time, and filter context, they must
agree on dates, registration state, and availability. Registration being open does not establish a
seat is available.

Caching and search indexes are allowed, with coordinated invalidation/revalidation and freshness
metadata. Never maintain separate hand-written status values or independently generated facts for
cards vs. details.

Never silently widen locality or dates. If nothing matches, say so and offer an explicit,
parent-controlled change. (Product rule — not a confirmed diagnosis of any specific competitor bug.)

## Registration status → action

| Verified situation | Appropriate action |
|---|---|
| Provider confirms registration open | "Register with provider" — without implying a guaranteed seat |
| Confirmed no upcoming dates announced | "Check next dates with provider" |
| Provider explicitly offers a waitlist | "View provider waitlist" |
| Registration not yet opened | Show confirmed opening date; link to provider info |
| Availability unknown | "Check availability with provider" |

For unverified dates: "Upcoming dates not yet verified." Loading failure: say sessions couldn't be
loaded. Neither implies no upcoming sessions exist. A confirmed full/closed session never shows a
generic register action — show a waitlist link only when one is known to exist.

**Registration boundary:** Compass does not process registrations or payments in this release —
parents complete those steps with the provider. This describes product scope, not a liability
guarantee ("zero liability" / "no payment liability" are both overclaims).

## Later — not launch prerequisites

- **Map & comparison/shortlist** — prioritize by observed parent friction; list/map toggle on mobile; map never blocks the full list.
- **Plan** — week-by-week coverage, school-calendar gaps, sibling-compatible schedules, once session data is reliable. Optional.
- **Profile** — saved family info reused across Compass, once Plan/Profile exist. Transferring it into a provider's own forms is a separate, consented integration, not automatic.
- **Provider partnerships** — referral reporting, prefilling, or hosted checkout only when a real partnership warrants the work. Full Compass checkout is a separate, later decision.

## Do not copy or promise

- Account gates on basic directory access
- A school-district/provider-software marketing banner on the parent-facing Camps page
- "Register" beside a statement that no upcoming sessions exist
- "Required" equipment that was only inferred or suggested
- "Filling fast" / "available" / safety-verification badges without evidence
- Claims that UTMs reveal completed bookings, or that avoiding payment means "zero liability"
- Guaranteed exhaustiveness, guaranteed search rankings, or "unique to Compass" claims about maps/calendars/sibling planning
- Camp-buddy/social systems or booking infrastructure, just because a competitor has them

## Definition of a useful camp page

*A parent can answer: can my child attend this session, on these dates, at this venue, for these
hours, at this cost — and what exactly must I do next?*

## Measuring the advantage

Test whether parents find a suitable session faster, make fewer wrong matches, need fewer follow-up
calls. Monitor missing-data rates, stale links, useful provider handoffs. Record outbound clicks as
clicks — not confirmed bookings. The intended edge (broad local coverage + accurate eligibility +
real hours + clear cost + evidence-backed registration guidance) is a hypothesis to validate with
real Mississauga families, not a settled fact.
