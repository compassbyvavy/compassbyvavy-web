"use client";

import { useRef, useState } from "react";
import { joinWaitlist } from "@/app/waitlist/actions";

type Props = {
  sourcePage: string;
  category?: string;
  subcategory?: string;
  city?: string;
  buttonLabel?: string;
  consentLabel?: string;
  idPrefix: string;
  stacked?: boolean;
};

export function WaitlistForm({
  sourcePage,
  category,
  subcategory,
  city,
  buttonLabel = "Join the waitlist",
  consentLabel = "Email me when Compass opens. I can unsubscribe any time.",
  idPrefix,
  stacked = false,
}: Props) {
  const startedAt = useRef(Date.now());
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("saving");
    setError("");
    const result = await joinWaitlist({
      email: String(form.get("email") ?? ""),
      consent: form.get("consent") === "on",
      company: String(form.get("company") ?? ""),
      startedAt: startedAt.current,
      sourcePage,
      category,
      subcategory,
      city,
    });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <p className="form-success" role="status">
        You&apos;re on the list. We&apos;ll send one email when Compass opens.
      </p>
    );
  }

  const emailId = `${idPrefix}-email`;
  const consentId = `${idPrefix}-consent`;

  return (
    <form className={stacked ? "waitlist-form stacked" : "waitlist-form"} onSubmit={onSubmit} noValidate>
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${idPrefix}-company`}>Company</label>
        <input id={`${idPrefix}-company`} name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="field" htmlFor={emailId}>
        <span className="field-label">Email</span>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? `${idPrefix}-error` : undefined}
        />
      </label>
      <label className="consent" htmlFor={consentId}>
        <input id={consentId} name="consent" type="checkbox" />
        <span>{consentLabel}</span>
      </label>
      <button className="button" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : buttonLabel}
      </button>
      {status === "error" ? (
        <p className="form-error" id={`${idPrefix}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
