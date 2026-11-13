import type { DueRef, PageFetch, RunOutcome, SpotAdapter, SpotWrite } from "./types";

const TORONTO = "America/Toronto";

export function torontoToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function joinErrors(errors: string[]): string | null {
  return errors.length ? errors.join("; ") : null;
}

/**
 * One pass over due booking refs. A failed read is omitted from `writes`,
 * so the last good row stays. A 403 or 429 stops that system for the rest
 * of the run. Disabled, unpublished, and ended sessions are not fetched.
 */
export async function runSpotCheck(input: {
  now: Date;
  refs: DueRef[];
  stoppedSystems: ReadonlySet<string>;
  adapters: Record<string, SpotAdapter>;
  fetchPage: (url: string) => Promise<PageFetch>;
}): Promise<RunOutcome> {
  const today = torontoToday(input.now);
  const writes: SpotWrite[] = [];
  const bySystem = new Map<string, DueRef[]>();
  for (const ref of input.refs) {
    const list = bySystem.get(ref.bookingSystem) ?? [];
    list.push(ref);
    bySystem.set(ref.bookingSystem, list);
  }

  const runs: RunOutcome["runs"] = [];
  for (const [bookingSystem, refs] of bySystem) {
    const errors: string[] = [];
    let sessionsChecked = 0;
    const due = refs.filter((ref) => {
      if (!ref.enabled) return false;
      if (!ref.published) return false;
      if (ref.endDate && ref.endDate < today) return false;
      return true;
    });
    if (due.length === 0) continue;

    if (input.stoppedSystems.has(bookingSystem)) {
      runs.push({
        booking_system: bookingSystem,
        sessions_checked: 0,
        errors: "stopped earlier today",
      });
      continue;
    }

    const adapter = input.adapters[bookingSystem];
    if (!adapter) {
      runs.push({
        booking_system: bookingSystem,
        sessions_checked: 0,
        errors: "no adapter",
      });
      continue;
    }

    const pages = new Map<string, DueRef[]>();
    for (const ref of due) {
      let url = "";
      try {
        url = adapter.pageUrl(ref);
      } catch {
        url = "";
      }
      if (!url) {
        errors.push(`${ref.sessionId}: no page url`);
        continue;
      }
      const group = pages.get(url) ?? [];
      group.push(ref);
      pages.set(url, group);
    }

    let stopped = false;
    for (const [url, group] of pages) {
      if (stopped) break;
      const page = await input.fetchPage(url);
      if (!page.ok && (page.status === 403 || page.status === 429)) {
        errors.push(page.error);
        stopped = true;
        break;
      }
      if (!page.ok) {
        for (const ref of group) errors.push(`${ref.sessionId}: ${page.error}`);
        continue;
      }
      for (const ref of group) {
        const parsed = adapter.parse(ref, page.body);
        if ("error" in parsed) {
          errors.push(`${ref.sessionId}: ${parsed.error}`);
          continue;
        }
        writes.push({
          session_id: ref.sessionId,
          spots_left: parsed.spots_left,
          state: parsed.state,
          checked_at: input.now.toISOString(),
          source_url: parsed.source_url,
          booking_system: bookingSystem,
        });
        sessionsChecked += 1;
      }
    }

    runs.push({
      booking_system: bookingSystem,
      sessions_checked: sessionsChecked,
      errors: joinErrors(errors),
    });
  }

  return { writes, runs };
}
