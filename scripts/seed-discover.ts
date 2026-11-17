/**
 * Import the Discover workbook into data/taxonomy/generated/seed.json.
 *
 * The workbook is data/taxonomy/*.xlsx
 * (MT-003xMT-004_Place_Type_Feature_Applicability_Matrix_v2_Discover.xlsx).
 * This script does not connect to Supabase and does not invent rows.
 * Re-running it with the same workbook writes the same file.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { mapExistingPlaces, placesFromSeedSql } from "@/lib/discover/mapPlaces";
import { parseDiscoverSheets, publicPlaceTypes, stableSeed } from "@/lib/discover/workbook";

const root = process.cwd();
const taxonomyDir = path.join(root, "data/taxonomy");
const outDir = path.join(taxonomyDir, "generated");

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text;
  if (typeof value === "object" && "result" in value && value.result != null) return String(value.result);
  return String(value);
}

async function readWorkbook(file: string) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(file);
  return book.worksheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.getSheetValues().slice(1).map((row) => {
      const cells = Array.isArray(row) ? row : [];
      return cells.slice(1).map((cell) => cellText(cell as ExcelJS.CellValue));
    }),
  }));
}

function existingPlaces() {
  const dir = path.join(root, "supabase/seeds/discover");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .flatMap((name) => placesFromSeedSql(readFileSync(path.join(dir, name), "utf8")));
}

async function main() {
  const files = readdirSync(taxonomyDir).filter((name) => name.endsWith(".xlsx"));
  const places = existingPlaces();
  if (files.length === 0) {
    console.log("No workbook in data/taxonomy/.");
    console.log("Place rows found, none mapped (there is no catalog to match):");
    for (const place of places) console.log(`- ${place.id} ${place.name}: "${place.label}"`);
    process.exitCode = 1;
    return;
  }
  const file = path.join(taxonomyDir, files[0]);
  const book = parseDiscoverSheets(await readWorkbook(file));
  const json = stableSeed(book);
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "seed.json");
  writeFileSync(outFile, json);
  const again = stableSeed(parseDiscoverSheets(await readWorkbook(file)));
  if (again !== json) throw new Error("Re-reading the workbook changed the seed");
  const mapped = mapExistingPlaces(places, book.placeTypes);
  console.log(`Workbook: ${files[0]}`);
  console.log(`Categories: ${book.categories.length}`);
  console.log(`Subcategories: ${book.subcategories.length}`);
  console.log(`Place types: ${book.placeTypes.length} (${publicPlaceTypes(book.placeTypes).length} public)`);
  console.log(`Filters: ${book.filters.length}`);
  console.log(`Regions: ${book.regions.length}`);
  console.log(`Feature cells (C and ?): ${book.features.length}`);
  console.log(`Wrote ${path.relative(root, outFile)}`);
  console.log("Place mapping:");
  for (const row of mapped) {
    console.log(`- ${row.placeId} ${row.name}: ${row.placeTypeId ?? "not mapped"} (${row.reason})`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
