"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyMarkRegistered,
  applyReconcileUnavailable,
  applyRemove,
  applySave,
  applyToggleSave,
  countActive,
  isSaved,
} from "@/lib/shortlist/actions";
import {
  readShortlistFromStorage,
  writeShortlistToStorage,
} from "@/lib/shortlist/storage";
import {
  EMPTY_SHORTLIST,
  SHORTLIST_STORAGE_KEY,
  type ShortlistRef,
  type ShortlistState,
} from "@/lib/shortlist/types";

type ShortlistContextValue = {
  state: ShortlistState;
  hydrated: boolean;
  savedCount: number;
  isSaved: (ref: ShortlistRef) => boolean;
  save: (ref: ShortlistRef) => void;
  remove: (ref: ShortlistRef) => void;
  toggleSave: (ref: ShortlistRef) => void;
  markRegistered: (ref: ShortlistRef, marked: boolean) => void;
  reconcileUnavailable: (publicIds: {
    programIds: Set<string>;
    sessionIds: Set<string>;
  }) => void;
};

const ShortlistContext = createContext<ShortlistContextValue | null>(null);

export function ShortlistProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShortlistState>(EMPTY_SHORTLIST);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readShortlistFromStorage(window.localStorage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeShortlistToStorage(window.localStorage, state);
  }, [hydrated, state]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== SHORTLIST_STORAGE_KEY) return;
      setState(readShortlistFromStorage(window.localStorage));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((ref: ShortlistRef) => {
    setState((current) => applySave(current, ref, new Date()));
  }, []);

  const remove = useCallback((ref: ShortlistRef) => {
    setState((current) => applyRemove(current, ref, new Date()));
  }, []);

  const toggleSave = useCallback((ref: ShortlistRef) => {
    setState((current) => applyToggleSave(current, ref, new Date()));
  }, []);

  const markRegistered = useCallback((ref: ShortlistRef, marked: boolean) => {
    setState((current) => applyMarkRegistered(current, ref, marked, new Date()));
  }, []);

  const reconcileUnavailable = useCallback(
    (publicIds: { programIds: Set<string>; sessionIds: Set<string> }) => {
      setState((current) =>
        applyReconcileUnavailable(current, publicIds, new Date()),
      );
    },
    [],
  );

  const value = useMemo<ShortlistContextValue>(
    () => ({
      state,
      hydrated,
      savedCount: countActive(state),
      isSaved: (ref) => isSaved(state, ref),
      save,
      remove,
      toggleSave,
      markRegistered,
      reconcileUnavailable,
    }),
    [
      state,
      hydrated,
      save,
      remove,
      toggleSave,
      markRegistered,
      reconcileUnavailable,
    ],
  );

  return (
    <ShortlistContext.Provider value={value}>
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist(): ShortlistContextValue {
  const ctx = useContext(ShortlistContext);
  if (!ctx) {
    throw new Error("useShortlist must be used within ShortlistProvider");
  }
  return ctx;
}
