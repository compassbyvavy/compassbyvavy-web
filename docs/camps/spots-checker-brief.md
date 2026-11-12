# Brief: spots checker (spots left, checked every 15 minutes)

Written Nov 12, 2026 for whoever builds it (Cursor or Claude). Read it whole before starting.
Related: `winter-camp-cards-brief.md` (the "spots carry a date" rule), PR #62 (the camp page with
`lib/camps/campPage.ts`; build on top of it once it is merged).

## The goal

On a camp's card and its page, each date shows how many spots are left, read from the camp's own
booking page **every 15 minutes**, with the time it was read:

- "8 spots left · checked 6:15 am"
- "Full · waitlist open · checked 6:15 am"
- "Full · checked 6:15 am"

It is never called "live". A parent always sees when we last looked, and always books on the camp's
own site.

## The first five camps and their booking systems

These are the registration links already in `supabase/seeds/camps/`.

| Camp | Booking system | Public page a parent sees |
| --- | --- | --- |
| COOKSMART | Acuity Scheduling | `cooksmartscheduling.as.me` (appointment types 99733065 full day, 99732924 half day) |
| Futures Gymnastics | iClassPro | `portal.iclasspro.com/futures/camps/135` |
| Gymnastics Mississauga | Jackrabbit | `app.jackrabbitclass.com/regv2.asp?id=537009` |
| YMCA Mississauga | ActiveNet (ActiveCommunities) | `anc.ca.apm.activecommunities.com/ymcagta/activity/search/detail/115093` |
| Magnitude Kids Centre | Squarespace shop page | `magnitudewell.ca/holiday/p/holiday-camp` |

The City of Mississauga camps also use ActiveNet, so the YMCA adapter should work for them later.

## Step 1: a short research note per system (before any adapter code)

For each of the five systems, write a few lines in the PR:

- **What a parent sees without logging in.** Does the page show a spot count, or only "full / open"?
- **How the page gets that number.** Is it in the HTML, or in a public JSON request the page itself
  makes? Is there an official public feed? For example, Jackrabbit offers an openings listing that
  organisations can embed.
- **The rules.** Note what robots.txt and the terms of use say about automated access.
- **Your decision.** Build it, or skip it and say why.

If the only route needs the camp's own login or API key (Acuity's official API is one example),
don't build it. Mark that camp **"needs the camp's permission"** and name the exact thing we would
ask them for. Vineeta will email the camp. Until then that camp keeps the manual "checked [date]"
line.

## Step 2: what to build

### Data (one migration)

**`camp_session_spots`**: the latest reading for each session, one row per session.

| Column | Meaning |
| --- | --- |
| `session_id` | Primary key; references `camp_sessions` |
| `spots_left` | Integer, or null when the page shows no number |
| `state` | `available`, `full`, `waitlist` or `unknown` |
| `checked_at` | timestamptz |
| `source_url` | The page that was read |
| `booking_system` | Which system it came from |

- **Anon read:** only rows whose session is published, joined the same way as the existing
  `camp_sessions_public_read` policy.
- **Writes:** service role only.

**`camp_session_booking_refs`**: links each of our sessions to its slot in the booking system.

| Column | Meaning |
| --- | --- |
| `session_id` | References `camp_sessions` |
| `booking_system` | Which system holds the slot |
| `external_ref` | jsonb, for example the Acuity appointment type plus date and time, the iClassPro camp id, the Jackrabbit class id, or the ActiveNet activity id |
| `enabled` | Boolean, default true. This is the per-camp off switch. |

- No anon access.

**`camp_spot_check_runs`**: a log of every run.

| Column | Meaning |
| --- | --- |
| `started_at` | When the run started |
| `booking_system` | Which system was checked |
| `sessions_checked` | How many sessions the run read |
| `errors` | What went wrong, if anything |

- No anon access. Vineeta reads it in Supabase to see whether checks are working.

Leave the existing `seat_availability` and `source_checked_date` on `camp_sessions` as they are.
They are the manual fallback.

### The checker (a separate Cloudflare Worker)

