// Modal.tsx (shadcn/ui Dialog + Sheet sobre Radix Dialog) => diálogo modal accesible.
// Radix aporta WAI-ARIA completo: rol dialog, trampa de foco, cierre con Escape y clic fuera, bloqueo del scroll
// del fondo y devolución del foco al elemento que abrió el modal. La API pública (open/onClose/title/variant) se
// mantuvo igual a la versión anterior: las features no cambiaron (encapsulamiento).
"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { cn } from "../lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // "side" => panel lateral (Sheet: drawer del carrito) o "center" (Dialog: confirmaciones)
  variant?: "center" | "side";
}

const CONTENT: Record<NonNullable<ModalProps["variant"]>, string> = {
  center:
    "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
  side: "inset-y-0 right-0 h-full w-full max-w-md data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
};

export function Modal({ open, onClose, title, children, variant = "center" }: ModalProps) {
  const t = useTranslations("common");
  return (
    // "onOpenChange(false)" llega con Escape, clic fuera o el botón cerrar => una sola vía de cierre
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined} // El contenido es libre; el título ya identifica el diálogo
          className={cn(
            "fixed z-50 flex max-h-full flex-col bg-background shadow-xl duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out",
            CONTENT[variant]
          )}
        >
          <header className="flex items-center justify-between border-b px-5 py-4">
            <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-md p-2 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("close")}
            >
              <span aria-hidden="true">✕</span>
            </DialogPrimitive.Close>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
