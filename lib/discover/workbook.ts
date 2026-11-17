/**
 * Reads the Discover workbook. Sheets are imported by their headers.
 * Nothing in the spec is retyped here.
 */

export type DiscoverCategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  cardCopy: string;
  icon: string | null;
  status: "live" | "coming_soon" | "parked";
};

export type DiscoverSubcategoryRow = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  sortOrder: number;
  description: string;
  isNew: boolean;
};

export type DiscoverPlaceTypeRow = {
  id: string;
  name: string;
  subcategoryId: string | null;
  sourceCategory: string | null;
  sourceSubcategory: string | null;
  indoorOutdoor: string | null;
  permanentSeasonal: string | null;
  primaryAgeGroup: string | null;
  status: "Live" | "Parked" | "Merged";
  mergedInto: string | null;
};

export type DiscoverFilterRow = {
  slug: string;
  label: string;
  group: string;
  appliesTo: string[];
  logic: string;
  featureIds: string[];
  status: string;
};

export type RegionRow = {
  id: string;
  name: string;
  number: string;
};

export type FeatureCell = {
  placeTypeId: string;
  featureId: string;
  applicability: "C" | "?";
};

export type DiscoverWorkbook = {
  categories: DiscoverCategoryRow[];
  subcategories: DiscoverSubcategoryRow[];
  placeTypes: DiscoverPlaceTypeRow[];
  filters: DiscoverFilterRow[];
  regions: RegionRow[];
  features: FeatureCell[];
};

type Matrix = { name: string; rows: string[][] };

const SHEETS = {
  categories: ["Discover Categories"],
  subcategories: ["Discover Subcategories"],
  map: ["Discover Map"],
  filters: ["Discover Filters"],
  regions: ["Regions Reference"],
  features: ["Feature Matrix"],
} as const;

export function parseDiscoverSheets(sheets: Matrix[]): DiscoverWorkbook {
  const byName = new Map(sheets.map((sheet) => [norm(sheet.name), sheet]));
  const take = (names: readonly string[]) => {
    for (const name of names) {
      const sheet = byName.get(norm(name));
      if (sheet) return sheet;
    }
    throw new Error(`Workbook is missing a sheet: ${names.join(" or ")}`);
  };
  return {
    categories: parseCategories(take(SHEETS.categories)),
    subcategories: parseSubcategories(take(SHEETS.subcategories)),
    placeTypes: parsePlaceTypes(take(SHEETS.map)),
    filters: parseFilters(take(SHEETS.filters)),
    regions: parseRegions(take(SHEETS.regions)),
    features: parseFeatures(take(SHEETS.features)),
  };
}

export function publicPlaceTypes(rows: DiscoverPlaceTypeRow[]): DiscoverPlaceTypeRow[] {
  return rows.filter((row) => row.status === "Live");
}

function parseCategories(sheet: Matrix): DiscoverCategoryRow[] {
  return objects(sheet).map((row) => ({
    id: req(row, "id"),
    slug: req(row, "slug"),
    name: req(row, "name"),
    sortOrder: num(row, "sortorder"),
    cardCopy: text(row, "cardcopy"),
    icon: opt(row, "icon"),
    status: categoryStatus(req(row, "status")),
  }));
}

function parseSubcategories(sheet: Matrix): DiscoverSubcategoryRow[] {
  return objects(sheet).map((row) => ({
    id: req(row, "id"),
    categoryId: req(row, "categoryid"),
    slug: req(row, "slug"),
    name: req(row, "name"),
    sortOrder: num(row, "sortorder"),
    description: text(row, "description"),
    isNew: flag(row, "isnew"),
  }));
}

function parsePlaceTypes(sheet: Matrix): DiscoverPlaceTypeRow[] {
  return objects(sheet).map((row) => {
    const status = typeStatus(req(row, "discoverstatus"));
    const mergedInto = opt(row, "mergedinto");
    if (status === "Merged" && !mergedInto) {
      throw new Error(`${req(row, "id")} is Merged and has no merged-into type`);
    }
    if (status !== "Merged" && mergedInto) {
      throw new Error(`${req(row, "id")} has merged-into but is ${status}`);
    }
    return {
      id: req(row, "id"),
      name: req(row, "name"),
      subcategoryId: status === "Live" ? req(row, "discoversubcategoryid") : opt(row, "discoversubcategoryid"),
      sourceCategory: opt(row, "sourcecategory"),
      sourceSubcategory: opt(row, "sourcesubcategory"),
      indoorOutdoor: opt(row, "indooroutdoor"),
      permanentSeasonal: opt(row, "permanentseasonal"),
      primaryAgeGroup: opt(row, "primaryagegroup"),
      status,
      mergedInto,
    };
  });
}

