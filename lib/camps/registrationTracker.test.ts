/**
 * Registration Tracker + Camps chrome — Node test runner.
 * Run: npm run test:camps
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  campsDevPrograms,
  campsDevProviders,
  campsDevSessions,
  campsDevVenues,
} from "@/data/camps/fixtures.dev";
import type { CampSession } from "@/data/camps/types";
import type { CampsCatalogBundle } from "@/lib/camps/catalog";
import {
  CAMPS_CHROME_LINKS,
  CAMPS_CHROME_OMITTED,
  REGISTRATION_TRACKER_HREF,
  campsChromeLinkById,
  isCampsChromeHrefActive,
} from "@/lib/camps/campsChrome";
import {
  TRACKER_EMPTY_BODY,
  TRACKER_EMPTY_CTA_HREF,
  TRACKER_EMPTY_TITLE,
  TRACKER_UNKNOWN_STATUS,
  TRACKER_VERIFY_LABEL,
  buildRegistrationTracker,
  buildTrackerSignals,
  collectTrackerDisplayText,
  formatDeadlineOnFile,
  formatOpensOnSignal,
  trackerCopyClaimsLiveSeats,
  trackerLifecycleCopy,
} from "@/lib/camps/registrationTracker";
import { applySave } from "@/lib/shortlist/actions";
import {
  accountSavedItemsSource,
  guestLocalSavedItemsSource,
} from "@/lib/shortlist/savedItemsSource";
import { EMPTY_SHORTLIST } from "@/lib/shortlist/types";

const NOW = new Date("2026-08-28T16:00:00.000Z");

const catalog: CampsCatalogBundle = {
  providers: campsDevProviders,
  venues: campsDevVenues,
  programs: campsDevPrograms,
  sessions: campsDevSessions,
  sourceLabel: "dev_fixtures",
  includesFictionalFixtures: true,
};

function sessionById(id: string): CampSession {
  const session = campsDevSessions.find((s) => s.id === id);
  assert.ok(session, `missing fixture session ${id}`);
  return session;
}

describe("Camps chrome — Registration Tracker entry", () => {
  it("includes a Registration Tracker nav link and omits Planner / Camp Buddies", () => {
    const tracker = campsChromeLinkById("registration_tracker");
    assert.ok(tracker);
    assert.equal(tracker.label, "Registration Tracker");
    assert.equal(tracker.href, REGISTRATION_TRACKER_HREF);
    assert.equal(tracker.href, "/saved/tracker");

    const labels = CAMPS_CHROME_LINKS.map((link) => link.label);
    assert.ok(labels.includes("Registration Tracker"));
    assert.ok(labels.includes("Saved"));
    assert.ok(labels.includes("Browse camps"));

    const blob = [...labels, ...CAMPS_CHROME_OMITTED].join(" ");
    assert.equal(CAMPS_CHROME_LINKS.some((l) => /planner/i.test(l.label)), false);
    assert.equal(
      CAMPS_CHROME_LINKS.some((l) => /buddies/i.test(l.label)),
      false,
    );
    assert.ok(CAMPS_CHROME_OMITTED.includes("Planner"));
    assert.ok(CAMPS_CHROME_OMITTED.includes("Camp Buddies"));
    void blob;

    assert.equal(isCampsChromeHrefActive("/saved/tracker", "/saved/tracker"), true);
    assert.equal(isCampsChromeHrefActive("/saved", "/saved/tracker"), false);
    assert.equal(isCampsChromeHrefActive("/camps", "/camps"), true);
  });
});

describe("Registration Tracker — empty", () => {
  it("explains saving camps and links back to /camps", () => {
    const view = buildRegistrationTracker(
      guestLocalSavedItemsSource(EMPTY_SHORTLIST),
      catalog,
      { now: NOW },
    );
    assert.equal(view.empty, true);
    assert.equal(view.rows.length, 0);
    assert.equal(view.emptyTitle, TRACKER_EMPTY_TITLE);
    assert.match(view.emptyTitle, /save camps to track registration windows/i);
    assert.equal(view.emptyCtaHref, TRACKER_EMPTY_CTA_HREF);
    assert.equal(view.emptyCtaHref, "/camps");
    assert.match(view.emptyBody, /heart a camp/i);
    assert.match(view.emptyBody, /does not process registration/i);
    assert.match(view.emptyBody, /does not invent seat inventory/i);
    assert.equal(view.sourceKind, "guest_local");
    assert.equal(trackerCopyClaimsLiveSeats(TRACKER_EMPTY_BODY), false);
  });
});

describe("Registration Tracker — saved items with known opens_on", () => {
  it("shows Registration opens … from registrationOpensOn on file", () => {
    const opensSession = sessionById("sess-dev-art-cc");
    assert.equal(opensSession.registrationOpensOn, "2026-09-01");
    assert.equal(opensSession.registrationDeadlineOn ?? null, null);

    let state = applySave(
      EMPTY_SHORTLIST,
      {
        kind: "camp_session",
        programId: "prog-dev-art-trail",
        sessionId: "sess-dev-art-cc",
      },
      NOW,
    );
    const view = buildRegistrationTracker(
      guestLocalSavedItemsSource(state),
      catalog,
      { now: NOW },
    );
    assert.equal(view.empty, false);
    assert.equal(view.rows.length, 1);
    const row = view.rows[0];
    assert.equal(row.programName, "Art Trail Week (dev fixture)");
    assert.match(
      row.signals.map((s) => s.text).join(" "),
      /Registration opens September 1, 2026/,
    );
    assert.equal(
      formatOpensOnSignal(opensSession.registrationOpensOn),
      "Registration opens September 1, 2026",
    );
    assert.equal(row.missingDataUrgent, false);
    assert.equal(row.verifyHref, "https://example.invalid/harbour/info");
    assert.equal(row.verifyLabel, TRACKER_VERIFY_LABEL);
    assert.equal(
      row.signals.some((s) => s.id === "deadline_on_file"),
      false,
    );
  });
});

describe("Registration Tracker — unknown status copy", () => {
  it("treats unknown as check-provider, never closed / full / open", () => {
    const unknown = sessionById("sess-dev-nature-sparse");
    assert.equal(unknown.registrationStatus, "availability_unknown");
    assert.equal(trackerLifecycleCopy(unknown), TRACKER_UNKNOWN_STATUS);

    const signals = buildTrackerSignals(unknown);
    const text = signals.map((s) => s.text).join(" ");
    assert.match(text, /Status unknown — check provider/);
    assert.doesNotMatch(text, /\bclosed\b/i);
    assert.doesNotMatch(text, /\bfull\b/i);
    assert.doesNotMatch(text, /\bopen\b/i);
    assert.equal(
      signals.every((s) => s.tone === "unknown" || s.id !== "unknown"),
      true,
    );
    assert.ok(signals.some((s) => s.tone === "unknown"));

    let state = applySave(
      EMPTY_SHORTLIST,
      {
        kind: "camp_session",
        programId: "prog-dev-missing-info",
        sessionId: "sess-dev-nature-sparse",
      },
      NOW,
    );
    const view = buildRegistrationTracker(
      guestLocalSavedItemsSource(state),
      catalog,
      { now: NOW },
    );
    const blob = collectTrackerDisplayText(view);
    assert.match(blob, /Status unknown — check provider/);
    assert.doesNotMatch(blob, /this session is full/i);
    assert.doesNotMatch(blob, /registration closed/i);
  });
});

describe("Registration Tracker — no live seats claim", () => {
  it("never claims live seats, filling fast, or a countdown", () => {
    let state = EMPTY_SHORTLIST;
    for (const session of campsDevSessions) {
      state = applySave(
        state,
        {
          kind: "camp_session",
          programId: session.programId,
          sessionId: session.id,
        },
        NOW,
      );
    }
    const view = buildRegistrationTracker(
      guestLocalSavedItemsSource(state),
      catalog,
      { now: NOW },
    );
    assert.ok(view.rows.length >= 2);
    const blob = collectTrackerDisplayText(view);
    const signalText = view.rows
      .flatMap((row) => row.signals.map((s) => s.text))
      .join("\n");
    assert.equal(trackerCopyClaimsLiveSeats(blob), false);
    assert.doesNotMatch(signalText, /live seats?/i);
    assert.doesNotMatch(signalText, /seats? available/i);
    assert.doesNotMatch(signalText, /filling fast/i);
    assert.doesNotMatch(signalText, /days left/i);
    assert.doesNotMatch(signalText, /countdown/i);
    assert.match(blob, /not a confirmed seat/);

    const openSession = sessionById("sess-dev-stem-w1");
    assert.equal(openSession.registrationStatus, "registration_open");
    assert.match(
      trackerLifecycleCopy(openSession),
      /not a confirmed seat/,
    );
    assert.doesNotMatch(trackerLifecycleCopy(openSession), /seat available/i);

    assert.equal(formatDeadlineOnFile(null), null);
    assert.equal(formatDeadlineOnFile("2026-10-01"), "Deadline on file October 1, 2026");
    assert.ok(
      campsDevSessions.every((s) => s.registrationDeadlineOn == null),
      "fixtures must not invent registration deadlines",
    );
  });

  it("keeps account saved_items on the same tracker shape as guest_local", () => {
    const guestState = applySave(
      EMPTY_SHORTLIST,
      {
        kind: "camp_session",
        programId: "prog-dev-art-trail",
        sessionId: "sess-dev-art-cc",
      },
      NOW,
    );
    const fromAccount = buildRegistrationTracker(
      accountSavedItemsSource(guestState.items),
      catalog,
      { now: NOW },
    );
    const fromGuest = buildRegistrationTracker(
      guestLocalSavedItemsSource(guestState),
      catalog,
      { now: NOW },
    );
    assert.equal(fromAccount.sourceKind, "account_saved_items");
    assert.equal(fromGuest.sourceKind, "guest_local");
    assert.equal(fromAccount.rows.length, fromGuest.rows.length);
    assert.equal(fromAccount.rows[0].signals[0].text, fromGuest.rows[0].signals[0].text);
  });
});
