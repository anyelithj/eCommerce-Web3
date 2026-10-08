// order.store.ts (Redux Toolkit) => filtro de estado del listado de pedidos, conservado al volver desde un detalle.
// Client State: el filtro forma parte de la queryKey de TanStack Query; los pedidos no se copian aquí.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";
import type { OrderStatus } from "@/entities/order/model/order.types";

interface OrderFilterState {
  status: OrderStatus | undefined;
  page: number;
}

const initialState: OrderFilterState = { status: undefined, page: 1 };

export const orderFilterSlice = createSlice({
  name: "orderFilter",
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<OrderStatus | undefined>) => {
      state.status = action.payload;
      state.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
});

export const useOrderFilter = createSliceHook(orderFilterSlice);
