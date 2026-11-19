# Camp Watcher

Phase 1 watches Jackrabbit (Gymnastics Mississauga and KSG), the 97 page checks, and the 18 call-or-email reminders. The spec is [build-spec.md](./build-spec.md). The source list is [camp_sources_seed.csv](./camp_sources_seed.csv).

The spec's table names `camp_sources`, `source_snapshots`, and `source_changes` are already taken by camp ingestion, or would sit beside that registry and be easy to confuse with it. The migration creates `camp_watch_sources`, `camp_watch_snapshots`, and `camp_watch_changes` with the spec's columns.

Spot counts stay on the spots checker. This worker does not write them, and it does not publish sessions.

Acuity (COOKSMART) is not checked. The spots checker left it out because Acuity's official API needs the camp's own key. See `supabase/seeds/camps/booking-refs.sql`.

Nothing here runs SQL against production or deploys the worker. Vineeta runs the migration and `supabase/seeds/camps/camp_watch_sources.sql` in the Supabase SQL editor, then creates the Cloudflare worker with root `workers/camp-watcher`, secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and an Email Routing `send_email` binding named `EMAIL`. The nightly check does not need that binding. The 07:00 Toronto mail does.
