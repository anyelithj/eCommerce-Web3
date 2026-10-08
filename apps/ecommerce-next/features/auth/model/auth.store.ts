// auth.store.ts (Redux Toolkit) => estado EFÍMERO del flujo de login en varios pasos (credenciales -> código 2FA).
// Client State: la sesión autenticada NO se guarda aquí; vive en next-auth (cookie httpOnly) y se lee con useAuth().
// Antes este store persistía el usuario en localStorage, duplicando la sesión y dejando la cookie de next-auth
// vacía (el middleware nunca veía al usuario como autenticado). Ahora solo modela el paso del formulario.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { createSliceHook } from "@/shared/lib/store";

// Pasos del flujo (unión de literales => máquina de estados finitos tipada)
type LoginStep =
  | { name: "credentials" }
  | { name: "two-factor"; challengeId: string; email: string; expiresAt: number };

interface AuthFlowState {
  step: LoginStep;
}

const initialState: AuthFlowState = { step: { name: "credentials" } };

// "createSlice" => estado + reducers + action creators en un solo lugar; Immer permite escribir "state.x = y"
export const authFlowSlice = createSlice({
  name: "authFlow",
  initialState,
  reducers: {
    // Transición credentials -> two-factor (guarda el desafío y cuándo vence el código).
    // "prepare" => Date.now() se calcula al crear la acción, así el reducer queda puro
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
