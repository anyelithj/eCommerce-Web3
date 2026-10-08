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
