"use client";

import { useShortlist } from "@/components/shortlist/ShortlistProvider";
import type { ShortlistRef } from "@/lib/shortlist/types";

export type SaveControlProps = {
  refToSave: ShortlistRef;
  label: string;
  /** Compact heart on cards; labeled control on detail. */
  variant?: "heart" | "button";
};

export function SaveControl({
  refToSave,
  label,
  variant = "heart",
}: SaveControlProps) {
  const { hydrated, isSaved, toggleSave } = useShortlist();
  const saved = hydrated && isSaved(refToSave);
  const actionLabel = saved ? `Remove ${label} from saved list` : `Save ${label}`;

  return (
    <button
      type="button"
      className={
        variant === "button"
          ? saved
            ? "shortlist-save shortlist-save-button is-saved"
            : "shortlist-save shortlist-save-button"
          : saved
            ? "shortlist-save shortlist-save-heart is-saved"
            : "shortlist-save shortlist-save-heart"
      }
      aria-pressed={saved}
      aria-label={actionLabel}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSave(refToSave);
      }}
    >
      <span aria-hidden="true" className="shortlist-save-icon">
        {saved ? "♥" : "♡"}
      </span>
      {variant === "button" ? (
        <span>{saved ? "Saved" : "Save"}</span>
      ) : (
        <span className="visually-hidden">{actionLabel}</span>
      )}
    </button>
  );
}
