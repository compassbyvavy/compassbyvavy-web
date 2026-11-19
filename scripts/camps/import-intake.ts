import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { IntakeImportError, importIntake } from "@/lib/camps/intakeImport";

const defaultCsv = path.join("docs", "camps", "data", "camp_intake.csv");
const defaultOut = path.join("supabase", "seeds", "camps", "camp-intake.sql");

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const csvPath = arg("--csv") ?? defaultCsv;
const outPath = arg("--out") ?? defaultOut;

let csv: string;
try {
  csv = readFileSync(csvPath, "utf8");
} catch {
  console.error(`Can't read ${csvPath}. Put the checklist there, then run npm run camps:import again.`);
  process.exit(1);
}

try {
  const result = importIntake(csv);
  writeFileSync(outPath, result.sql);
  console.log(result.summaryText);
  console.log(`sql: ${outPath}`);
} catch (error) {
  if (error instanceof IntakeImportError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
