/**
 * Upsert Discover categories, subcategories and place types from the workbook export.
 * Safe to re-run: every row is matched on its ID.
 *
 * The export is data/taxonomy/discover.json, produced from
 * data/taxonomy/MT-003xMT-004_Place_Type_Feature_Applicability_Matrix_v2_Discover.xlsx.
 * Regenerate that JSON before seeding if the workbook changes.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Does not touch listing rows.
 */
import data from "../data/taxonomy/discover.json";

type Category = (typeof data.categories)[number];

function parkedSlug(row: Category): string {
  if (row.slug) return row.slug;
  if (row.id === "CAT-009") return "shopping";
  if (row.id === "CAT-010") return "services";
  return row.id.toLowerCase();
}

async function upsert(url: string, key: string, table: string, rows: Record<string, unknown>[]) {
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table} ${response.status}: ${body.slice(0, 500)}`);
  }
}

async function main() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Listing data is not read or changed.");
  }

  const categories = data.categories.map((row) => ({
    id: row.id,
    slug: parkedSlug(row),
    name: row.name,
    sort_order: row.sortOrder,
    card_copy: row.cardCopy,
    icon: row.icon,
    status: row.status,
    page_title: row.pageTitle,
  }));
  const subcategories = data.subcategories.map((row) => ({
    id: row.id,
    category_id: row.categoryId,
    slug: row.slug,
    name: row.name,
    sort_order: row.sortOrder,
    description: row.description,
    is_new: row.isNew,
    chip_row: row.chipRow === "when" || row.chipRow === "type" ? row.chipRow : null,
    in_season_months: row.inSeasonMonths || null,
    seasonal_only: row.seasonalOnly,
    page_title: row.pageTitle,
  }));
  const placeTypes = data.placeTypes.map((row) => ({
    id: row.id,
    name: row.name,
    discover_subcategory_id: row.subcategoryId,
    source_category: row.sourceCategory,
    source_subcategory: row.sourceSubcategory,
    indoor_outdoor: row.indoorOutdoor,
    permanent_seasonal: row.permanentSeasonal,
    primary_age_group: row.primaryAgeGroup,
    discover_status: row.discoverStatus,
    merged_into: row.mergedInto,
  }));

  await upsert(url, key, "discover_categories", categories);
  await upsert(url, key, "discover_subcategories", subcategories);
  for (let i = 0; i < placeTypes.length; i += 100) {
    await upsert(url, key, "discover_place_types", placeTypes.slice(i, i + 100));
  }

  console.log(
    JSON.stringify({
      discover_categories: categories.length,
      discover_subcategories: subcategories.length,
      discover_place_types: placeTypes.length,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
