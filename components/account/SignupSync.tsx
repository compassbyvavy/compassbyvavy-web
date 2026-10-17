"use client";

import { useState } from "react";
import { syncGuestState } from "@/lib/account/sync";

export function SignupSync() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="signup-sync"
      onSubmit={async (event) => {
        event.preventDefault();
        setMessage(null);
        const result = await syncGuestState({
          localStorage: window.localStorage,
          sessionStorage: window.sessionStorage,
        });
        if (!result.ok) {
          setMessage(`${result.reason} Your lists are still on this device.`);
          return;
        }
        setMessage(
          `Saved for ${name.trim() || "this guest"} at ${result.acceptedAt}. Local copies were cleared only after that confirmation. No auth provider is connected — this ack is a stub.`,
        );
      }}
    >
      <label>
        <span>Display name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="nickname"
        />
      </label>
      <button type="submit">Keep this on an account</button>
      <p>
        Optional. Browsing and the saved list work without this. Nothing is
        sent to a paid auth service.
      </p>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
