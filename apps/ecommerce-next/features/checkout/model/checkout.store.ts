// checkout.store.ts (Redux Toolkit) => selección en curso del paso de envío (dirección + tarifa) antes de guardarla.
// Client State separado del Server State (la sesión de checkout vive en TanStack Query).
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";

interface CheckoutDraftState {
  addressId: string | null;
  rateCode: string | null;
}

const initialState: CheckoutDraftState = { addressId: null, rateCode: null };

export const checkoutDraftSlice = createSlice({
  name: "checkoutDraft",
  initialState,
  reducers: {
    // Cambiar de dirección invalida la tarifa elegida (las tarifas dependen del destino)
    selectAddress: (state, action: PayloadAction<string>) => {
      state.addressId = action.payload;
      state.rateCode = null;
    },
    selectRate: (state, action: PayloadAction<string>) => {
      state.rateCode = action.payload;
    },
    reset: () => initialState,
  },
});

export const useCheckoutDraft = createSliceHook(checkoutDraftSlice);
