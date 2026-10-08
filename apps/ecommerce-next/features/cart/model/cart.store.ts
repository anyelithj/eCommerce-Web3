// cart.store.ts (Redux Toolkit + sessionStorage) => cupón aplicado en el carrito que se lleva al iniciar el checkout.
// Client State: el usuario elige el cupón; el carrito (Server State) sigue en TanStack Query.
// sessionStorage (no localStorage): el cupón vive solo mientras dura la pestaña de compra (ver providers.tsx).
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";

interface CartCouponState {
  couponCode: string | null;
  discountCents: number;
}

const initialState: CartCouponState = { couponCode: null, discountCents: 0 };

export const cartCouponSlice = createSlice({
  name: "cartCoupon",
  initialState,
  reducers: {
    setCoupon: {
      reducer: (_state, action: PayloadAction<CartCouponState>) => action.payload,
      prepare: (couponCode: string, discountCents: number) => ({
        payload: { couponCode, discountCents },
      }),
    },
    clearCoupon: () => initialState,
    hydrate: (state, action: PayloadAction<Partial<CartCouponState>>) => ({
      ...state,
      ...action.payload,
    }),
  },
});

export const useCartCoupon = createSliceHook(cartCouponSlice);
