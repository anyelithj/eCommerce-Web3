// settings.store.ts (Redux Toolkit + localStorage) => preferencias de visualización del usuario (accesibilidad):
// tamaño de texto y reducción de animaciones. Se aplican con atributos en <html> (CSS en globals.css).
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";

export type TextSize = "normal" | "large" | "x-large";

export interface DisplayPreferencesState {
  textSize: TextSize;
  reduceMotion: boolean;
}

const initialState: DisplayPreferencesState = { textSize: "normal", reduceMotion: false };

// applyToDocument => efecto sobre el DOM separado del estado (los reducers de Redux deben ser puros).
// Lo ejecuta providers.tsx cada vez que cambian las preferencias, en cualquier página.
export function applyToDocument(state: DisplayPreferencesState): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["textSize"] = state.textSize;
  document.documentElement.dataset["reduceMotion"] = String(state.reduceMotion);
}

export const displayPreferencesSlice = createSlice({
  name: "displayPreferences",
  initialState,
  reducers: {
    setTextSize: (state, action: PayloadAction<TextSize>) => {
      state.textSize = action.payload;
    },
    setReduceMotion: (state, action: PayloadAction<boolean>) => {
      state.reduceMotion = action.payload;
    },
    hydrate: (state, action: PayloadAction<Partial<DisplayPreferencesState>>) => ({
      ...state,
      ...action.payload,
    }),
  },
});

export const useDisplayPreferences = createSliceHook(displayPreferencesSlice);
