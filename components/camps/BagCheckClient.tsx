"use client";

import { useEffect, useMemo, useState } from "react";
import type { CampPackingItem } from "@/data/camps/types";

const STORAGE_PREFIX = "compass.bagcheck.v1:";

export type BagCheckClientProps = {
  programId: string;
  items: CampPackingItem[];
};

function readChecked(programId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + programId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export function BagCheckClient({ programId, items }: BagCheckClientProps) {
  const [checked, setChecked] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setChecked(readChecked(programId));
    setHydrated(true);
  }, [programId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_PREFIX + programId,
        JSON.stringify(checked),
      );
    } catch {
      /* private mode */
    }
  }, [checked, programId, hydrated]);

  const required = useMemo(
    () => items.filter((i) => i.kind === "required"),
    [items],
  );
  const suggested = useMemo(
    () => items.filter((i) => i.kind === "suggested"),
    [items],
  );

  const toggle = (text: string) => {
    setChecked((current) =>
      current.includes(text)
        ? current.filter((t) => t !== text)
        : [...current, text],
    );
  };

  if (items.length === 0) {
    return (
      <p className="camp-card-note">
        Packing list not verified — nothing is marked required or suggested
        here.
      </p>
    );
  }

  const renderList = (rows: CampPackingItem[], heading: string) => (
    <div>
      <h3>{heading}</h3>
      {rows.length === 0 ? (
        <p className="camp-card-note">None verified in this group.</p>
      ) : (
        <ul className="bag-check-list">
          {rows.map((item) => (
            <li key={`${item.kind}-${item.text}`}>
              <label className="bag-check-item">
                <input
                  type="checkbox"
                  checked={checked.includes(item.text)}
                  onChange={() => toggle(item.text)}
                />
                <span>{item.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="camp-detail-packing bag-check">
      <p className="camp-card-note">
        Checks stay on this device. Suggested items stay suggested — packing
        is not a provider booking.
      </p>
      {renderList(required, "Provider-required")}
      {renderList(suggested, "Suggested (not required)")}
    </div>
  );
}
