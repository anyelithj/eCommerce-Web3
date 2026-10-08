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
