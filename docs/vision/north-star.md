# Compass by Vavy — north star

Household intelligence for parents. This folder is the conductor bible: what Compass is, what is already live in this repo, and the order we build in.

The six-pillar vision is the **north star**. It is **not** the build order. Building all pillars — or all Discover categories — at once is how delightful dies.

If a longer vision document or Mississauga/Oakville master list is later added to the repo, reconcile it here rather than duplicating a second source of truth.

## The six pillars

| Pillar | Job | When |
| --- | --- | --- |
| **Discover** | Verified places, programs, and outings a parent can actually use. | **Now.** One category at a time until that category has a template and one verified Mississauga profile. |
| **Decide** | One saved list across categories, plus side-by-side compare (dates, cost, eligibility) that works for a guest. | After Discover has at least two excellent categories a parent would actually compare. Camps already has a guest shortlist — do not rebuild it, and do not expand it to empty categories. |
| **Plan** | Calendar overlay, sibling view, registration-deadline tracking. | After Decide works without an account, and session/date data is reliable. |
| **Profile** | Opt-in child profiles, family preferences, milestone-aware suggestions. Privacy ships in the same change, not later. | After Plan. |
| **Learn** | Age-and-stage guides and seasonal playbooks. | After enough verified activity data exists to make the advice concrete instead of generic. |
| **Services & Community** | Pediatricians, childcare, Camp Buddies — separately governed. | **Last.** A wrong splash-pad fact is annoying; a wrong pediatrician fact is a different category of harm. |

```
Discover (Mississauga, one category at a time)
  → Decide (guest save + compare across real categories)
    → Plan (calendar, siblings, deadlines)
      → Profile (opt-in personalization + privacy)
        → Learn (guides grounded in verified data)
          → Services & Community (own review process)
```

## Market

**Mississauga is the market.** Coverage is an ongoing process, not a promise that nothing is missing. Oakville verification method (on-the-ground, dated, source-checked) carries over; it does not mean Oakville is the hub to fill next.

Camps positioning, which every other directory should echo: *Every [place] we can verify — not just our favourites.* Pair it with an explanation of verification and a “Know one we missed?” route.

## What is already true in this repo

Do not wipe or rebuild the foundation.

| Surface | Path | Status |
| --- | --- | --- |
| Homepage + waitlist | [`app/page.tsx`](../../app/page.tsx) | Live. Discover grid is driven by the category map. |
| Discover IA | [`lib/discover/categories.ts`](../../lib/discover/categories.ts) | Ten vision categories in order. **Camps is the only `available` directory.** |
| Discover placeholders | `app/discover/[slug]/page.tsx`, [`ComingSoonCategory.tsx`](../../components/discover/ComingSoonCategory.tsx) | Honest coming-soon pages. No fake listings. |
| Camps listing + detail | [`app/camps/page.tsx`](../../app/camps/page.tsx), `app/camps/[slug]/page.tsx` | Built. Production catalog stays empty until verified records exist. Dev fixtures are gated. |
| Camps spec | [`docs/camps/compass-camps-page-spec.md`](../camps/compass-camps-page-spec.md) | Authoritative camps behavior. |
| Camps ingestion | [`docs/camps/INGESTION_ARCHITECTURE.md`](../camps/INGESTION_ARCHITECTURE.md), [`lib/camps/ingestion/`](../../lib/camps/ingestion/) | Automation proposes facts. Human review establishes Compass-approved truth. Nothing auto-publishes. |
| Guest Decide (camps only) | [`app/saved/`](../../app/saved/), [`lib/shortlist/`](../../lib/shortlist/) | Device-local shortlist, compare (2–4 sessions), tracker. Kinds today: `camp_session`, `camp_program`. |
| Privacy | [`app/privacy/page.tsx`](../../app/privacy/page.tsx) | Pre-launch stub: no accounts, email for waitlist/reply only. |

**Not in this repo (do not pretend they are):** a Mississauga Activities Master List, Oakville verified export, Flowerpot / Tobermory Worth-the-Drive pages, camp research workbook rows as seed, or a place-profile component kit like `components/experience-detail/`.

Treat any list a category chat is given as **candidates** until a place has “Latest verified [date]” and real photos (or explicitly pending image slots).

## Discover category order

Open **one** category chat at a time. When its first real profile is live — or blocked on verification the founder has to do on the ground — come back to the conductor for the next prompt.

1. **Play & Entertainment** — indoor play, trampoline parks, arcades, rainy-day fallbacks. First new chat.
2. **Parks & Nature** — own chat. Shorelines, trails, playgrounds, conservation areas. There is no Lighthouse/Saddington page in this checkout; do not invent a third format later if a signature park template lands — reuse it.
3. **Learning & Culture** — museums, libraries, galleries, science, heritage.
4. **Food & Treats** — family restaurants, ice cream, kid-approved spots.
5. **Travel & Getaways** — day trips and “worth the drive.” Build the template here; only compose a Tobermory (or similar) page from a provided write-up — never from invented copy.
6. **Camps** — listing UI exists. Settle **sourcing for camps the founder has not visited** before writing the first production profile. Never ship [`data/camps/fixtures.dev.ts`](../../data/camps/fixtures.dev.ts) as live data.
7. **Classes & Programs** — borrow the camps session / eligibility / registration pattern; do not start cold.
8. **Shopping** — standard venue template; no rush.
9. **Events** — festivals and seasonal days expire. The “template” is a sourcing-and-refresh process, not a one-time profile.

**Do not open a Services starter chat.** When that day comes, the first prompt defines directory-facts vs editorial vs prohibited claims and the review process — then listings.

Camps and Travel are already moving in the product sense (Camps has UI; Travel has a coming-soon card). They do **not** jump the Play queue unless the founder explicitly wants a fastest-win parallel thread.

## Daily rhythm

One scoped prompt. One real piece shipped. Repeat.

A shipped day is one of:

- (a) category template locked (matrix fields + types + empty-state hub), or
- (b) first verified profile live, or
- (c) a named gap list of what still must be verified in person.

Not: “we sketched nine categories.”

## What later pillars look like (chats stay closed)

- **Decide (across Discover):** one saved list that can hold a park *and* a camp *and* a class; compare dates, cost, eligibility; still guest-usable. Expand [`lib/shortlist/types.ts`](../../lib/shortlist/types.ts) only when those other kinds exist as public records.
- **Plan:** week-by-week coverage, school-calendar gaps, sibling-compatible schedules. Needs reliable dated sessions. Optional until then. Tracker at `/saved/tracker` is not Plan.
- **Profile:** saved family info reused across Compass. Transferring it into a provider’s forms is a separate, consented integration, not automatic. Expand [`app/privacy/page.tsx`](../../app/privacy/page.tsx) in the same change: delete anytime, never sold, health and allergy data never auto-shared with a provider.
- **Learn:** playbooks only when Discover facts can make them specific.
- **Services & Community:** own review process. Camp Buddies last. No camp-buddy/social systems because a competitor has them.

## Conductor vs category chats

This folder is written by the **conductor** chat. Category chats read it; they do not rewrite the north star, the matrix, or the editorial rules unless the conductor asked them to.

Copy-ready prompts: [`category-starter-prompts.md`](./category-starter-prompts.md).
Editorial rules: [`editorial-standards.md`](./editorial-standards.md).
What a parent-priority profile contains: [`feature-applicability-matrix.md`](./feature-applicability-matrix.md).
