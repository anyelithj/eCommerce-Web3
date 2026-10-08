// product.store.ts (Redux Toolkit + localStorage) => productos vistos recientemente.
// Client State: es el HISTORIAL del visitante en este navegador (no existe en el backend), por eso no lo gestiona
// TanStack Query. Alimenta el carrusel "Vistos recientemente" (dato de UX, no de negocio).
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";
import type { ProductCard } from "@/entities/product/model/product.types";

const MAX_RECENT = 12;

interface RecentlyViewedState {
  items: ProductCard[];
}

const initialState: RecentlyViewedState = { items: [] };

export const recentlyViewedSlice = createSlice({
  name: "recentlyViewed",
  initialState,
  reducers: {
    // El producto visto pasa al inicio; se eliminan duplicados y se limita el tamaño (lista acotada)
    track: (state, action: PayloadAction<ProductCard>) => {
      state.items = [
        action.payload,
        ...state.items.filter((item) => item.id !== action.payload.id),
      ].slice(0, MAX_RECENT);
    },
    hydrate: (state, action: PayloadAction<Partial<RecentlyViewedState>>) => ({
      ...state,
      ...action.payload,
    }),
  },
});

export const useRecentlyViewed = createSliceHook(recentlyViewedSlice);
