// Spinner.tsx (shadcn/ui) => indicador de carga giratorio (SVG + animate-spin, sin dependencias).
// LinkPending => spinner que aparece DENTRO de un <Link> mientras Next navega a esa ruta ("useLinkStatus", Next 15.3+):
// el usuario ve al instante que su clic se registró aunque la página tarde en compilar o en traer datos.
"use client";

import { useLinkStatus } from "next/link";
import { cn } from "../lib/cn";

export function Spinner({ className }: { className?: string }) {
  // aria-hidden => decorativo; el estado de carga lo anuncia el contenedor (role="status" / aria-busy)
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4 shrink-0 animate-spin", className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus(); // Solo funciona como descendiente de un <Link> de Next
  return pending ? <Spinner className={cn("ml-auto", className)} /> : null;
}
