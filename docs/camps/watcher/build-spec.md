# Compass Camp Watcher: build spec

Nov 15, 2026 · Vineeta Agarwal
Repo copy of the Claude Doc "Compass Camp Watcher: build spec", updated Nov 15 after Cursor's first look at the repo. Keep this file at `docs/camps/watcher/build-spec.md`, next to `camp_sources_seed.csv`.

## What it does

Every night the Camp Watcher checks all 133 winter, PA day and March Break sources on the checklist, and each morning it gives Vineeta a short list of what changed. She approves or rejects each change. Nothing reaches the site without her approval, except spot counts, which always show their check date.

Rules it never breaks:

- No automatic publishing of facts. Changes land in `source_changes` and wait.
- Every fact keeps its source and check date.
- Spots are never called "live".
- A source that can't be read is flagged as unreachable or blocked, never reported as "no change" and never guessed.

## Fit with the existing code (read first)

Cursor found two related systems already in `compassbyvavy-web`. The watcher sits beside them and must not duplicate or change them.

| Existing system | What it does today | How the watcher uses it |
| --- | --- | --- |
| `workers/spots-checker/` | Reads Jackrabbit, iClassPro, ActiveNet and Squarespace and writes spot counts into `camp_session_spots`. Acuity is left out on purpose. | **Spot counts stay with spots-checker.** The watcher never writes `camp_session_spots`. Where the watcher needs the same feed (Jackrabbit in Phase 1; iClassPro and ActiveNet in Phase 2), it reuses spots-checker's fetch and parse code through a shared module instead of a second copy. Moving that code into a shared module must not change spots-checker's behaviour, and its tests must still pass. |
| `lib/camps/ingestion/` | Fetches an allowlisted set of HTML pages for camp ingestion. Jackrabbit is recorded only as provenance. | The `page` adapter may reuse the ingestion fetch and text-cleaning helpers. Its 97 URLs come from `camp_sources`, **not** the ingestion allowlist, and the allowlist is not widened. |

What this means for the watcher's job: it watches everything **except** writing spot counts. That covers dates, prices, hours, ages, sessions appearing or disappearing, registration dates, page text, and sources that can't be read. It still records spots in its snapshot `facts`, so it can flag a session going from open to full (or back) as urgent. The count shown on the site still comes from spots-checker.

Acuity (COOKSMART) is in Phase 2 of this spec but was left out of spots-checker on purpose. Before Phase 2, find the reason in the code or history and report it. Don't add Acuity until Vineeta decides.

Alert email: use the address the repo already uses, `hello@compassbyvavy.ca`. Put it in one config value so it can change later.

## How it works

```
camp_sources (133 rows)
   │  nightly cron, 00:20 Toronto
   ▼
adapter per source ──► source_snapshots (facts + hash, every check)
   │
   ▼
compare with previous snapshot, field by field
   │
   ├─ spot count only ─────────► nothing to do (spots-checker owns the count)
   ├─ everything else ─────────► source_changes (pending, kind = review)
   │                                │
   │                                ▼
   │                         07:00 email to Vineeta ──► approve / reject (Phase 2: /admin/changes)
   │                                                     └─► approved: camp_sessions + Recheck tab row
   └─ unreachable / blocked ──► counted; 2 nights in a row ► review ("needs a browser check or a call")
```

A Monday browser check (Phase 3, a scheduled Claude task) adds findings for sources the nightly job can't read to the same queue.

## Supabase tables

Three new tables sit beside the existing `camp_sessions` and `camp_session_spots`. The seed file `camp_sources_seed.csv` (133 rows, built from the checklist on Nov 15) loads straight into `camp_sources`.

| Table | One row per | Holds |
| --- | --- | --- |
| `camp_sources` | camp × break | camp, break, intake row, adapter, watch URL, adapter params, check frequency, last checked, last status |
| `source_snapshots` | check of a source | when, HTTP status, content hash, the extracted facts as JSON |
| `source_changes` | detected change | source, field, old value, new value, kind, status, reviewed when |

