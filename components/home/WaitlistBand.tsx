"use client";

import { useState } from "react";
import { waitlistEmailError, waitlistMailto } from "@/lib/home/home";

export function WaitlistBand() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <section className="home-wait" id="waitlist">
      <div className="container home-wait-inner">
        <h2>Be first in when we open on January 1.</h2>
        <p>
          Launching first in the GTA. One email when we open, then the occasional weekend idea. Unsubscribe anytime.
        </p>
        {done ? (
          <p className="home-wait-status" role="status">
            Your email app should open so you can send the request to hello@compassbyvavy.ca.
          </p>
        ) : (
          <form
            className="home-wait-form"
            onSubmit={(event) => {
              event.preventDefault();
              const problem = waitlistEmailError(email);
              if (problem) {
                setError(problem);
                setDone(false);
                return;
              }
              setError(null);
              window.location.href = waitlistMailto(email);
              setDone(true);
            }}
          >
            <label>
              <span className="visually-hidden">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "waitlist-error" : undefined}
              />
            </label>
            <button type="submit">Join the waitlist</button>
          </form>
        )}
        {error ? (
          <p className="home-wait-error" id="waitlist-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
