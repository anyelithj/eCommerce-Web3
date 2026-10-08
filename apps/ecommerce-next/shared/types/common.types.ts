// common.types.ts => tipos utilitarios transversales del frontend.

// Montos SIEMPRE en unidad mínima (centavos), igual que el backend y Stripe
export type Cents = number;

// Referencia mínima a una entidad del catálogo (enlaces y breadcrumbs)
export interface Ref {
  id: string;
  name: string;
  slug: string;
}

// Estado genérico de carga para componentes que no usan TanStack Query
export type LoadState = "idle" | "loading" | "success" | "error";