```sql
create table camp_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text unique not null,          -- e.g. 'futures-gymnastics--march_break'
  camp text not null,
  break text not null check (break in ('winter','pa_day','march_break','summer')),
  intake_row int,                            -- row in the Camp intake sheet
  adapter text not null check (adapter in
    ('jackrabbit','iclasspro','acuity','amilia','activenet','longos','codeninjas','page','manual')),
  watch_url text,
  adapter_params jsonb default '{}'::jsonb,  -- e.g. {"OrgID":542952}
  check_every text not null default 'daily', -- daily | weekly
  active boolean not null default true,
  last_checked_at timestamptz,
  last_status text,                          -- ok | changed | unreachable | blocked | error
  notes text
);

create table source_snapshots (
  id bigserial primary key,
  source_id uuid references camp_sources(id) on delete cascade,
  checked_at timestamptz not null default now(),
  http_status int,
  content_hash text,                         -- sha256 of the normalised content
  facts jsonb                                -- adapter output: sessions, prices, spots, registration
);

create table source_changes (
  id bigserial primary key,
  source_id uuid references camp_sources(id) on delete cascade,
  detected_at timestamptz not null default now(),
  session_ref text,                          -- the booking system's own id, e.g. Jackrabbit class 22377848
  field text not null,                       -- dates | price | spots | registration | hours | ages | session_new | session_gone | page_text | unreachable | needs_call
  old_value text,
  new_value text,
  kind text not null check (kind in ('auto','review')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','auto_applied')),
  reviewed_at timestamptz,
  note text
);
```

Row-level security: only the admin role reads and writes these tables. Parents never see them. Approved changes reach the site through `camp_sessions`.

## Adapters

One adapter per booking system turns a source into the same shape: a list of sessions with dates, times, ages, price, spots, registration window and a direct register link. Every adapter returns `{ status: 'ok' | 'unreachable' | 'blocked' | 'error', facts }`. It never returns empty facts when a fetch fails. Each feed below was opened and read in a browser on Nov 15, 2026.

| Adapter | Feed (as read Nov 15) | Gives | Camps on the list | Phase |
| --- | --- | --- | --- | --- |
| `jackrabbit` | GET `https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsJson?OrgID={id}` (optional `&Session=...`), JSON `rows[]` | id, name, category1/2/3, start/end date and time, `min_age`/`max_age` (ISO like `P05Y00M`), `openings.calculated_openings`, `tuition.fee`, `reg_start_date`, `online_reg_link` | Gymnastics Mississauga (OrgID 537009), KSG (OrgID 542952, Session `2026 Winter Camp`) | 1 (reuse spots-checker code) |
| `page` | GET `watch_url`, strip script/style/nav/header/footer, collapse whitespace, sha256 the text | "page changed" plus before/after text | 97 sources in the seed | 1 |
| `manual` | none | a weekly "call or email" reminder | 18 sources | 1 |
| `iclasspro` | GET `https://app.iclasspro.com/api/open/v1/{org}/camps?locationId={loc}&typeId={type}&limit=50&page=1`, plus `/camps/{id}` | name, start/end date, daily times, min/max age, `openings`, registration start/end. Price only inside the description HTML | Futures (org `futures`, location 2; winter 135, PA 126, March Break 121) | 2 (reuse spots-checker code) |
| `acuity` | POST `https://cooksmartscheduling.as.me/api/scheduling/v1/availability/class`, body `{"owner":"7b98e4f9","appointmentTypeIds":[...],"timezone":"America/Toronto"}` (adding startDate/endDate/calendarIds gives 400) | per date: start time, `slotsAvailable` | COOKSMART (full day 99733065, half day 99732924) | 2, after the Acuity question above |
| `amilia` | GET the store page with every `subCategoryIds` in the URL; server-rendered HTML, no public API | per session: name, day and time, dates, "Available spots", price | Visual Arts Mississauga (program 137578) | 2 |
| `longos` | GET `https://www.longos.com/class-detail/{id}/x`; the page embeds `allDateOptions` JSON | per store: `locationTitle`, date, start/end, `spots`, `capacity`, `price` | Longo's Applewood (camps 313–320) | 2 |
| `activenet` | the existing ActiveMississauga REST reader in spots-checker | sessions, spots, fees | City of Mississauga | 2 (reuse spots-checker code) |
| `codeninjas` | `members.codeninjas.com/e/?uuid={id}`: JavaScript page, needs a browser | camp names and dates as text | Code Ninjas West and Port Credit (4 rows) | 3 |

