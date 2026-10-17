"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  COMMAND_GROUP_ORDER,
  buildCommandItems,
  filterCommandItems,
} from "@/lib/search/commandMenu";

export type CommandMenuProps = {
  camps: { id: string; slug: string; name: string; providerName: string | null }[];
};

export function CommandMenu({ camps }: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const items = useMemo(() => buildCommandItems({ camps }), [camps]);
  const visible = filterCommandItems(items, query).slice(0, 24);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const open = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("compass:open-command-palette", open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("compass:open-command-palette", open);
    };
  }, []);

  if (!open) return null;

  return (
    <div className="cmdk-root">
      <button
        type="button"
        className="cmdk-backdrop"
        aria-label="Close search"
        onClick={() => setOpen(false)}
      />
      <div className="cmdk-dialog" role="dialog" aria-modal="true" aria-label="Search Compass">
        <input
          autoFocus
          value={query}
          placeholder="Search categories, places, guides, camps"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="cmdk-scroll">
          {COMMAND_GROUP_ORDER.map((group) => {
            const rows = visible.filter((item) => item.group === group.id);
            if (rows.length === 0) return null;
            return (
              <section key={group.id}>
                <h2>{group.label}</h2>
                <ul>
                  {rows.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} onClick={() => setOpen(false)}>
                        <span>{item.label}</span>
                        {item.hint ? <small>{item.hint}</small> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <p>Cmd or Ctrl K. This searches what Compass has loaded, not a live city index.</p>
      </div>
    </div>
  );
}
