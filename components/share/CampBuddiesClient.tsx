"use client";

import { useMemo, useState } from "react";
import { useShortlist } from "@/components/shortlist/ShortlistProvider";
import type { CampProgram, CampSession, Provider } from "@/data/camps/types";
import { buddyLink, sealBuddyPlan, type BuddyItem } from "@/lib/share/campBuddies";

export type CampBuddiesClientProps = {
  sessions: CampSession[];
  programs: CampProgram[];
  providers: Provider[];
};

export function CampBuddiesClient({
  sessions,
  programs,
  providers,
}: CampBuddiesClientProps) {
  const { state, hydrated } = useShortlist();
  const [selected, setSelected] = useState<string[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choices = useMemo(() => {
    const programsById = new Map(programs.map((program) => [program.id, program]));
    const providersById = new Map(providers.map((provider) => [provider.id, provider]));
    const saved = new Set(
      state.items.flatMap((item) =>
        item.ref.kind === "camp_session" ? [item.ref.sessionId] : [],
      ),
    );
    return sessions.flatMap((session) => {
      if (!saved.has(session.id)) return [];
      const program = programsById.get(session.programId);
      const provider = program ? providersById.get(program.providerId) : undefined;
      if (!program || !provider) return [];
      const choice: BuddyItem = {
        id: session.id,
        title: program.name,
        startDate: session.startDate ?? null,
        endDate: session.endDate ?? null,
      };
      return [choice];
    });
  }, [sessions, programs, providers, state.items]);

  if (!hydrated) return <p>Loading the list on this device…</p>;

  return (
    <div className="buddies">
      <header>
        <p className="buddies-kicker">Community</p>
        <h1>Camp Buddies</h1>
        <p>
          A private link for families you already know. It carries camp titles
          and dates, encrypted in the link itself. It does not include your
          name, your child&apos;s name, or an address.
        </p>
      </header>
      {choices.length === 0 ? (
        <p>Save a camp session on this device first. Nothing is shared until you build a link.</p>
      ) : (
        <ul>
          {choices.map((choice) => (
            <li key={choice.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(choice.id)}
                  onChange={(event) => {
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, choice.id]
                        : current.filter((id) => id !== choice.id),
                    );
                  }}
                />
                <span>
                  {choice.title}
                  {" · "}
                  {choice.startDate ?? "Dates unknown"}
                  {choice.endDate && choice.endDate !== choice.startDate
                    ? ` – ${choice.endDate}`
                    : ""}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={selected.length === 0}
        onClick={async () => {
          setError(null);
          const items = choices.filter((choice) => selected.includes(choice.id));
          try {
            const sealed = await sealBuddyPlan({ v: 1, items });
            setLink(buddyLink(window.location.origin, sealed));
          } catch {
            setError("The link could not be sealed on this device.");
          }
        }}
      >
        Create private link
      </button>
      {link ? (
        <p>
          <a href={link}>Open the private plan</a>
          <br />
          <small>{link}</small>
        </p>
      ) : null}
      {error ? <p role="status">{error}</p> : null}
    </div>
  );
}
