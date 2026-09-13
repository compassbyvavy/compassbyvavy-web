# Camps ingestion architecture

Bringing external camp facts into Compass without quietly overwriting the
approved parent-facing catalog.

**Automation gathers and proposes facts. Human review establishes
Compass-approved truth.**

**Editorial rule:** Compass may automate facts. Compass must not fabricate
firsthand editorial experience.

## Purpose

Camps listing/detail pages show **approved catalog** records (`Provider`,
`CampProgram`, `CampSession`, `Venue` in `data/camps/types.ts`). External sites
change often. Ingestion observes those sources, extracts candidate facts, and
queues human review. It does **not** auto-publish into the catalog.

## Pipeline

```
SOURCE
→ SNAPSHOT
→ EXTRACTION
→ CANDIDATE
→ HUMAN REVIEW DECISION
→ FUTURE PUBLISH STEP
```

| Stage | Responsibility |
| --- | --- |
| **CampSource** | Registry row: provider, URL, canonical URL, crawl strategy/frequency, check interval, next check, extractor key, last check/success/change/error, last content hash. |
| **CampSourceSnapshot** | Immutable fetch result: content hash, raw content or ref, fetch status (`success` / `not_modified` / `blocked` / `error` / `unsupported`). |
| **CampExtractionRun** | One extractor pass over a snapshot (versioned), with status and warnings. |
| **CampExtractedRecord** | Raw + normalized fields for provider / program / session / venue, with per-field observations and confidence. |
| **CampCandidate** | Match to catalog (or new), field `changeSet`, status, review reason, quality flags, pipeline outcome. |
| **Review** | A person decides approve / reject / ignore / needs review. Field-level decisions append to `camp_review_decisions`; candidate status is synced for the queue. Approve still does not publish. |
| **Catalog** | Published types only. No ingestion code path writes them. |

Never silently overwrite approved catalog data from external sources.

## One cycle

`runDueCampSources` (`lib/camps/ingestion/runner/runDueCampSources.ts`) is the
whole loop:

1. **List due sources** — `nextCheckAt` has passed (or was never set) and the
   source is active.
2. **Skip what a machine must not read** — only `crawl_strategy: html` is
   fetched. `manual`, `browser`, `pdf`, and `api` sources are marked checked and
   unsupported *without a request*.
3. **Fetch once** — one request per source per cycle, sequentially. A camp
   provider's site is not a load test.
4. **Save the snapshot**, including failures. A blocked or errored fetch is
   evidence, not an exception to swallow.
5. **Hash gate** — `decideExtraction`. Byte-equivalent content stops here:
   no extraction, no matching, no review item.
6. **Clean the HTML** — regex-based text/heading/link extraction, no DOM
   library.
7. **Extract** — the registry picks a site-specific extractor when one claims
   the page, otherwise the discounted generic reader.
8. **Match, diff, queue** — deterministic matchers against published rows,
   `generateChangeSet` for CURRENT vs PROPOSED, quality flags, and a
   `needs_review` / `new` / `matched` candidate.
9. **Update the source row** — last checked/succeeded/changed, content hash,
   next check.

Failures are isolated per source: one broken page is recorded in the run
summary and the cycle continues.

### Only stated facts are diffed

A field the source did not state is not proposed as `null` and never reported as
removed. An incomplete read must not look like a deletion. Whole sessions that
disappear are handled separately (below).

### Retry semantics

A failed fetch or a failed extraction deliberately **does not** record the
content hash. The next cycle sees the content as new and tries again. Recording
the hash on failure would gate out the retry forever.

## Real fetching

`HttpCampSourceFetcher` (`lib/camps/ingestion/httpFetcher.ts`) is the only
module that opens a socket.