Sample Jackrabbit row (Gymnastics Mississauga, Nov 15), for test fixtures:

```json
{"id":22377848,"category1":"Winter Break Camp","name":"Holiday Camp, Monday Dec 21",
 "start_date":"2026-12-21","start_time":"09:00","end_time":"16:30",
 "min_age":"P05Y00M","max_age":"P14Y00M","openings":{"calculated_openings":47},
 "tuition":{"fee":80},"reg_start_date":"2026-10-01",
 "online_reg_link":"https://app.jackrabbitclass.com/reg.asp?id=537009&preLoadClassID=22377848"}
```

Sample Acuity response (COOKSMART full day, Nov 15):

```json
{"2026-12-21":[{"appointmentTypeId":99733065,"time":"2026-12-21T09:00:00-05:00","slotsAvailable":15}],
 "2026-12-22":[{"appointmentTypeId":99733065,"time":"2026-12-22T09:00:00-05:00","slotsAvailable":17}]}
```

The feeds already show more than the websites. On Nov 15 the iClassPro feed for Futures showed a second March Break camp (Gymnastics, 13 open) and March Break aftercare (8 open), neither on their camp page. The KSG Jackrabbit feed, filtered to `Session=2026 Winter Camp`, returned all 18 day options with `reg_start_date` 2026-11-17.

All feeds were tested from a browser. Phase 1 must confirm each one also answers a request from Cloudflare's servers.

Seed file notes: `adapter_params` is `key=value; key=value` text. Parse it into JSON when loading. `source_key` is unique and shaped `{camp-slug}--{break}`.

## Change rules

The job compares tonight's facts with the last snapshot, field by field, matched on the booking system's own session id.

| What changed | Kind | What happens |
| --- | --- | --- |
| Spot count on a known session | none | Recorded in the snapshot only. spots-checker owns the count on the site. |
| Session goes from open to full, or full to open | review, urgent | Top of the morning email |
| New session appears (new dates, new break posted) | review | Proposed as a new row in `camp_sessions` (on approval) |
| Session disappears | review | Never deleted automatically; may be sold out or cancelled |
| Price, hours, ages or dates change | review | Old and new value side by side |
| Registration opens, or an opening date is posted | review, urgent | Feeds the parent alerts later |
| `page` source text changes | review | Before/after text with the changed lines highlighted |
| Source unreachable or blocked 2 nights in a row | review | "Needs a browser check or a call" |
| `manual` source, weekly | review | "Call or email" reminder |

Noise filters for `page` sources: ignore dates and times in headers and footers, cookie banners, rotating images and counters, and compare text only. A change under 20 characters on a `page` source is logged but not raised.

## Review and alerts

Vineeta gets one email at 07:00 Toronto and works through it. An empty night sends no email. Send it to `hello@compassbyvavy.ca` from one config value.

Example only (made-up numbers):

> **Camp Watcher, Nov 18: 4 to review**
> Urgent: KSG Gymnastics winter, registration now open (was "opens Nov 17, 1 pm")
> Riverwood March Break: page changed, 2027 dates posted
> Futures March Break Gymnastics: full (was 3 open)
> CJ's Skatepark: site unreachable 2 nights

Review page (Phase 2) at `/admin/changes`, behind login, admin only:

