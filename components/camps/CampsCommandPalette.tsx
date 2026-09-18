"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CampProgram, Provider } from "@/data/camps/types";
import { CAMPS_CHROME_LINKS } from "@/lib/camps/campsChrome";

export type CampsCommandPaletteProps = {
  programs: CampProgram[];
  providers: Provider[];
};

export function CampsCommandPalette({
  programs,
  providers,
}: CampsCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen((v) => !v);
    }
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    const open = () => setOpen(true);
    window.addEventListener("compass:open-command-palette", open);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("compass:open-command-palette", open);
    };
  }, [onKey]);

  const providersById = useMemo(
    () => new Map(providers.map((p) => [p.id, p])),
    [providers],
  );

  const q = query.trim().toLowerCase();
  const programHits = useMemo(() => {
    if (!q) return programs.slice(0, 8);
    return programs
      .filter((p) => {
        const provider = providersById.get(p.providerId)?.name ?? "";
        return `${p.name} ${provider} ${p.primaryCategory ?? ""}`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 8);
  }, [programs, providersById, q]);

  if (!open) return null;

  return (
    <div className="camps-cmd-root">
      <button
        type="button"
        className="camps-cmd-backdrop"
        aria-label="Close search"
        onClick={() => setOpen(false)}
      />
      <div
        className="camps-cmd-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search camps"
      >
        <input
          autoFocus
          className="camps-cmd-input"
          placeholder="Search camps, saved, tracker…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="camps-cmd-list">
          {CAMPS_CHROME_LINKS.map((link) => (
            <li key={link.id}>
              <Link href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            </li>
          ))}
          {programHits.map((program) => (
            <li key={program.id}>
              <Link
                href={`/camps/${program.slug}`}
                onClick={() => setOpen(false)}
              >
                {program.name}
                <span className="camp-card-note">
                  {" "}
                  · {providersById.get(program.providerId)?.name ?? "Provider to confirm"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="camp-card-note">
          Local catalog search — not a live citywide index. Esc to close.
        </p>
      </div>
    </div>
  );
}
