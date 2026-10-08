// Toast.tsx (shadcn/ui Toast sobre Radix Toast + Redux Toolkit) => notificaciones efímeras ("Agregado al carrito").
// Patrón Observer: cualquier componente llama toast.success(...) y el <Toaster/> (montado una vez) las pinta.
// Radix aporta: región aria-live, pausa del temporizador al pasar el mouse o enfocar, cierre con swipe y con F8
// para saltar a las notificaciones desde el teclado.
"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useTranslations } from "next-intl";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "../lib/cn";
import { createSliceHook, getBrowserStore } from "../lib/store";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

let nextId = 0; // Contador de IDs (módulo-privado)

// Client State de UI: la cola de avisos visibles
export const toastSlice = createSlice({
  name: "toast",
  initialState: { items: [] as ToastItem[] },
  reducers: {
    // "prepare" => el ID se genera al crear la acción, así el reducer queda puro
    push: {
      reducer: (state, action: PayloadAction<ToastItem>) => {
        state.items.push(action.payload);
      },
      prepare: (tone: ToastTone, message: string) => ({ payload: { id: ++nextId, tone, message } }),
    },
    dismiss: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
});

const useToastStore = createSliceHook(toastSlice);

// API imperativa (Facade) utilizable desde handlers y mutaciones sin hooks (solo se llama en el navegador)
const push = (tone: ToastTone, message: string) =>
  getBrowserStore()?.dispatch(toastSlice.actions.push(tone, message));
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
};

const TONES: Record<ToastTone, string> = {
  success: "border-l-green-600",
  error: "border-l-destructive",
  info: "border-l-primary",
};

// Toaster => proveedor + viewport de Radix; cada toast se autodescarta a los 4 s
export function Toaster() {
  const t = useTranslations("common");
  const { items, dismiss } = useToastStore();
  return (
    <ToastPrimitive.Provider duration={4000} swipeDirection="right" label={t("notifications")}>
      {items.map((item) => (
        <ToastPrimitive.Root
          key={item.id}
          // "foreground" => los errores se anuncian de inmediato (assertive); el resto, sin interrumpir (polite)
          type={item.tone === "error" ? "foreground" : "background"}
          onOpenChange={(open) => !open && dismiss(item.id)}
          className={cn(
            "flex items-start gap-3 rounded-md border border-l-4 bg-background px-4 py-3 text-sm shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-80",
            "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:animate-out",
            TONES[item.tone]
          )}
        >
          <ToastPrimitive.Description className="flex-1 text-foreground">
            {item.message}
          </ToastPrimitive.Description>
          <ToastPrimitive.Close
            aria-label={t("closeNotification")}
            className="text-muted-foreground hover:text-foreground"
          >
            <span aria-hidden="true">✕</span>
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 outline-none sm:left-auto sm:w-96" />
    </ToastPrimitive.Provider>
  );
}