- One card per change: camp, break, field, old → new, source link, detected date.
- Buttons: **Approve** (writes to `camp_sessions` and adds a dated row to the checklist's Recheck tab), **Reject**, **Snooze 7 days**.
- Grouped by camp, urgent first.
- `page` changes show the before/after text, so she can approve without opening the camp's site.

## Risks and limits

The nightly job runs from Cloudflare's servers, not a home browser, so some sites will treat it as a bot. The job must say when it couldn't read a source rather than reporting "no change".

| Risk | Seen on Nov 15 | Fallback |
| --- | --- | --- |
| Bot protection blocks server requests | iClassPro portal pages load PerimeterX bot checks | Use the open JSON API (no page load); if blocked, mark `blocked` and add to the weekly browser check |
| Pages that only render in a browser | Code Ninjas portal; KSG camp page (content inside an iframe) | Read the feed behind it where one exists (KSG = Jackrabbit 542952); otherwise weekly browser check |
| Sites that refuse automated reading | rookstocooks.com, CJ's Skatepark | `manual` or weekly browser check |
| Websites that vanish | sealswimming.com now a domain-for-sale page | Raise "unreachable 2 nights"; Vineeta calls |
| Booking feed changes shape | none yet | Adapter returns `error`, never writes empty facts |
| Too many requests to one site | n/a | One request per source per night, spaced out; User-Agent `CompassCampWatcher/1.0 (+https://compassbyvavy.ca)` |

## Build phases

Each phase is its own pull request.

1. **Phase 1, this week: the backbone.** The three tables, the seed load, the `jackrabbit` adapter (reusing spots-checker's reader), `page` and `manual` adapters, change detection, and the morning email. That alone watches KSG, Gymnastics Mississauga and all 97 page sources.
2. **Phase 2, by Dec 6: the booking systems.** `iclasspro`, `amilia`, `longos`, `activenet` (reusing spots-checker where it already reads them), `acuity` only after the Acuity question is answered, plus the `/admin/changes` review page and approve → `camp_sessions`.
3. **Phase 3, after the Jan 1 launch:** `codeninjas`, the Monday browser check for blocked sources, summer camps, and turning approved changes into parent alerts.

## Phase 1 instructions for Cursor

Build Phase 1 of the Compass Camp Watcher in compassbyvavy-web, following this file (`docs/camps/watcher/build-spec.md`) and the seed `docs/camps/watcher/camp_sources_seed.csv`.

1. **Migration.** Create `camp_sources`, `source_snapshots`, `source_changes` exactly as in the SQL above, with RLS so only the admin role can read or write them. Add a seed script that loads the CSV into `camp_sources` (parse `adapter_params` from `key=value; ...` into JSON). Don't run it against production.
2. **Shared reader.** Move spots-checker's Jackrabbit fetch/parse into a shared module that both spots-checker and the watcher import. spots-checker's behaviour and tests must not change.
3. **Worker.** A new Cloudflare Worker (separate from spots-checker) with a cron trigger daily at 05:20 UTC (00:20 Toronto). For each active source due a check: run its adapter, write a `source_snapshots` row, compare facts with the previous snapshot, and write `source_changes` per the change rules. Never write to `camp_session_spots` or `camp_sessions`.
4. **Adapters in Phase 1:** `jackrabbit` (via the shared reader; filter by the source's params such as `Session`), `page` (may reuse `lib/camps/ingestion` fetch and text-cleaning helpers; don't touch its allowlist), `manual` (weekly "call or email" change). Unknown adapters are skipped with status `error` and logged.
5. **Morning email** at 07:00 Toronto to `hello@compassbyvavy.ca` (one config value), only when there are pending changes, in the format above.
6. **Tests with fixtures:** use the Jackrabbit sample row above. Test that a price change is kind `review`, a spots-only change creates no `source_changes` row, open → full is review and urgent, and an unreachable source never produces "no change".

Rules: work on a branch, open a PR, send screenshots of the sample email. No commits to main, no deploys, no SQL run against production, nothing published to the site. Stop after the PR and summarise what was built, what was left out, and the reason Acuity was left out of spots-checker if you find it.
