/**
 * npm run review-pack -- --batch 1
 * Writes docs/camps/review/batch-01.md. Pass --skip-links to leave register checks out.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { BATCH_1, BATCH_1_TOKEN_RECORD } from "@/lib/camps/pages/batch1";
import { registerLinkStatus } from "@/lib/camps/pages/links";
import { renderReviewPack } from "@/lib/camps/pages/pack";
import { torontoToday } from "@/lib/camps/campPage";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const batchFlag = args.indexOf("--batch");
  const batch = batchFlag >= 0 ? Number(args[batchFlag + 1]) : 1;
  if (batch !== 1) {
    console.error("Only batch 1 is in this repo.");
    process.exit(1);
  }
  const skipLinks = args.includes("--skip-links");
  const links: Record<string, { httpStatus: number | null }> = {};
  if (!skipLinks) {
    for (const camp of BATCH_1) {
      if (!camp.registerUrl) continue;
      links[camp.slug] = await registerLinkStatus(camp.registerUrl);
      console.log(`${camp.slug} ${links[camp.slug].httpStatus ?? "no response"}`);
    }
  }
  const markdown = renderReviewPack({
    batch: BATCH_1_TOKEN_RECORD,
    listings: BATCH_1,
    today: torontoToday(),
    links: skipLinks ? undefined : links,
  });
  const file = path.join(process.cwd(), "docs/camps/review", `batch-${String(batch).padStart(2, "0")}.md`);
  writeFileSync(file, markdown);
  console.log(file);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
