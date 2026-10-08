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

let nextId = 0;

export const toastSlice = createSlice({
  name: "toast",
  initialState: { items: [] as ToastItem[] },
  reducers: {
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

export function Toaster() {
  const t = useTranslations("common");
  const { items, dismiss } = useToastStore();
  return (
    <ToastPrimitive.Provider duration={4000} swipeDirection="right" label={t("notifications")}>
      {items.map((item) => (
        <ToastPrimitive.Root
          key={item.id}
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