function parseFilters(sheet: Matrix): DiscoverFilterRow[] {
  return objects(sheet).map((row) => ({
    slug: req(row, "slug"),
    label: req(row, "label"),
    group: req(row, "group"),
    appliesTo: list(row, "appliesto"),
    logic: text(row, "logic"),
    featureIds: list(row, "featureids"),
    status: req(row, "status"),
  }));
}

function parseRegions(sheet: Matrix): RegionRow[] {
  return objects(sheet).map((row) => ({
    id: req(row, "id"),
    name: req(row, "name"),
    number: req(row, "number"),
  }));
}

function parseFeatures(sheet: Matrix): FeatureCell[] {
  const [header, ...body] = sheet.rows.filter((row) => row.some((cell) => cell.trim()));
  if (!header) return [];
  const keys = header.map(norm);
  const featureCol = keys.findIndex((key) => key === "featureid" || key === "feature");
  const typeCol = keys.findIndex((key) => key === "placetypeid" || key === "id");
  const appCol = keys.findIndex((key) => key === "applicability" || key === "value");
  if (featureCol >= 0 && typeCol >= 0 && appCol >= 0) {
    return body.flatMap((row) => {
      const mark = applicability(row[appCol] ?? "");
      if (!mark) return [];
      return [{ placeTypeId: (row[typeCol] ?? "").trim(), featureId: (row[featureCol] ?? "").trim(), applicability: mark }];
    });
  }
  const idCol = keys.findIndex((key) => key === "id" || key === "placetypeid" || key === "placetype");
  const first = idCol >= 0 ? idCol : 0;
  const featureCols = header
    .map((label, index) => ({ label: label.trim(), index }))
    .filter((col) => col.index !== first && /^FT-/i.test(col.label));
  return body.flatMap((row) => {
    const placeTypeId = (row[first] ?? "").trim();
    if (!placeTypeId) return [];
    return featureCols.flatMap((col) => {
      const mark = applicability(row[col.index] ?? "");
      if (!mark) return [];
      return [{ placeTypeId, featureId: col.label, applicability: mark }];
    });
  });
}

function applicability(value: string): "C" | "?" | null {
  const mark = value.trim();
  if (mark === "C" || mark === "c") return "C";
  if (mark === "?") return "?";
  return null;
}

function objects(sheet: Matrix): Record<string, string>[] {
  const [header, ...body] = sheet.rows.filter((row) => row.some((cell) => cell.trim()));
  if (!header) return [];
  const keys = header.map(norm);
  return body.map((row) => {
    const out: Record<string, string> = {};
    keys.forEach((key, index) => {
      if (key) out[key] = (row[index] ?? "").trim();
    });
    return out;
  });
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function req(row: Record<string, string>, key: string): string {
  const value = row[key]?.trim();
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function opt(row: Record<string, string>, key: string): string | null {
  const value = row[key]?.trim();
  return value ? value : null;
}

function text(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? "";
}

function num(row: Record<string, string>, key: string): number {
  const value = Number(req(row, key));
  if (!Number.isInteger(value)) throw new Error(`${key} must be a whole number`);
  return value;
}

function flag(row: Record<string, string>, key: string): boolean {
  const value = (row[key] ?? "").trim().toLowerCase();
  return value === "true" || value === "yes" || value === "y" || value === "1" || value === "new";
}

function list(row: Record<string, string>, key: string): string[] {
  const value = row[key]?.trim();
  if (!value || value === "—" || value === "-") return [];
  return value.split(/[,;\n]/).map((part) => part.trim()).filter(Boolean);
}

function categoryStatus(value: string): DiscoverCategoryRow["status"] {
  const key = norm(value);
  if (key === "live") return "live";
  if (key === "comingsoon") return "coming_soon";
  if (key === "parked") return "parked";
  throw new Error(`Unknown category status: ${value}`);
}

function typeStatus(value: string): DiscoverPlaceTypeRow["status"] {
  const key = norm(value);
  if (key === "live") return "Live";
  if (key === "parked") return "Parked";
  if (key === "merged") return "Merged";
  throw new Error(`Unknown place type status: ${value}`);
}

export function stableSeed(book: DiscoverWorkbook): string {
  const sort = <T extends { id?: string; slug?: string; placeTypeId?: string; featureId?: string }>(rows: T[]) =>
    [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify({
    categories: sort(book.categories),
    subcategories: sort(book.subcategories),
    placeTypes: sort(book.placeTypes),
    filters: sort(book.filters),
    regions: sort(book.regions),
    features: sort(book.features),
  });
}
