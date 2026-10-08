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
