# Category starter prompts

Conductor copy-paste prompts. Open **one** category chat at a time on this repo. Attach this folder (`docs/vision/`).

Daily rhythm and sequence: [`north-star.md`](./north-star.md). Rules: [`editorial-standards.md`](./editorial-standards.md). Fields: [`feature-applicability-matrix.md`](./feature-applicability-matrix.md).

Do not open all of these chats at once.

---

## Chat 1 — Play & Entertainment (open this next)

Attach: `docs/vision/`, [`lib/discover/categories.ts`](../../lib/discover/categories.ts), `app/discover/[slug]/page.tsx`, [`ComingSoonCategory.tsx`](../../components/discover/ComingSoonCategory.tsx), [`data/camps/types.ts`](../../data/camps/types.ts) as the omit-unknowns modelling reference (not the camps UI to copy), [`app/globals.css`](../../app/globals.css).

```
New Discover category: Play & Entertainment — indoor play, trampoline parks, arcades, rainy-day fallbacks, sourced for Mississauga.

Do not invent a new site or a new design system. Extend compassbyvavy-web.

1. Read docs/vision/north-star.md, editorial-standards.md, and feature-applicability-matrix.md.
2. Play is coming_soon in lib/discover/categories.ts (slug: play, href: /discover/play). Treat any names you are given — including Playdium Mississauga, Kidstown, indoor play centres — as candidates, not verified fact, until each one is source-checked with a latest-verified date.
3. Lock the Play profile template from the Feature Applicability Matrix — parent-priority fields first: age/height/weight limits, socks-only or waiver, admission structure (per-child vs flat fee, time-boxed sessions), food policy, best-for age band, rainy-day fit. Then shared fields (parking, washrooms, accessibility). There is no components/experience-detail kit in this repo; add the smallest typed catalog under data/play/ and a profile route under /discover/play/[slug]. Add a UI section only if the matrix field cannot be shown honestly.
4. Follow editorial rigor: specific and verifiable over generic; "Latest verified [date]"; omit unknowns; flag gaps instead of placeholder copy; real photos or pending slots — no stock. Use live site tokens in app/globals.css, not the camps pine/amber theme in app/camps/camps.css.
5. Build the first real profile from whichever candidate clears verification first. If verification is incomplete, ship the template + a named gap list, not invented hours/prices. Do not flip the category to available in DISCOVER_CATEGORIES until that first verified profile exists. Do not attach fake listings to the coming-soon page.
6. Keep ComingSoonCategory as the hub until the first profile is real; then replace the hub with a real browse surface that still refuses empty invention. Update lib/discover/categories.test.ts only as a consequence of a live directory. Do not add accounts, save, compare, calendar, or new ShortlistRef kinds.
```

---

## Parks & Nature

```
New Discover category: Parks & Nature — Mississauga shorelines, trails, playgrounds, conservation areas.

Slug: parks. Hub: /discover/parks (currently ComingSoonCategory). Read docs/vision/*. Start from the Feature Applicability Matrix for parks (playground zones/surfaces, splash, shade, picnic, water safety, seasonal washrooms, parking, stroller). There is no Lighthouse / J.C. Saddington page in this checkout — do not invent a third park format if you add a signature template; that template becomes the one to reuse. Candidates until verified. Flag gaps. Real photos or pending. Live site tokens in app/globals.css, not camps theme. Do not flip DISCOVER_CATEGORIES to available on an empty directory. No accounts / save / compare / new shortlist kinds.
```

---

## Learning & Culture

```
New Discover category: Learning & Culture — museums, libraries, galleries, science centres, heritage sites in Mississauga.

Slug: learning. Hub: /discover/learning. Read docs/vision/*. Start from the Feature Applicability Matrix (exhibit pace, bag/stroller rules, quiet hours, drop-in vs timed ticket, membership). Round out the profile template in parent-priority order. Any names supplied in-thread are candidates. First real profile = first one that clears verification. Same editorial rigor, /discover/learning/[slug], same "do not invent" rule. Do not treat a library building as a dated storytime listing. Live site tokens. No accounts/save/compare.
```

---

## Food & Treats

```
New Discover category: Food & Treats — family-friendly restaurants, ice cream, kid-approved spots in Mississauga.

Slug: food. Hub: /discover/food. Read docs/vision/*. Matrix first: high chairs, kids menu, noise, typical wait, change table, outdoor seating, reservations. Then shared fields. Lowest trust-stakes category — still no invented hours or "best in the city" claims. First verified profile only before flipping coming_soon → available. Live site tokens. No accounts/save/compare.
```

---

## Travel & Getaways

Open after Play / Parks / Learn / Food have their first profiles, or sooner only if the founder wants the fastest existing-win thread **and** attaches a write-up.

