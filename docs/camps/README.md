# Camps documentation

## Product UI

1. **`compass-camps-page-spec.md`** — authoritative product + page spec (present)
2. Mockups — visual reference only
3. Proposal — early layout ideas
4. Build guide — execution order (Prompt 1 → 6) — **`cursor-build-guide.md` present**
5. **Workbook schema notes** — field/schema reference only; **not** approved production seed data

## Ingestion engine

Architecture: [INGESTION_ARCHITECTURE.md](./INGESTION_ARCHITECTURE.md)

The automated camp data engine (`lib/camps/ingestion`, `data/camps/ingestion`, and `/camps/admin/ingestion`) stays separate from the Product UI catalog and listing.

## Workbook as schema/reference (not seed)

Drop an updated Camp Research Master export under:

`docs/camps/schema/`

Accepted formats: `.md`, `.csv`, `.json` summaries of column definitions.

**Rules**

- Treat workbook content as a **provisional schema / field dictionary** for reconciling `data/camps/types.ts`.
- Do **not** copy workbook rows into public catalog seed data without an explicit approval pass.
- Do **not** invent operational facts from incomplete workbook cells.
- Development UI previews continue to use gated fixtures in `data/camps/fixtures.dev.ts` via `lib/camps/devFixtures.ts`.

If no workbook file is attached to the agent run, leave `docs/camps/schema/README.md` as the placeholder and reconcile types when the export arrives.

## Routes

- `/camps` — listing
- `/camps/[slug]` — detail; session-specific links select a session within the program page
- `/camps/preview` — **development-only** CampCard preview (fixture gate → 404 in production)
- `/camps/admin/ingestion` — engine review admin
- `/camps/admin/ingestion/sources` — engine source registry

## Cloudflare settings (read before adding one)

The website worker is `compassbyvavy-web`. Every pull request uploads a preview
version to it. Adding or editing a variable or secret in the Cloudflare dashboard
("Add variables and deploy") creates a new live version from the **newest upload**,
which can be an unmerged pull request, not `main`.

That happened on Nov 13, 2026: the Google Maps secrets went live on top of the
unmerged spots checker (PR #66), and `/camps` showed "Sessions couldn't be loaded"
until we rolled back to the `main` version.

Safe order:

1. Add the setting as a **Secret** (Text variables are replaced on every deploy).
2. Open **Deployments** and check the active version's branch is `main`.
3. If it isn't, use ⋯ → **Rollback** on the newest `main` version, or merge any
   change to `main`. A fresh `main` build keeps the dashboard secrets.

Settings the camps pages read: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`GOOGLE_MAPS_BROWSER_KEY` (Google key limited to compassbyvavy.ca and
www.compassbyvavy.ca, Maps JavaScript API and Maps Embed API) and
`GOOGLE_MAPS_MAP_ID`. The service-role key never goes on this worker.
