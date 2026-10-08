import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";

type LoginStep =
  | { name: "credentials" }
  | { name: "two-factor"; challengeId: string; email: string; expiresAt: number };

interface AuthFlowState {
  step: LoginStep;
}

const initialState: AuthFlowState = { step: { name: "credentials" } };

export const authFlowSlice = createSlice({
  name: "authFlow",
  initialState,
  reducers: {
    requireTwoFactor: {
      reducer: (
        state,
        action: PayloadAction<{ challengeId: string; email: string; expiresAt: number }>
      ) => {
        state.step = { name: "two-factor", ...action.payload };
      },
      prepare: (challengeId: string, email: string, expiresIn: number) => ({
        payload: { challengeId, email, expiresAt: Date.now() + expiresIn * 1000 },
      }),
    },
    reset: () => initialState,
  },
});

export const useAuthStore = createSliceHook(authFlowSlice);
