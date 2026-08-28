# Camps documentation

## Authority order

1. **`compass-camps-page-spec.md`** — authoritative product + page spec (when present)
2. Mockups — visual reference only
3. Proposal — early layout ideas
4. Build guide — execution order (Prompt 1 → 6)
5. **Workbook schema notes** — field/schema reference only; **not** approved production seed data

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

## Routes (approved, not all built)

- `/camps` — listing (Prompt 4+)
- `/camps/[slug]` — detail; session-specific links select a session within the program page
- `/camps/preview` — **development-only** CampCard preview (fixture gate → 404 in production)