- Put it in `workers/spots-checker/` with its own `wrangler.jsonc`.
- Use a Cron Trigger, `*/15 * * * *`.
- **The Supabase service-role key lives only in this worker's secrets, never in the website worker.**
- One adapter file per booking system. Each takes a booking ref and returns
  `{ spots_left, state, source_url }`, or a clear error.
- Be polite to their servers:
  - At most one request per page per run.
  - Send `User-Agent: CompassByVavyBot/1.0 (+https://compassbyvavy.ca; hello@compassbyvavy.ca)`.
  - Use a 10-second timeout.
  - Stop for the day on a 403 or 429, and log it.
- Never log in, add to cart, start a booking or hold a spot.
- **If a reading fails, keep the last good row.** Never overwrite it with "unknown", and never write
  a guess.
- Only check sessions that are published, enabled, and haven't ended yet.

### What the parent sees (camp files only)

Read `camp_session_spots` in the existing published-catalog read (`lib/camps/campsSupabase.ts`),
then pick which line to show:

| Last good reading | What the card and page show |
| --- | --- |
| Under 2 hours old | The count and the time: "8 spots left · checked 6:15 am" |
| 2 hours to 7 days old | The state only, with the date: "Spots available · checked Nov 11" |
| Older, or none at all | The existing manual line from `seat_availability`, or nothing |

Whichever reading is newer wins: the checker's or the manual one.

**Formatting rules:**

- Times are Toronto time.
- Show the clock time, not "12 min ago". The page is cached for 5 minutes, so a relative time would
  drift.
- Use "Full" only for a confirmed full. A "waitlist" state reads "Full · waitlist open".
- **Low spots:** at 5 or fewer, show the line in the warning tone ("3 spots left"). No other urgency
  wording.

## Rules

- Facts only from the camp's own booking page, each with the time it was read. Never invented,
  never carried forward as current.
- If a camp asks us to stop, set `enabled = false` for its refs the same day. The card falls back to
  the manual line by itself.
- Stay within these files: `workers/spots-checker/`, `lib/camps`, `components/camps`, `app/camps`,
  one migration, and `supabase/seeds/camps/booking-refs.sql`. Don't touch Discover or venue files.
- Work on a branch and open a PR. Don't merge, deploy, or run SQL against the live database.
- Vineeta runs the migration and the booking-refs seed herself in the Supabase SQL Editor.

## Tests

- Each adapter is tested against a saved copy of that system's real public response, stored as a
  fixture, so the tests never call the internet. The fixture must give the same count a parent
  would see on screen that day.
- A failed reading leaves the last good row in place.
- The line rules work: under 2 hours shows the count, 2 hours to 7 days shows the state only, older
  falls back to the manual line.
- Anon can't read spots for a draft session, and can't read `camp_session_booking_refs` or
  `camp_spot_check_runs`.
- A disabled ref is not checked.

## The PR includes

1. The research note for all five systems, with the decision for each.
2. The test results.
3. Screenshots, phone and desktop, of a camp page showing "8 spots left · checked 6:15 am" from
   test data.
4. A screenshot of the 2-hours-to-7-days fallback.
5. **Step-by-step setup for Vineeta, in plain words, with every name and setting exactly as she will
   see it:**
   1. Run the migration.
   2. Run `booking-refs.sql`.
   3. Create the worker in Cloudflare, connected to this repo with root directory
      `workers/spots-checker`.
   4. Add the two secrets: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   5. Check the first run in `camp_spot_check_runs`.

## Done means

- [ ] Each of the five camps is either checked every 15 minutes or marked "needs the camp's
  permission", with the reason.
- [ ] Cards and pages show spots with their check time, and fall back honestly when the reading is
  old.
- [ ] The service-role key exists only in the checker worker.
- [ ] Turning one camp off stops its checks without a deploy.
- [ ] Tests pass. Phone layout at 390px has no sideways scrolling.

## Not in this brief

The City of Mississauga's 30 sessions (add them after the YMCA adapter works), alerts like
"tell me when a spot opens", and booking through Compass.
