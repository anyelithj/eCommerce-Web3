// product.model.ts => reglas de dominio del catálogo como funciones PURAS (sin I/O: testeables en aislamiento).
import { Roles } from "../../../shared/constants/roles.constants";
import type { ProductViewer } from "../types/product.types";

// availableStock => unidades vendibles de una variante (el stock reservado por checkouts abiertos no se ofrece)
export function availableStock(variant: { stock: number; reservedStock: number }): number {
  return Math.max(0, variant.stock - variant.reservedStock);
}

// computePriceRange => min/max de las variantes ACTIVAS (se desnormaliza en Product para filtrar/ordenar rápido)
export function computePriceRange(variants: Array<{ priceCents: number; isActive: boolean }>): {
  minPriceCents: number;
  maxPriceCents: number;
} {
  const prices = variants
    .filter((variant) => variant.isActive)
    .map((variant) => variant.priceCents);
  if (prices.length === 0) return { minPriceCents: 0, maxPriceCents: 0 };
  // Spread de arreglo como argumentos (Math.min(...[1,2,3])) => mínimo/máximo en una línea
  return { minPriceCents: Math.min(...prices), maxPriceCents: Math.max(...prices) };
}

// canManageProduct => ADMIN gestiona todo; VENDOR solo lo suyo (regla de ownership del marketplace)
export function canManageProduct(viewer: ProductViewer, vendorId: string | null): boolean {
  if (viewer.roles.includes(Roles.ADMIN)) return true;
  return viewer.roles.includes(Roles.VENDOR) && vendorId === viewer.id;
}

// isStaffViewer => el staff puede ver estados distintos de ACTIVE
export function isStaffViewer(viewer: ProductViewer | undefined): viewer is ProductViewer {
  // "viewer is ProductViewer" => type predicate: tras el true, TS sabe que viewer no es undefined
  return (
    viewer !== undefined &&
    (viewer.roles.includes(Roles.ADMIN) || viewer.roles.includes(Roles.VENDOR))
  );
}
