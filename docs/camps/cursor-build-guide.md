# Building the Camps page in Cursor — a working guide

Run these **one at a time**, review each diff before moving to the next. Don't paste the whole
document into Cursor at once — that's exactly the "one large change, hope it's right everywhere"
failure mode we're trying to avoid.

## Before you start: attach these four things to Cursor's context

Drop these into the repo (a `/docs/camps/` folder works well) so Cursor can `@`-reference them in
every prompt below, rather than you re-explaining each time:

1. `compass-camps-page-spec.md` — the full spec (just saved)
2. `camp_card_and_detail_mockup.html` — real HTML/CSS in your actual brand
3. `camps_listing_page_mockup.html` — same, for the browse/directory page
4. Your Camp Research Master workbook, or just its **Providers / Camp Programs / Camp Sessions /
   Venues** sheets exported as CSV — Cursor reads real column structure far more reliably than a
   prose description of it

## Assumptions baked into these prompts

Next.js App Router, TypeScript, Tailwind, Supabase. If any of those are wrong, tell Cursor so in
Prompt 1 — everything downstream adapts automatically since each prompt tells Cursor to match
whatever it finds in the existing codebase, not to assume from scratch.

---

## Prompt 1 — Types and design tokens (foundation)

```
Before writing anything, inspect this codebase: how are TypeScript types organized, is Tailwind
configured, and how are design tokens (colors, fonts) currently defined? Match those existing
conventions rather than introducing a new pattern.

Then, from @compass-camps-page-spec.md and the Provider/Camp Programs/Camp Sessions/Venues sheets
attached:

1. Define TypeScript types for Provider, CampProgram, CampSession, and Venue. Camp Programs needs
   fields for: primary category, secondary themes (array), age min/max (numbers) with inclusive/
   exclusive flags, age-assessed-at-date, audience, accessibility/support tags. Camp Sessions needs:
   dates, format, price + unit + currency, before/after-care flags with actual times, registration
   status (matching the five states in the spec's "Registration status → action" table), source
   URL, source-checked date, provider-confirmed flag.

2. Add design tokens for this palette if they aren't already in the Tailwind config: pine #33503E,
   pine-ink #1F2E25, pine-soft #E7EDE6, amber #A8763A, amber-deep #8A5F2A, amber-soft #F3E7D3,
   ivory #FAF8F3, line #E4DFD2, muted #6E7568. Fonts: Newsreader for headings, Inter for body —
   check @camp_card_and_detail_mockup.html for the exact font weights/sizes in use.

Don't build any UI yet — just types and tokens. Show me the diff before we continue.
```

## Prompt 2 — Registration status → action logic

```
From @compass-camps-page-spec.md's "Registration status → action" table: write a single pure
function that takes a CampSession and returns the correct display state — label text, button text
(or none), and whether it links out. It must implement all five states plus the two edge cases
("Upcoming dates not yet verified" and a failed-to-load state), and must never show a generic
register action for a confirmed full/closed session unless a waitlist is specifically known to
exist.

This function is the single source of truth — it must be the only place that decides registration
display state. Every component that shows a status (card, grouped summary, flat row, detail page)
calls this function; none of them re-derive or hardcode status text themselves. Write a few unit
tests covering each of the five states plus both edge cases.
```

## Prompt 3 — Camp card component

```
Build the CampCard component matching @camp_card_and_detail_mockup.html visually (same tokens,
spacing, tag/pill style). It takes a CampProgram plus its matching sessions and renders: provider,
program name, description, category/theme tags, age range, and — using the status function from
Prompt 2 — the right status chip and price.

Per the spec: if this card represents a grouped program with sessions in different registration
states, show a qualified summary (e.g. "2 of 3 sessions open"), never a single blanket status badge.
If venue or price is unconfirmed, show "Venue to confirm" / "Check with provider" rather than
guessing or omitting.

Use mock data for now — a few programs with multiple sessions in different states, including at
least one mixed-status case. Show me the component rendered before moving on.
```

## Prompt 4 — Listing/directory page

```
Build the Camps listing page matching @camps_listing_page_mockup.html: compact intro, search bar
(age + dates + keyword), quick-browsing chips (All dates/Summer/March Break/Winter Break/PA Days/
Weekends), results count + Filters button + Sort, the filters panel (age, theme, schedule/format,
audience, accessibility & support, location, practical needs — per the spec's filter section),
results grid using CampCard from Prompt 3, an optional collections teaser clearly marked
supplementary, and the coverage/trust footer.

Add the "Group sessions by camp" toggle from the spec's grouped/flat section — on by default,
switching between one-card-per-program and one-row-per-session. Implement the filtering rule
exactly as specified: every filter condition must apply to the *same* session before grouping —
never stitch one session's price to another session's hours.

No login/account required to view results — the whole page stays public per the spec's access
rules. Use the mock data from Prompt 3, extended with a couple more programs so grouping is
visually obvious.
```

### Settled Prompt 4 decisions (filters & layout)

Recorded once so earlier layout suggestions are not treated as a second, parallel requirement.
These amend Prompt 4 presentation only; behaviour still follows the page spec and prior
amendments (same-session filtering, registration helper, session-owned ages, etc.).

- **Desktop filters:** one persistent sidebar with expandable filter groups. Do **not** also
  ship a duplicate horizontal filter bar.
- **Mobile filters:** the same filters in a drawer, sharing the same state and filtering logic
  as the desktop sidebar.
- **Top area:** compact search, shortcuts (e.g. timing chips), and result controls (count, sort,
  grouped/flat toggle, mobile Filters affordance). Not another complete filter interface.
- **Cards / photos:** consistent visual treatment whether a provider has a photo or not. Use a
  neutral fallback image/placeholder. Photo availability must not affect inclusion or sorting.
- **References:** `compass-camps-page-spec.md` and explicit amendments govern behaviour; Compass
  camps mockups and scoped camps tokens govern styling; competitor screenshots are supplementary
  layout examples only.

## Prompt 5 — Detail page

```
Build the camp detail page per @compass-camps-page-spec.md's detail-page hierarchy: identity/venue
first, then sessions (one row per session, each using the Prompt 2 status function independently —
a session table, not one summary for the whole program), eligibility, hours/care, price,
registration; then experience, prerequisites, support info, policies, "what to bring" (clearly
separating provider-required items from suggested ones), and preparation. Source and last-checked
date sit near the facts they support, not buried at the bottom.

Match @camp_card_and_detail_mockup.html's detail page visually. A flat-view result from the listing
page should land here with its specific session pre-selected; a grouped-view result should land
here with the full session table visible.
```

## Prompt 6 — Wire to Supabase

```
Now replace the mock data from Prompts 3-5 with real Supabase queries against the
Provider/CampProgram/CampSession/Venue tables (create the tables/migrations first if they don't
exist yet, matching the types from Prompt 1). Keep the grouping and filtering logic unchanged —
only the data source changes.

Implement it as: cards, grouped summaries, and detail pages all read from the same query/data
layer — no component fetches or caches session status independently. This is the spec's "shared
session truth" rule; ask me before implementing anything that would give two components separate
paths to the same fact.
```

---

## After each prompt

Check the diff against the relevant acceptance checks in `compass-camps-page-spec.md` before moving
on — they're written to be testable as-is. If Cursor's output doesn't satisfy one, that's the prompt
to iterate on before starting the next.
