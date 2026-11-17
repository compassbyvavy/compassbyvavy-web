import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildForm, extraQuestions, gapLabels, isLastYear, minutesFor } from "@/lib/camps/listingForm/build";
import { flushQueue, reminderDue, renderInviteEmail } from "@/lib/camps/listingForm/email";
import { EXAMPLE_COMPLETE, initialState, KSG } from "@/lib/camps/listingForm/fixtures";
import { applyReview, confirmedLine, isPublic } from "@/lib/camps/listingForm/review";
import { checkSubmission, hashToken, linkStatus, tokenMatches } from "@/lib/camps/listingForm/submit";
import type { CampRecord, ListingState, Submission } from "@/lib/camps/listingForm/types";

const today = "2026-11-16";

function contact() {
  return { name: "Ada", role: "Owner", email: "ada@example.invalid", phone: "", publicPhone: "", publicEmail: "" };
}

describe("listing form rules", () => {
  it("shows a known value as Confirm and an empty one as Fill in", () => {
    const form = buildForm(KSG);
    const ages = form.blocks[0].fields.find((field) => field.fieldKey === "ages");
    const food = form.ask.find((field) => field.fieldKey === "food");
    assert.equal(ages?.mode, "confirm");
    assert.equal(ages?.prefilled, "4–12");
    assert.equal(food?.mode, "fill");
    assert.equal(food?.prefilled, null);
  });

  it("tags a value checked before Sep 1, 2026 as last year's info", () => {
    const camp: CampRecord = {
      ...KSG,
      programs: [
        {
          ...KSG.programs[0],
          facts: KSG.programs[0].facts.map((fact) => (fact.key === "price" ? { ...fact, checkedOn: "2026-08-15" } : fact)),
        },
      ],
    };
    const price = buildForm(camp).blocks[0].fields.find((field) => field.fieldKey === "price");
    assert.equal(price?.mode, "confirm");
    assert.equal(price?.lastYear, true);
    assert.equal(isLastYear({ key: "ages", value: "4–12 (2025–26)", checkedOn: "2026-11-01" }), true);
  });

  it("moves a parent question we already answered into Check what we have", () => {
    const camp: CampRecord = {
      ...KSG,
      parentFacts: [{ key: "food", value: "Kids bring a packed lunch.", checkedOn: "2026-11-15" }],
    };
    const form = buildForm(camp);
    assert.equal(form.blocks[0].fields.some((field) => field.fieldKey === "food" && field.mode === "confirm"), true);
    assert.equal(form.ask.some((field) => field.fieldKey === "food"), false);
  });

  it("never shows more than 3 extra questions, and hides the section when there are none", () => {
    assert.equal(buildForm(KSG).questions.length, 0);
    const camp: CampRecord = {
      ...KSG,
      sources: [{ adapter: "page" }],
      pendingChanges: [
        { field: "price", from: "$68 a day", to: "$60 a day" },
        { field: "hours", from: "9:00 am–4:00 pm", to: "9:00 am–3:00 pm" },
      ],
      programs: [
        KSG.programs[0],
        {
          id: "west",
          location: "West",
          breakLabel: "Winter break",
          facts: KSG.programs[0].facts.map((fact) => (fact.key === "price" ? { ...fact, value: "$50 a day" } : fact)),
        },
      ],
    };
    const questions = extraQuestions(camp, ["Is the kitchen nut-free?", "Do you have a waitlist?", "What is drop-off like?"]);
    assert.equal(questions.length, 3);
    assert.deepEqual(questions.map((question) => question.kind), ["custom", "custom", "custom"]);
    const mixed = extraQuestions(camp, ["Is the kitchen nut-free?"]);
    assert.equal(mixed.length, 3);
    assert.equal(mixed[0].kind, "custom");
    assert.equal(mixed[1].kind, "watcher");
    assert.equal(mixed[2].kind, "watcher");
  });

  it("asks when the same field differs by location", () => {
    const camp: CampRecord = {
      ...KSG,
      programs: [
        { ...KSG.programs[0], id: "sq1", location: "Square One" },
        {
          id: "stv",
          location: "Streetsville",
          breakLabel: "March Break",
          facts: KSG.programs[0].facts.map((fact) => (fact.key === "price" ? { ...fact, value: "$350 a week" } : fact)),
        },
      ],
    };
    const prompt = extraQuestions(camp, []).find((question) => question.kind === "locations");
    assert.match(prompt?.prompt ?? "", /Square One/);
    assert.match(prompt?.prompt ?? "", /Streetsville/);
  });

  it("refuses a submit without the photo and accuracy ticks, and does not publish it", () => {
    const form = buildForm(KSG);
    const refused = checkSubmission(form, {
      contact: contact(),
      answers: {},
      photos: [],
      photoRights: false,
      childPermission: false,
      accuracyConfirmed: false,
      typedName: "",
      today,
      submitsToday: 0,
      inviteStatus: "sent",
    });
    assert.equal(refused.ok, false);
    const accepted = checkSubmission(form, {
      contact: contact(),
      answers: { "winter.price": { value: "$60 a day", confirmed: false }, food: { value: "Kids bring a packed lunch.", confirmed: false } },
      photos: [],
      photoRights: true,
      childPermission: true,
      accuracyConfirmed: true,
      typedName: "Ada",
      today,
      submitsToday: 0,
      inviteStatus: "sent",
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    const state: ListingState = {
      ...initialState(),
      submissions: [
        {
          id: 1,
          inviteId: "invite-ksg",
          submittedAt: today,
          contact: contact(),
          answers: accepted.answers,
          photos: [],
          photoRights: true,
          childPermission: true,
          accuracyConfirmed: true,
          typedName: "Ada",
          reviewStatus: "pending",
          reviewedAt: null,
          note: null,
        },
      ],
    };
    assert.equal(isPublic(state, "invite-ksg"), false);
    assert.equal(confirmedLine(state, "invite-ksg"), null);
    const approved = applyReview(state, 1, { status: "approved", today });
    assert.equal(confirmedLine(approved.state, "invite-ksg"), `Confirmed by the camp, ${today}`);
    assert.equal(isPublic(state, "invite-ksg"), false);
  });

  it("rejects a wrong or expired token with a status the page can explain", () => {
    assert.equal(tokenMatches("nope", hashToken(DEMO_TOKEN)), false);
    assert.equal(linkStatus("sent", "2026-11-01", today), "expired");
    assert.equal(linkStatus("sent", "2027-01-15", today), "ok");
    assert.equal(linkStatus("opted_out", "2027-01-15", today), "opted_out");
  });
});

const DEMO_TOKEN = "ksg-confirm-demo-7f3a9c2e1b8d4f6a0c5e9b";

describe("invite emails", () => {
  it("writes a short email when little is missing, and names the gaps otherwise", () => {
    const gaps = buildForm(KSG);
    assert.equal(minutesFor(gaps.fillInCount), 5);
    assert.deepEqual(gapLabels(KSG, gaps).slice(0, 4), ["food and allergies", "refunds", "staff", "photos"]);
    const complete = buildForm(EXAMPLE_COMPLETE);
    assert.equal(complete.fillInCount, 0);
    assert.equal(minutesFor(complete.fillInCount), 2);
    assert.deepEqual(gapLabels(EXAMPLE_COMPLETE, complete), []);
    const mail = renderInviteEmail({
      campName: "KSG Gymnastics (Kids Supergym)",
      minutes: 5,
      gaps: ["food and allergies", "refunds"],
      formLink: "https://compassbyvavy.ca/camps/confirm/token",
      unsubscribeLink: "https://compassbyvavy.ca/camps/unsubscribe/token",
      mailingAddress: "",
    });
    assert.equal(mail.canSend, false);
    assert.match(mail.subject, /please check your free listing/);
    assert.match(mail.text, /food and allergies, refunds/);
    assert.match(mail.text, /Prefer not to hear from us/);
  });

  it("sends at most 20 a day, one reminder after 7 days, and never a third email", () => {
    const state = initialState();
    const first = flushQueue(state, { inviteIds: ["invite-ksg"], today, mailingAddress: "1 Main St", kind: "sent" });
    assert.deepEqual(first.sent, ["invite-ksg"]);
    const invite = first.state.invites.find((item) => item.id === "invite-ksg")!;
    assert.equal(reminderDue(invite, "2026-11-20"), false);
    assert.equal(reminderDue({ ...invite, sentAt: "2026-11-09" }, "2026-11-16"), true);
    assert.equal(reminderDue({ ...invite, sentAt: "2026-11-09", openedAt: "2026-11-10" }, "2026-11-16"), false);
    const full = { ...state, sendDates: Array.from({ length: 20 }, () => today) };
    const blocked = flushQueue(full, { inviteIds: ["invite-ksg"], today, mailingAddress: "1 Main St", kind: "sent" });
    assert.deepEqual(blocked.sent, []);
    assert.deepEqual(blocked.waiting, ["invite-ksg"]);
    const twice = flushQueue(
      { ...first.state, invites: first.state.invites.map((item) => (item.id === "invite-ksg" ? { ...item, sendCount: 2 } : item)) },
      { inviteIds: ["invite-ksg"], today, mailingAddress: "1 Main St", kind: "reminder" },
    );
    assert.deepEqual(twice.sent, []);
  });
});

void (0 as unknown as Submission);
