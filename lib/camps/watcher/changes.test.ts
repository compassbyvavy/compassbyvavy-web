import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffFacts } from "@/lib/camps/watcher/changes";
import { pageWatchText } from "@/lib/camps/watcher/pageText";
import type { WatchFacts, WatchSession } from "@/lib/camps/watcher/types";

function session(overrides: Partial<WatchSession> = {}): WatchSession {
  return {
    id: "22377848",
    name: "Holiday Camp, Monday Dec 21",
    dates: "2026-12-21",
    hours: "09:00-16:30",
    ages: "P05Y00M-P14Y00M",
    price: "80",
    spots: 47,
    registration: "2026-10-01",
    registerUrl: "https://app.jackrabbitclass.com/reg.asp?id=537009&preLoadClassID=22377848",
    ...overrides,
  };
}

describe("change rules", () => {
  it("treats the first read as a baseline", () => {
    const diff = diffFacts(null, { sessions: [session()] });
    assert.deepEqual(diff.changes, []);
  });

  it("raises a price change and ignores a spots-only change", () => {
    const previous: WatchFacts = { sessions: [session()] };
    const price = diffFacts(previous, { sessions: [session({ price: "90", spots: 46 })] });
    assert.deepEqual(
      price.changes.map((change) => change.field),
      ["price"],
    );
    assert.equal(price.changes[0]?.kind, "review");
    assert.equal(price.changes[0]?.oldValue, "80");
    assert.equal(price.changes[0]?.newValue, "90");

    const spotsOnly = diffFacts(previous, { sessions: [session({ spots: 46 })] });
    assert.deepEqual(spotsOnly.changes, []);
  });

  it("marks a posted registration date as urgent", () => {
    const diff = diffFacts(
      { sessions: [session({ registration: null })] },
      { sessions: [session({ registration: "2026-11-17" })] },
    );
    assert.equal(diff.changes.length, 1);
    assert.equal(diff.changes[0]?.field, "registration");
    assert.equal(diff.changes[0]?.kind, "review");
    assert.equal(diff.changes[0]?.note, "urgent");
    assert.equal(diff.changes[0]?.oldValue, null);
    assert.equal(diff.changes[0]?.newValue, "2026-11-17");
  });

  it("marks open to full as urgent", () => {
    const diff = diffFacts({ sessions: [session()] }, { sessions: [session({ spots: 0 })] });
    assert.equal(diff.changes.length, 1);
    assert.equal(diff.changes[0]?.field, "spots");
    assert.equal(diff.changes[0]?.note, "urgent");
    assert.equal(diff.changes[0]?.kind, "review");
    assert.equal(diff.changes[0]?.oldValue, "47");
    assert.equal(diff.changes[0]?.newValue, "0");
  });

  it("marks full to open as urgent and a vanished session as gone", () => {
    const full = diffFacts({ sessions: [session({ spots: 0 })] }, { sessions: [session({ spots: 3 })] });
    assert.equal(full.changes[0]?.note, "urgent");
    assert.equal(full.changes[0]?.newValue, "3");
    const gone = diffFacts({ sessions: [session()] }, { sessions: [] });
    assert.equal(gone.changes[0]?.field, "session_gone");
    assert.equal(gone.changes[0]?.oldValue, "Holiday Camp, Monday Dec 21");
  });

  it("logs a page edit under 20 characters and raises a longer one", () => {
    const before = "Winter camp runs Dec 21 to Dec 23. The fee is 80 dollars a day.";
    const tiny = diffFacts({ pageText: before }, { pageText: before.replace("80", "81") });
    assert.deepEqual(tiny.changes, []);
    assert.match(tiny.notes[0] ?? "", /under 20 characters/);
    const posted = `${before} March Break 2027 is now posted for the full week.`;
    const large = diffFacts({ pageText: before }, { pageText: posted });
    assert.equal(large.changes[0]?.field, "page_text");
    assert.equal(large.changes[0]?.kind, "review");
  });
});

describe("page text", () => {
  it("ignores script, nav, header, footer, and a short cookie line", () => {
    const page = (year: string) => `<html>
      <header><p>Open daily 9:00</p></header>
      <nav><a href="/camps">Camps ${year}</a></nav>
      <main><p>Winter camp Dec 21 to Dec 23 for ages 5 to 12. The fee is 80 dollars a day at the gym.</p></main>
      <p>We use cookies. Accept all</p>
      <footer><p>Copyright ${year}</p></footer>
      <script>var stamp = "${year}";</script>
    </html>`;
    assert.equal(pageWatchText(page("2026")), pageWatchText(page("2027")));
    assert.match(pageWatchText(page("2026")), /80 dollars/);
    assert.doesNotMatch(pageWatchText(page("2026")), /Copyright|cookies|Open daily/i);
  });
});
