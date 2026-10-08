import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";

export const RANGES = ["7d", "30d", "90d", "365d"] as const;
export type Range = (typeof RANGES)[number];

interface AdminDashboardState {
  range: Range;
  realtime: boolean;
  tabs: Record<string, string>;
}

const initialState: AdminDashboardState = { range: "7d", realtime: false, tabs: {} };

export const adminDashboardSlice = createSlice({
  name: "adminDashboard",
  initialState,
  reducers: {
    setRange: (state, action: PayloadAction<Range>) => {
      state.range = action.payload;
    },
    toggleRealtime: (state) => {
      state.realtime = !state.realtime;
    },
    setTab: (state, action: PayloadAction<{ section: string; tab: string }>) => {
      state.tabs[action.payload.section] = action.payload.tab;
    },
  },
});

export const useAdminDashboard = createSliceHook(adminDashboardSlice);

export function rangeToDates(range: Range): { from: string } {
  const days = Number(range.replace("d", ""));
  const from = new Date(Math.floor(Date.now() / 60_000) * 60_000 - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString() };
}
