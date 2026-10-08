// cn.ts (utilidad estándar de shadcn/ui) => une clases condicionales y resuelve conflictos de Tailwind.
// clsx: cn("px-2", isActive && "bg-primary") · tailwind-merge: cn("px-2", "px-4") => "px-4" (gana la última),
// así un "className" externo puede sobrescribir los estilos base de un componente sin duplicar clases.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