| Control | Behaviour |
| --- | --- |
| Allowlist | Only source ids passed to the fetcher are requested. Anything else records an `unsupported` snapshot with `source_not_in_fetch_allowlist` — no socket. |
| Identity | Requests carry the Compass bot user agent with a contact URL. |
| Budget | One request per source per cycle, an `AbortController` timeout, a redirect cap, and a response byte cap. |
| Conditional | `ETag` / `Last-Modified` from the previous snapshot are replayed, so a provider can answer `304` instead of resending the page. A `304` reuses the previous hash and reports `not_modified`. |
| Redirects | Followed manually, and every hop is re-checked for SSRF safety. |
| Content type | `text/html`, `application/xhtml+xml`, `text/plain`. Anything else is `unsupported`. |
| Refusals | 401/403/405/406/429/451 record `blocked`, keeping `Retry-After`. |
| Bot walls | Challenge markers (CAPTCHA, browser-verification interstitials) record `blocked` with `bot_challenge_detected`. |

Registration and allowlisting are separate decisions
(`lib/camps/ingestion/sources/seedSources.ts`): registering a source records
that a page exists and how it would be read; allowlisting opts it into network
requests. Widening the allowlist is a code change with a diff and a reviewer.

Live fetching is also gated per process by `COMPASS_CAMPS_LIVE_FETCH`
(`lib/camps/ingestion/devGate.ts`). Absent that variable, ingestion runs
entirely on fixtures and saved benchmark HTML.

### No challenge bypass

A bot wall is recorded honestly and left alone. No headless browsers, no CAPTCHA
solving, no cookie replay, no crawler that walks a site. If a provider does not
want automated reads, the answer is a manual source row, not a workaround.

## SSRF defence

`lib/camps/ingestion/security/ssrf.ts` classifies a target before any request
and again for every redirect hop:

- **Scheme** — `http:` / `https:` only. `file:`, `ftp:`, `gopher:`, and
  `data:` are refused.
- **Port** — default, 80, or 443.
- **Credentials** — a URL carrying a username or password is refused.
- **Host** — loopback (`localhost`, `127.0.0.0/8`, `::1`), link-local
  (`169.254.0.0/16`, including the `169.254.169.254` cloud metadata endpoint),
  private ranges (`10/8`, `172.16/12`, `192.168/16`), CGNAT, unique-local IPv6,
  `::ffff:` mapped IPv4, integer/hex-encoded IPv4, and internal-looking suffixes
  (`.localhost`, `.local`, `.internal`, `.intranet`, `.lan`, `.home.arpa`).
- **Resolved addresses** — optional DNS check via an injected resolver, closing
  the "public name, private address" hole that URL inspection alone cannot see.

## Reading a page

### Cleaning

`cleanHtmlToDocument` strips comments, `script`, `style`, `noscript`,
`template`, `svg`, and `iframe`, decodes entities, and converts block
boundaries to line breaks — producing a `CleanSourceDocument` of title, text,
headings, links, and metadata. Deliberately regex-only: no `cheerio`, no
`jsdom`, no new dependency.

### Extractor registry

`lib/camps/ingestion/extractors/registry.ts` resolves in this order:

1. the source's `extractorKey`, when set;
2. a site-specific extractor whose `supports()` claims the page;
3. `generic_html`, the fallback.

`creative_kids_place` is the first site-specific extractor. After Prompt 8B it
reads the **weekly schedule** as the parent-facing offering grain:

**one session = one week × one theme × one age band**

Program-level “ages 4–12” is **marketing copy only**
(`marketingAgeMin` / `marketingAgeMax`). Session eligibility comes from each
theme line (e.g. STEM 4–5 vs STEM 6–9; Creator Camp 8–13 vs Jr Creator 5–7).
The derived session envelope may reach age 13 even when marketing stops at 12 —
that mismatch is preserved, never “corrected.”

Fee rows (full week / short week / creator / on-the-go) are **price-tier
attributes**, not session identity. Shared week facts (outing destination,
African Lion Safari +$10, Movie Theater +$8.50) are parsed once per week and
fanned out to every offering that week under one `sharedObservationKey`.

