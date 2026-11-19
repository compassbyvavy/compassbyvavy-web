import { renderMorningEmail, type EmailChange, type RenderedEmail } from "./email";
import { torontoHour } from "./toronto";

/** Nightly check at 05:20 UTC. Mail crons send only when it is 07:00 in Toronto. */
export function scheduledJob(cron: string, now: Date): "check" | "email" | "skip" {
  if (cron === "20 5 * * *") return "check";
  if (cron === "0 11 * * *" || cron === "0 12 * * *") {
    return torontoHour(now) === 7 ? "email" : "skip";
  }
  return "skip";
}

export async function handleScheduled(args: {
  cron: string;
  now: Date;
  runCheck: () => Promise<void>;
  loadPending: () => Promise<EmailChange[]>;
  send: (message: RenderedEmail) => Promise<void>;
  log?: (line: string) => void;
}): Promise<"check" | "email" | "skip"> {
  const job = scheduledJob(args.cron, args.now);
  if (job === "check") {
    await args.runCheck();
    return "check";
  }
  if (job !== "email") {
    args.log?.(`camp watcher: skipped cron ${args.cron}`);
    return "skip";
  }
  const pending = await args.loadPending();
  const rendered = renderMorningEmail(args.now, pending);
  if (!rendered) {
    args.log?.("camp watcher: no pending changes, no email");
    return "skip";
  }
  await args.send(rendered);
  args.log?.(`camp watcher: emailed ${pending.length} changes`);
  return "email";
}
