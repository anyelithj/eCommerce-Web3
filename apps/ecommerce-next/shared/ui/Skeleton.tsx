// Skeleton.tsx (shadcn/ui) => marcador de carga con el tamaño del contenido final: evita saltos de layout (CLS ≈ 0).
import { cn } from "../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  // aria-hidden => decorativo; el estado de carga se anuncia con role="status" en el contenedor que lo usa
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