`generic_html` still reads what any page states in plain sight, discounts every
value, and warns `generic_extractor_low_confidence`.

An offline benchmark keeps the site-specific parser honest:
`data/camps/ingestion/benchmarks/creative-kids-place-square-one.html` with
expected facts in `creative-kids-place.expected.json` (10 session windows /
93 offerings). Discontinuous short weeks stay separate: Jun 29–30, Jul 2–3,
and Aug 4–7 are three distinct session windows.
The test asserts the parse against the JSON, so a regression fails without
touching the network.

### Normalizing

`lib/camps/ingestion/normalize/*` turns stated text into typed values, each
returning `{ value, raw, confidence, warnings }`:

- `normalizeAgeRange`, `normalizePriceCad`, `normalizeTimeRange`,
  `normalizeDateRange`, `normalizeUrl`, `normalizeRegistrationPlatform`.
- **A year is never invented.** `"July 6 - 10"` with no year stated anywhere on
  the page stays unparsed with `year_not_stated`, rather than being guessed into
  the current year. A year shared across a range, or stated elsewhere in the
  document, is borrowed and warned.
- Every value carries a `FieldObservation` under
  `normalizedFields.observations`: raw text, source URL, snapshot id, method,
  and confidence. That is what fills the CONFIDENCE and SOURCE columns in
  review.

## Matching

Deterministic and literal (`lib/camps/ingestion/matchers.ts`): catalog ids,
slugs, canonical URLs, and exact date windows. **No fuzzy string distance.**
When more than one catalog row is equally plausible the matcher returns no match
plus an `ambiguous_*` reason, which becomes an `ambiguous_match` flag and a
`needs_review` candidate. A human resolves genuine ambiguity.

Session matching (Prompt 8B) prefers, in order:

1. catalog id
2. `externalId` / `sourceIdentity` (CKP:
   `creative_kids_place:session:{startDate}:{themeSlug}:{ageMin}-{ageMax}`)
3. program + start/end dates + normalized theme title + ageMin/ageMax
4. coarser date-only keys (often **ambiguous** when multiple themes share a week)

Price is mutable data on the change-set, **not** identity. A price or surcharge
change rematches the same session and diffs the field.

A session rarely states a catalog program id, so it is resolved from a program
record on the same page, then from the program name scoped to the provider. An
unresolvable program leaves the session unmatched — proposed as `new` for a
person, not guessed into an existing program.

### Sessions that disappear

A catalog session this source used to list, absent from a successful read of the
same page, is flagged `possible_removed_session` as a `needs_review` candidate
with an empty change set. Nothing is deleted. Three guards keep a parsing
regression from looking like a week of cancellations:

- the extraction must be fully successful, not partial;
- the page must have stated at least one session;
- the read must cover at least half the sessions on record for that page —
  a page that used to give eight weeks and now parses as one is an incomplete
  read, recorded as an extraction warning instead of seven removal candidates.

## Confidence

| Band | Range |
| --- | --- |
| HIGH | ≥ 0.90 |
| MEDIUM | ≥ 0.70 |
| LOW | below 0.70 |

HIGH confidence never bypasses review; it only marks a candidate as
lower-risk to review. `mayAutoPublishToCatalog()` is hard-coded `false`.


## Human review decisions (Prompt 7B)

`CampReviewDecision` (`camp_review_decisions`) is the append-only verification
layer beneath any future publish step.

- One review pass = one row. Reviewing the same candidate again inserts a
  **new** row; prior rows are never updated.
- Field-level decisions live in JSONB (`field_decisions`). Keys must match the
  candidate's `CampFieldChange.field` vocabulary.
- `overall_status` is computed **server-side** from those field decisions —
  never trusted from the browser.
- Approval does **not** publish into `CampProgram` / `CampSession`. Publishing
  remains a separate, explicit later step.
