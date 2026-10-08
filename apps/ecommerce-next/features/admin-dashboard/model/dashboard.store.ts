// dashboard.store.ts (Redux Toolkit) => Client State del panel admin: período elegido, modo "en vivo" y pestaña activa
// de cada sección. Los KPIs, listados y reportes son Server State (TanStack Query en dashboard.api.ts): aquí NO se
// copian datos del servidor. Patrón Observer (store) + Singleton (un store por pestaña del navegador).
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";

export const RANGES = ["7d", "30d", "90d", "365d"] as const;
export type Range = (typeof RANGES)[number];

interface AdminDashboardState {
  range: Range;
  realtime: boolean; // Socket "analytics:tick" + KPIs sin caché del backend (apagado por defecto: ahorro)
  tabs: Record<string, string>; // Sección -> pestaña activa (se conserva al navegar entre secciones)
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

// rangeToDates => "30d" -> { from: ISO de hace 30 días } (función pura; "to" = ahora en el backend)
export function rangeToDates(range: Range): { from: string } {
  const days = Number(range.replace("d", ""));
  // Se redondea al inicio del minuto: la clave de caché de TanStack Query es estable entre renders
  const from = new Date(Math.floor(Date.now() / 60_000) * 60_000 - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString() };
}
