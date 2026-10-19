"use client";

import { useMemo, useState } from "react";
import type { CampPackingItem } from "@/data/camps/types";
import { bagProgress, toggleBagItem } from "@/lib/camps/bagCheck";

export type BagCheckClientProps = {
  programId: string;
  items: CampPackingItem[];
};

export function BagCheckClient({ programId, items }: BagCheckClientProps) {
  const [checked, setChecked] = useState<string[]>([]);
  const required = useMemo(
    () => items.filter((item) => item.kind === "required"),
    [items],
  );
  const suggested = useMemo(
    () => items.filter((item) => item.kind === "suggested"),
    [items],
  );

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
          {rows.map((item) => {
            const on = checked.includes(item.text);
            return (
              <li key={`${item.kind}-${item.text}`}>
                <label className={on ? "bag-check-item is-checked" : "bag-check-item"}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setChecked((current) => toggleBagItem(current, item.text))
                    }
                  />
                  <span>{item.text}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="camp-detail-packing bag-check" data-program={programId}>
      <p className="bag-check-progress" role="status">
        {bagProgress(items.length, checked.length)}
      </p>
      <p className="camp-card-note">
        Checks stay on this screen. Leaving the page clears them. Suggested
        items stay suggested.
      </p>
      {renderList(required, "Provider-required")}
      {renderList(suggested, "Suggested (not required)")}
    </div>
  );
}
