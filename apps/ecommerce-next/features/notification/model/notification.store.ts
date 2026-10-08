// notification.store.ts (Redux Toolkit) => última notificación recibida por WebSocket mientras se muestra el aviso
// (NotificationToast). Client State efímero: la bandeja y el contador siguen en TanStack Query.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";
import type { AppNotification } from "../api/notification.api";

interface LiveNotificationState {
  latest: AppNotification | null;
}

const initialState: LiveNotificationState = { latest: null };

export const liveNotificationSlice = createSlice({
  name: "liveNotification",
  initialState,
  reducers: {
    receive: (state, action: PayloadAction<AppNotification>) => {
      state.latest = action.payload;
    },
    dismiss: () => initialState,
  },
});

export const useLiveNotification = createSliceHook(liveNotificationSlice);