- Review history is the sequence of rows for a `candidate_id`, not mutation of
  a single record.

### ReviewOutcome precedence (first match wins)

0. Empty `fieldDecisions` → **invalid** — reject; do not persist a row.
1. Every decided field is `approved` → `fully_approved`
2. Every decided field is `rejected` → `rejected`
3. At least one `rejected` **and** at least one `approved` or `needs_followup`
   → `partially_approved` (covers approved+rejected, rejected+needs_followup,
   and all three)
4. Otherwise, at least one `needs_followup` → `needs_followup`
   (covers needs_followup-only and approved+needs_followup)

There is no valid non-empty combination that falls through without an outcome.

## Registered-source fetch gate

A caller must never submit an arbitrary URL for the server to fetch.

Entry point: `sourceId` only (`resolveRegisteredSource` /
`fetchRegisteredSource`).

1. Receive `sourceId`
2. Look up the source in the registered source registry
3. Obtain the canonical URL from that row
4. Verify the source is registered (and active / allowlisted as required)
5. Only then pass the registered `CampSource` to the fetch layer

Unregistered `sourceId` values are rejected **before** any network attempt.
There is no live crawler in Prompt 7B.

An earlier prototype that accepted `{ url, program_id }` is not present in this
codebase; do not reintroduce an open-fetch route.

## Review lifecycle

`lib/camps/ingestion/runner/reviewActions.ts` records one decision:

| Action | Stored status | Meaning |
| --- | --- | --- |
| Approve | `approved` | A person judged the proposed facts to be true. |
| Reject | `rejected` | The facts were judged wrong. |
| Ignore | `ignored` | Real change, not worth acting on. |
| Needs review | `needs_review` | Back to the queue for another look. |

**Approve is not publish.** Approving writes `camp_candidates` and nothing else.
There is no code path from ingestion into `Provider` / `CampProgram` /
`CampSession` / `Venue`; adding one is separate, explicit work with its own
review. Decisions record who decided and when, and keep the pipeline's own
reason alongside the human note, so a candidate reads as "the pipeline said
this, then a person said that".

## Persistence

`lib/camps/ingestion/repositories/*` defines repositories per table and two
implementations:

- **`createMemoryIngestionStore`** — process-lifetime store used by tests and
  dev admin surfaces. Rows are cloned in and out, so a caller cannot mutate
  stored state by holding a reference.
- **`createSupabaseIngestionStore`** — PostgREST adapter over `fetch`, used when
  `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both present.
  `resolveIngestionStore()` falls back to the memory store when they are not.

The service-role key is **server-only**: `createSupabaseIngestionStore` throws
if constructed where `window` exists. Ingestion tables live in
`supabase/migrations/20260912200000_camp_ingestion_tables.sql` with RLS enabled
and no anon policies — nothing parent-facing reads them.

There is deliberately no repository method that writes a published catalog row.

## Scheduling

`checkIntervalHours` (default 24) plus `nextCheckAt` on each source row.
`nextCheckAtFrom` advances the schedule from the moment of the check, and
`isSourceDue` decides what a cycle picks up. `freshnessLabel` is display only —
Fresh (≤ 24h), Recently checked (≤ 72h), Stale, Unknown — not a product SLA.

## Development surfaces

- Fixtures: `data/camps/ingestion/fixtures.ts` (`DEV_ONLY_INGESTION_FIXTURES`).
- Gate: `lib/camps/ingestion/devFixtures.ts` → `loadIngestionDevFixtures()` /
  `requireIngestionDevFixtures()`.
- Dev store: `lib/camps/ingestion/devStore.ts` — a memory store seeded from the
  fixture bundle, held on `globalThis` so a server action and the page that
  rendered its form share one instance. `runIngestionDevCycle()` replays saved
  snapshot HTML through the real runner, so the admin UI exercises the actual
  pipeline with no network access.
- Admin (dev only, `robots: noindex`, production → `notFound()`):
  - `/camps/admin/ingestion` — latest run summary, review queue
    (FIELD / CURRENT / PROPOSED / CONFIDENCE / SOURCE), persisted decisions
  - `/camps/admin/ingestion/sources` — registry with schedule, extractor,
    content hash, allowlist state, health, and freshness

These pages must not be linked from public Camps UX as a product feature.

## What ingestion deliberately does not do

- No auto-publish into the approved catalog.
- No headless browser, generic site crawler, or CAPTCHA bypass.
- No fetching of sources outside the explicit allowlist.
- No fuzzy matching that silently merges two providers.
- No guessed years, prices, or ages: unstated stays unstated.
- No redesign of public `/camps` listing or detail UI.
- No inventing experience copy, packing lists, ratings, scarcity, or "we
  visited" claims from scraped HTML.

## Two-level change detection

Ingestion uses two fingerprints so reviewers only see fact movement:

```
REGISTERED SOURCE
      ↓
