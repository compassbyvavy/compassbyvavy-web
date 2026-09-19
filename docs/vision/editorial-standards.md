# Compass by Vavy — editorial standards

Rules every Discover (and later) chat follows. When a camps spec rule is stricter, the [camps page spec](../camps/compass-camps-page-spec.md) wins for camps. When ingestion and catalog disagree, [ingestion architecture](../camps/INGESTION_ARCHITECTURE.md) wins: automation proposes; humans publish.

## Trust model

Compass’s differentiator is verified, personally-checked information. That part does not automate away.

| Term | Meaning |
| --- | --- |
| **Candidate** | A name on a list. Not a fact. May live in notes or an internal `unverified` field. Must not be presented as a live listing. |
| **Source-checked** | A specific public source was read on a recorded date, for a recorded scope. |
| **Provider-confirmed** | The provider stated the fact (email, official page, or equivalent). Distinct from source-checked. |
| **Founder-visited** | On-the-ground verification. The gold standard for editorial voice (Founder Note, honest downsides, “best for”). |
| **Compass-approved catalog** | What parents see. Nothing auto-publishes into it. |

These are **distinct attributes**, not a ladder of guaranteed safety. Accreditation, when shown, names the body and the scope. It is not a Compass safety guarantee.

Frame public facts as **“Latest verified [date]”** — never as real-time status.

## Never invent

- Flag gaps. Omit unknowns. Unknown is not no, zero, closed, free, or eligible.
- Do not invent hours, prices, age/height/weight limits, waivers, socks policies, wait times, or “best in the city.”
- Do not invent scarcity (“filling fast”), ratings, or unsourced verification badges.
- Do not stitch one session’s price onto another session’s hours or eligibility (camps/classes).
- Do not silently widen city or date range when a search is empty.
- Suggested packing lists are not provider-required equipment.
- Empty weekend/event rails over fake festivals. The Mississauga camps empty-production state is the pattern: tell the parent we are still gathering, offer “know one we missed?”
- Real photos under `public/images/…` **or** flag image slots as pending. No stock photography. No decorative placeholder gradients pretending to be a place.

Coming-soon copy already in [`ComingSoonCategory.tsx`](../../components/discover/ComingSoonCategory.tsx) is the tone: *this category is on the map; listings are not live; we will not show placeholder parks or shops.*

## Founder voice

Founder Note and Final Verdict (or equivalent scored “should you visit”) are the founder’s. Category chats **leave those slots empty** rather than ghostwriting.

Firsthand editorial (“what the day felt like,” hidden gems, honest downsides) must not be fabricated from a website. Camps ingestion already states this: Compass may automate facts; Compass must not fabricate firsthand editorial experience.

## Guest access

No account or child profile is required to browse or read details. That is already true for Camps and must stay true for every new Discover category.

Guest shortlist ([`lib/shortlist/`](../../lib/shortlist/)) stores stable public IDs on the device only — not copied mutable prices or unpublished details. Account sync is out of scope until Profile. Do not add login walls, child-assignment gates, or “save requires account” in a category chat.

A heart and a “Shortlist” button are not unexplained duplicates. Each action needs a distinct purpose. General shortlisting, when a category gains it, does not require assigning a child first.

## Design tokens

An older prompt used pine `#33503E` / amber `#A8763A` / Newsreader + Inter as if they were site-wide. **They are the camps theme only.**

| Surface | Tokens | Where |
| --- | --- | --- |
| Global shell, homepage, Discover coming-soon, About, Privacy | Cream `#fffaf1`, green `#2e6b57`, ink `#1f2a2a`, existing type | [`app/globals.css`](../../app/globals.css) `:root` |
| Camps listing, detail, preview, saved (camps-themed) | Pine / amber / ivory, Newsreader + Inter | [`app/camps/camps.css`](../../app/camps/camps.css) under `.camps-theme` only |

Do not import `camps.css` into the root layout. Do not restyle the global shell from a category chat. New Play / Parks / Food pages follow the **live site** cream/green system unless a later conductor decision introduces a scoped theme for that category (as camps did).

## How a Discover category ships in this repo

There is no `data/mississauga-experiences.ts` or `components/experience-detail/` kit in this checkout. A category chat extends what exists:

1. Read [`docs/vision/`](./) (this file, north star, matrix, prompts).
2. Keep the coming-soon hub at `/discover/<slug>` until at least one verified profile exists. Do not attach fake listings. Do not flip [`DISCOVER_CATEGORIES`](../../lib/discover/categories.ts) to `available` on an empty directory.
3. Introduce a typed catalog under `data/<category>/` (new), with the same hard rules as [`data/camps/types.ts`](../../data/camps/types.ts): omit unknowns; never invent; keep entities distinct (place vs program vs dated session vs venue when those apply).
4. Profile route: `/discover/<slug>/[placeSlug]` (or a dedicated top-level route only if the category is as large as camps — camps earned `/camps`). Reuse global layout/tokens. Add a section component only when the [feature matrix](./feature-applicability-matrix.md) requires a field the page cannot show.
5. Real photos or pending slots. Founder Note / Final Verdict left empty for the founder.
6. Update [`lib/discover/categories.test.ts`](../../lib/discover/categories.test.ts) honestly when a category actually goes live. That test currently asserts Camps is the only live directory — change it as a consequence of a real profile, not in anticipation.
7. Surface the category from the homepage grid (already linked). Do not invent a second Discover IA. Do not add accounts, cross-category save, compare, or calendar in a category chat.
8. Do not expand [`ShortlistRef`](../../lib/shortlist/types.ts) to new kinds until Decide is opened for that category.

A parent-facing profile is useful when a parent can answer: *is this for my child, at this cost, for this amount of time, with these constraints — and what do I do next?*

## Privacy — now vs at Profile

**Now (pre-launch, already on `/privacy`):** no user accounts; no form collection; waitlist/contact email used only to reply or keep the early-access list.

**Guest shortlist now:** device-local IDs only. Not an account. Not health data.

**When Profile ships, in the same change as the feature:**

- Delete anytime.
- Never sold.
- Health and allergy data never auto-shared with a provider.
- Transferring family info into a provider’s own forms is a separate, consented step.
- Expand [`app/privacy/page.tsx`](../../app/privacy/page.tsx) in that PR — do not bolt the policy on later.

A wrong splash-pad fact and a wrong pediatrician fact are different categories of harm. Services stays out of Discover’s review process; it gets its own.

## Camps-specific reminders (other chats must not weaken these)

- Registration status is not seat availability. A working registration link does not prove a seat is open.
- Shared session truth: cards, grouped summaries, flat results, and details agree for the same data version and filter context.
- Registration action mapping lives in the camps spec — do not invent a generic “Register” on unknown or closed sessions.
- Compass does not process registrations or payments in this release.
- Ingestion never silently overwrites the approved catalog.
- Fixtures and real-dev catalogs stay gated; production remains empty until verified records are approved.

## Do not copy or promise

From the camps spec, applied site-wide:

- Account gates on basic directory access
- “Required” equipment that was only inferred
- “Filling fast” / unsourced safety badges
- Guaranteed exhaustiveness or “unique to Compass” claims about maps, calendars, or sibling planning
- Camp-buddy/social systems or booking infrastructure just because a competitor has them
- Citywide completeness
