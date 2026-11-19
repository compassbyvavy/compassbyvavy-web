"use client";

import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { readSaved, subscribeSaved, toggleSaved, type SavedGuide } from "@/components/shell/saved";

export function SaveButton({ item }: { item: SavedGuide }) {
  const saved = useSyncExternalStore(
    subscribeSaved,
    () => readSaved().some((row) => row.id === item.id),
    () => false,
  );
  return (
    <button
      className={saved ? "icon-button saved" : "icon-button"}
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${item.title} from saved` : `Save ${item.title}`}
      onClick={() => toggleSaved(item)}
    >
      <Heart aria-hidden="true" size={22} fill={saved ? "#33503E" : "none"} />
    </button>
  );
}