FETCH
      ↓
RAW HASH

same
→ STOP

different
→ EXTRACT + NORMALIZE
      ↓
FACT FINGERPRINT

same
→ record non-semantic source change
→ STOP
→ no candidate

different
→ calculate field diff
→ candidate
→ human review
```

| Gate | Same | Different |
| --- | --- | --- |
| Raw content hash | Stop before extraction. Persist check only. | Extract + normalize. |
| Fact fingerprint | Record **non-semantic source change**. Persist snapshot/check. No candidate, no review. | Field diff → candidate → human review. |

`sourcesUnchanged` counts raw-hash stops. `sourcesNonSemanticChange` counts raw-changed / facts-same stops. Neither advances `lastChangedAt` or enqueues review work.

### Fingerprint contract (`camp-facts-v1`)

Persisted as `camp-facts-v1:sha256:<hex>` on:

- `CampSource.lastFactFingerprint` (latest successful facts)
- `CampSourceSnapshot.factFingerprint` (per-check audit, including unchanged-facts runs)

Canonicalization:

- allowlisted parent-relevant fields only (program / session / venue / provider)
- records sorted by type + semantic sort key (session: dates → theme → ages → price tier → source identity)
- object keys sorted; arrays sorted by stable JSON
- `null` / `false` / `0` / `""` preserved as distinct (UNKNOWN ≠ FALSE ≠ ZERO)

Excluded from the hash:

- observations / evidence wording / raw snippets
- generated ids, timestamps, confidence, warnings, run/snapshot plumbing
- DOM order and extraction order

Version mismatch:

- legacy `sha256:<hex>` or a different algorithm version → `fingerprint_version_changed`
- never claim `unchanged_facts` across versions; continue through the candidate path (rebaseline)

Baseline:

- no previous fingerprint → `baseline` → continue to candidates (initial ingestion)
- do not invent a prior state

Identity vs fingerprint (Prompt 8B grain preserved):

- **Identity** (matcher): week × theme × age band — price is not identity
- **Fingerprint**: includes price, ages, shared week add-ons, marketing ages, etc.
- An age-band change (`8–13` → `9–13`) changes both fingerprint **and** canonical identity.
  The exact matcher must not silently treat them as the same session. Prompt 9A does
  **not** auto-reconcile disappeared/appeared age bands; that stays explicit review
  material for a later UI if desired.

Statuses operators should distinguish:

| Status | Meaning |
| --- | --- |
| `unchanged_raw` | Raw bytes unchanged — extraction skipped |
| `unchanged_facts` | Raw bytes changed; normalized facts unchanged — no candidates |
| `changed_facts` | Meaningful facts moved — candidate path |
| `baseline` | First successful fact fingerprint for the source |
| `fingerprint_version_changed` | Algorithm version moved — safe rebaseline path |
| `failed` / `blocked` / `partial` | As before |

Automation gathers and proposes facts.
Human review establishes Compass-approved truth.

Compass may automate facts.
Compass must not fabricate firsthand editorial experience.


## Prompt 8A — first real camp ingestion

The first end-to-end gold-provider path is Creative Kids Place (Square One):

```
REGISTERED SOURCE
→ FETCH (sourceId only)
→ RAW HASH
     same → STOP
     different → EXTRACT + NORMALIZE
