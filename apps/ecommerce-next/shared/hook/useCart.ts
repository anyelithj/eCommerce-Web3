import { createSlice } from "@reduxjs/toolkit";
import { createSliceHook } from "../lib/store";

const initialState = { isOpen: false };

export const cartUiSlice = createSlice({
  name: "cartUi",
  initialState,
  reducers: {
    open: (state) => {
      state.isOpen = true;
    },
    close: (state) => {
      state.isOpen = false;
    },
    toggle: (state) => {
      state.isOpen = !state.isOpen;
    },
  },
});

export const useCart = createSliceHook(cartUiSlice);
