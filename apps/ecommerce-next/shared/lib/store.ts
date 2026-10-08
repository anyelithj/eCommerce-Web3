// store.ts (Redux Toolkit) => infraestructura del estado global de CLIENTE/UI. El store se arma en la capa app
// (app/[locale]/providers.tsx) con los slices de cada feature; aquí solo vive lo que todos comparten (FSD: shared
// nunca importa de features).
// Regla del proyecto: los datos del backend son Server State y los gestiona TanStack Query (query-client.ts).
// Redux guarda solo lo que el cliente decide: pasos de un flujo, filtros, selecciones, preferencias, toasts.
import {
  bindActionCreators,
  type EnhancedStore,
  type Slice,
  type SliceCaseReducers,
} from "@reduxjs/toolkit";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

// createSliceHook => hook "estado + acciones" de un slice: const { rating, setRating } = useReviewFilter().
// Cada slice se registra en el store con su "name" como clave (combineSlices), por eso se selecciona por nombre.
// Los componentes no importan useSelector/useDispatch ni conocen la forma del estado raíz (Facade).
export function createSliceHook<
  State,
  CaseReducers extends SliceCaseReducers<State>,
  Name extends string,
>(slice: Slice<State, CaseReducers, Name>) {
  return function useSlice() {
    const state = useSelector((root: Record<Name, State>) => root[slice.name]);
    const dispatch = useDispatch();
    // "bindActionCreators" => cada acción ya despacha al llamarse; "useMemo" => referencias estables entre renders
    const actions = useMemo(() => bindActionCreators(slice.actions, dispatch), [dispatch]);
    return { ...state, ...actions };
  };
}

// --- Store del navegador: lo usan las APIs imperativas (toast.success desde un onSuccess de useMutation) ---
let browserStore: EnhancedStore | undefined;

export function registerBrowserStore(store: EnhancedStore): void {
  if (typeof window !== "undefined") browserStore = store;
}

export function getBrowserStore(): EnhancedStore | undefined {
  return browserStore;
}

// --- Persistencia: preferencias y recientes que deben sobrevivir a una recarga (sin librerías extra) ---
export interface PersistedSlice {
  name: string; // Nombre del slice (clave en el estado raíz)
  key: string; // Clave en el almacenamiento del navegador
  storage: "local" | "session"; // session => solo mientras dure la pestaña
  hydrate: (saved: never) => { type: string }; // Acción "hydrate" del slice: reemplaza el estado con lo guardado
}

function storageOf(kind: PersistedSlice["storage"]): Storage | undefined {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined; // Navegación privada o almacenamiento bloqueado: la app funciona sin persistir
  }
}

// persistSlices => 1) restaura lo guardado; 2) guarda cada slice cuando cambia. Se llama en un useEffect (solo
// navegador, después de hidratar el HTML) para que el primer render coincida con el del servidor.
// Devuelve la función que cancela la suscripción.
export function persistSlices(store: EnhancedStore, slices: PersistedSlice[]): () => void {
  for (const slice of slices) {
    const raw = storageOf(slice.storage)?.getItem(slice.key);
    if (!raw) continue;
    try {
      const saved = JSON.parse(raw) as { state?: unknown } | null;
      // "saved.state" => formato que dejaba la versión anterior (Zustand persist): se migra al leerlo
      store.dispatch(slice.hydrate((saved?.state ?? saved) as never));
    } catch {
      storageOf(slice.storage)?.removeItem(slice.key); // Valor corrupto: se descarta
    }
  }
  const last = new Map<string, unknown>();
  return store.subscribe(() => {
    const root = store.getState() as Record<string, unknown>;
    for (const slice of slices) {
      const value = root[slice.name];
      if (last.get(slice.name) === value) continue; // Redux es inmutable: misma referencia => sin cambios
      last.set(slice.name, value);
      storageOf(slice.storage)?.setItem(slice.key, JSON.stringify(value));
    }
  });
}