→ FACT FINGERPRINT
     same → record non-semantic source change → STOP (no candidate)
     different → field diff → CANDIDATE → HUMAN REVIEW
```

Entry points:

- `runCampSource({ sourceId, store, fetcher, catalog })` — single registered
  source, suitable for a future scheduler. Does not schedule itself.
- `runDueCampSources(...)` — cycles every due registered source.

Rules that stay non-negotiable:

- **Registered-source security.** Callers pass `sourceId`, never an arbitrary
  URL. Unregistered ids produce a structured failure with zero network I/O.
- **SSRF protection.** Only `http:` / `https:`; private, link-local, localhost,
  and cloud-metadata destinations are rejected on the initial URL and every
  redirect hop.
- **Unchanged-source short circuit.** Matching content hash records a successful
  check and stops — no re-extraction, no duplicate candidate, no review noise.
- **Known-gap semantics.** Facts the page does not state (own-counsellor
  screening, anaphylaxis/EpiPen protocol, staff First Aid/CPR) stay explicit
  gaps. Absence is not false.
- **Partial vs failed.** Unusable output is failed; partial extraction remains
  distinguishable from full success.
- **No publish.** Even `fully_approved` review does not mutate published
  `CampProgram` / `CampSession` rows.

Offline gold fixture:
`data/camps/ingestion/benchmarks/creative-kids-place-square-one.html` with
expectations in `creative-kids-place.expected.json`. Production extractors read
live/saved HTML — they do not hard-code benchmark values.

Compass may automate facts.
Compass must not fabricate firsthand editorial experience.

Automation gathers and proposes facts.
Human review establishes Compass-approved truth.

## Prompt 8B — Creative Kids Place session grain

Corrected before semantic fingerprinting, multi-provider scaling, publishing,
or scheduler work.

| Layer | Role |
| --- | --- |
| Program ages | Marketing only (`4–12` on this page) |
| Session ages | Eligibility from the weekly theme line |
| Price tier | Attribute (`full_week` / `short_week` / `creator_camp` / `on_the_go`) |
| Shared week facts | Parsed once; fanned out with `factScope.scope = "week"` |
| Identity | Provider/program/venue context + week dates + theme + ages — **not** price |

Master “Camp Options” lists are supporting evidence only. Actual offerings come
from the weekly schedule. Prompt 9A builds the semantic fact fingerprint on this
corrected grain — identity stays week × theme × age band; fingerprint additionally
tracks mutable facts such as price and shared week add-ons.


## Editorial boundary

Automate **facts** that a source states clearly (dates, price, ages,
registration URLs, hours) into candidates for review.

Do **not** fabricate firsthand editorial experience: do not invent narrative
"what it's like," unverified accessibility claims, or packing requirements from
incomplete pages. Unknown stays unknown until a human (or a verified provider
confirmation path) supplies it.

## Tests

`npm run test:camps` (`tsx --test "lib/camps/**/*.test.ts"`) covers URL
canonicalization against the fixture registry, hashing and the unchanged-skip
gate, confidence bands, SSRF refusals (localhost, `127.0.0.1`, `10.x`,
`169.254.169.254`, `file://`), HTML cleaning, the fetch allowlist and a mocked
HTTP success, the offline Creative Kids Place benchmark, change sets for price
and age changes, exact-id and ambiguous-name matching, new-session detection,
quality flags, a full runner cycle (unchanged skips extraction, changed creates
a candidate), review persistence that leaves the catalog untouched, and the
development gate.
