import {
  bindActionCreators,
  type EnhancedStore,
  type Slice,
  type SliceCaseReducers,
} from "@reduxjs/toolkit";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

export function createSliceHook<
  State,
  CaseReducers extends SliceCaseReducers<State>,
  Name extends string,
>(slice: Slice<State, CaseReducers, Name>) {
  return function useSlice() {
    const state = useSelector((root: Record<Name, State>) => root[slice.name]);
    const dispatch = useDispatch();
    const actions = useMemo(() => bindActionCreators(slice.actions, dispatch), [dispatch]);
    return { ...state, ...actions };
  };
}

let browserStore: EnhancedStore | undefined;

export function registerBrowserStore(store: EnhancedStore): void {
  if (typeof window !== "undefined") browserStore = store;
}

export function getBrowserStore(): EnhancedStore | undefined {
  return browserStore;
}

export interface PersistedSlice {
  name: string;
  key: string;
  storage: "local" | "session";
  hydrate: (saved: never) => { type: string };
}

function storageOf(kind: PersistedSlice["storage"]): Storage | undefined {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function persistSlices(store: EnhancedStore, slices: PersistedSlice[]): () => void {
  for (const slice of slices) {
    const raw = storageOf(slice.storage)?.getItem(slice.key);
    if (!raw) continue;
    try {
      const saved = JSON.parse(raw) as { state?: unknown } | null;
      store.dispatch(slice.hydrate((saved?.state ?? saved) as never));
    } catch {
      storageOf(slice.storage)?.removeItem(slice.key);
    }
  }
  const last = new Map<string, unknown>();
  return store.subscribe(() => {
    const root = store.getState() as Record<string, unknown>;
    for (const slice of slices) {
      const value = root[slice.name];
      if (last.get(slice.name) === value) continue;
      last.set(slice.name, value);
      storageOf(slice.storage)?.setItem(slice.key, JSON.stringify(value));
    }
  });
}
