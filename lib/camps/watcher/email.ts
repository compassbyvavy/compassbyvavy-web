import { torontoDayLabel } from "./toronto";

export type EmailChange = {
  camp: string;
  break: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

const BREAK_LABEL: Record<string, string> = {
  winter: "winter",
  pa_day: "PA day",
  march_break: "March Break",
  summer: "summer",
};

function breakLabel(value: string): string {
  return BREAK_LABEL[value] ?? value;
}

function who(change: EmailChange): string {
  return `${change.camp} ${breakLabel(change.break)}`;
}

function summarize(change: EmailChange): string {
  if (change.field === "page_text") {
    const extra = change.newValue && change.newValue.length <= 80 ? change.newValue : "";
    return extra ? `page changed, ${extra}` : "page changed";
  }
  if (change.field === "unreachable") return "site unreachable 2 nights";
  if (change.field === "needs_call") return "call or email";
  if (change.field === "spots" && change.note === "urgent") {
    if (change.newValue === "0") return `full (was ${change.oldValue ?? "0"} open)`;
    return "open (was full)";
  }
  if (change.field === "session_new") return `new session ${change.newValue ?? ""}`.trim();
  if (change.field === "session_gone") return `session gone ${change.oldValue ?? ""}`.trim();
  if (change.field === "registration") {
    const next = change.newValue === "open" ? "registration now open" : `registration ${change.newValue ?? "updated"}`;
    return change.oldValue ? `${next} (was "${change.oldValue}")` : next;
  }
  return `${change.field} ${change.oldValue ?? "—"} → ${change.newValue ?? "—"}`;
}

export function emailLine(change: EmailChange): string {
  const summary = summarize(change);
  if (change.note === "urgent") return `Urgent: ${who(change)}, ${summary}`;
  return `${who(change)}: ${summary}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMorningEmail(now: Date, changes: EmailChange[]): RenderedEmail | null {
  if (changes.length === 0) return null;
  const ordered = [...changes].sort((a, b) => {
    const urgentA = a.note === "urgent" ? 0 : 1;
    const urgentB = b.note === "urgent" ? 0 : 1;
    if (urgentA !== urgentB) return urgentA - urgentB;
    return who(a).localeCompare(who(b));
  });
  const label = torontoDayLabel(now);
  const subject = `Camp Watcher, ${label}: ${ordered.length} to review`;
  const lines = ordered.map(emailLine);
  const text = [subject, "", ...lines].join("\n");
  const items = ordered
    .map((change) => {
      const line = escapeHtml(emailLine(change));
      const style =
        change.note === "urgent"
          ? "margin:0 0 12px;padding:8px 12px;border-left:4px solid #8A5F2A;background:#F3E7D3;"
          : "margin:0 0 12px;padding:8px 12px;border-left:4px solid #E4DFD2;";
      return `<p style="${style}">${line}</p>`;
    })
    .join("");
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#FAF8F3;color:#1F2E25;font-family:Georgia,serif;">
  <div style="max-width:640px;margin:24px auto;background:#ffffff;padding:28px 24px;">
    <p style="margin:0 0 8px;letter-spacing:0.04em;text-transform:uppercase;font-family:Inter,Arial,sans-serif;font-size:12px;color:#6E7568;">Compass by Vavy</p>
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:500;">Camp Watcher, ${escapeHtml(label)}</h1>
    <p style="margin:0 0 20px;font-family:Inter,Arial,sans-serif;">${ordered.length} to review</p>
    ${items}
  </div>
</body>
</html>`;
  return { subject, text, html };
}

/** The spec's made-up morning list, rendered by the same function as a real night. */
export function sampleMorningEmail(): RenderedEmail {
  const rendered = renderMorningEmail(new Date("2026-11-18T12:00:00Z"), [
    {
      camp: "KSG Gymnastics",
      break: "winter",
      field: "registration",
      oldValue: "opens Nov 17, 1 pm",
      newValue: "open",
      note: "urgent",
    },
    {
      camp: "Riverwood",
      break: "march_break",
      field: "page_text",
      oldValue: "dates to come",
      newValue: "2027 dates posted",
      note: null,
    },
    {
      camp: "Futures Gymnastics",
      break: "march_break",
      field: "spots",
      oldValue: "3",
      newValue: "0",
      note: "urgent",
    },
    {
      camp: "CJ's Skatepark",
      break: "winter",
      field: "unreachable",
      oldValue: "unreachable",
      newValue: "unreachable",
      note: null,
    },
  ]);
  if (!rendered) throw new Error("sample morning email was empty");
  return rendered;
}

export function buildMimeMessage(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): string {
  const boundary = "camp-watcher-boundary";
  return [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    input.html,
    `--${boundary}--`,
    "",
  ].join("\r\n");
}