```
New Discover category: Travel & Getaways — day trips and worth-the-drive destinations from Mississauga.

Slug: travel. Hub: /discover/travel. Read docs/vision/*. Lock the Travel template from the matrix (drive time, boat/operator options, packing, weather backup, picnic). This repo does not contain flowerpot-island.ts or WorthTheDrivePage — do not assume they exist.

If a "Worth the Drive: Tobermory" (or other) write-up and founder photos are provided in-thread or added to the repo, compose that page from that copy only; flag anything the write-up does not cover; leave Founder Note and Final Verdict empty for the founder; real photos or pending slots — no stock. If no write-up is provided, ship the template + gap list only. Do not invent a destination from tourism sites. Confirm the route (/discover/travel/[slug] vs a dedicated destination URL) before adding the page. Live site tokens, not camps theme. No accounts/save/compare.
```

---

## Camps (after sourcing decision)

Listing UI already exists. This chat is not “build `/camps` from scratch.”

```
Camps — production data and sourcing, not a new directory UI.

Read docs/camps/compass-camps-page-spec.md, docs/camps/INGESTION_ARCHITECTURE.md, docs/vision/editorial-standards.md, and data/camps/types.ts.

Do not write the first production camp profile until we answer: how Compass sources camps the founder has not personally visited, without breaking the on-the-ground trust model. Propose 2–3 sourcing tiers (founder-visited / source-checked / provider-confirmed) consistent with the spec. Automation may propose facts via lib/camps/ingestion; it must not auto-publish.

Then, only with real Mississauga records (never data/camps/fixtures.dev.ts, never gated real-dev as production), populate the approved catalog that app/camps/page.tsx already reads through loadCampsCatalogForRequest. Keep Provider / Program / Session / Venue distinct. Registration action mapping in the spec is law. Do not weaken shared session truth, empty-production honesty, or the review-preview gate.
```

---

## Classes & Programs

Open only after the camps production pattern is moving.

```
New Discover category: Classes & Programs — recurring lessons: swim, dance, music, art, sports, tutoring in Mississauga. Separate from Camps.

Slug: classes. Hub: /discover/classes. Read docs/vision/* and docs/camps/compass-camps-page-spec.md. Borrow camps session/eligibility/hours/price-unit/registration-action patterns; do not invent a third registration model. Keep "STEM" / term dates / "half-day" as distinct filters. Candidates until verified. First verified program+session before flipping available. Live site tokens unless a later conductor decision scopes a classes theme. No accounts/save/compare.
```

---

## Shopping

```
New Discover category: Shopping — toy stores, kids' consignment, family-friendly retail in Mississauga.

Slug: shopping. Hub: /discover/shopping. Read docs/vision/*. Standard venue template: parking, stroller aisles, change table, play corner, new vs consignment, latest-verified hours. Nothing urgent. First verified profile only. No invented "hidden gem" shops. Live site tokens. No accounts/save/compare.
```

---

## Events

```
New Discover category: Events — festivals, seasonal happenings, free community days in Mississauga.

Slug: events. Hub: /discover/events. Read docs/vision/*. Do not clone a static place profile. First output is the sourcing-and-refresh process: dated records with timezone, expiry, rain plan, next refresh date, "no dated events invented." An empty weekend rail is correct. Only then a first event that has real start/end and a verification date. Live site tokens. No accounts/save/compare.
```

---

## Services — do not open yet

When it is time, chat #1 is governance only:

```
Services is not a Discover directory that inherits Play's template.

Before any listing is sourced, define: directory-facts vs editorial vs prohibited claims; who can approve a row; what Compass will never say (treatment quality, "best pediatrician"); how this review process differs from Discover; health and allergy data never auto-shared with a provider. Expand app/privacy/page.tsx in that same change if Profile-adjacent data is in scope. Until those rules exist, /discover/services stays an honest placeholder — not a provider directory.
```

---

## Later pillars (prompts exist; chats stay closed)

### Decide (cross-category)

Only after two Discover categories are actually excellent.

```
Extend guest shortlist beyond camps. Read lib/shortlist/types.ts, lib/shortlist/compare.ts, app/saved/. One saved list across live categories; side-by-side compare for dates, cost, eligibility; still works with no account. Store stable public IDs only. Do not require assigning a child. Do not rank incomparable prices. Do not treat /saved/tracker as Plan.
```

### Plan

```
Calendar overlay of saved and registered activities, sibling view, registration-deadline tracking. Requires reliable dated session/event data. Do not fabricate a school calendar. Optional until Camps (and later Classes) session truth is production-quality.
```

### Profile

```
Opt-in child profiles and interest-tag matching. Privacy in the same PR as the feature: delete anytime, never sold, health/allergy never auto-shared with a provider. Expand app/privacy/page.tsx in that change. Transferring family info into a provider form is a separate consented integration, not automatic. Browse stays public without a profile.
```

### Learn (guides)

```
Age-and-stage guides and seasonal playbooks only when Discover has enough verified Mississauga facts to make the advice concrete. No generic "10 things to do with kids" listicles.
```
