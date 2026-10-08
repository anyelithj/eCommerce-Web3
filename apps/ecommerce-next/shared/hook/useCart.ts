// useCart.ts (Redux Toolkit) => estado de UI del carrito compartido entre widgets (Header) y features (Cart, Product).
// Vive en "shared" porque SOLO guarda si el drawer está abierto: los datos del carrito son Server State y los
// gestiona TanStack Query en features/cart (regla FSD: una capa inferior nunca importa de capas superiores).
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
