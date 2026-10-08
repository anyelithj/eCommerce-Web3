import { Roles } from "../../../shared/constants/roles.constants";
import type { ProductViewer } from "../types/product.types";

export function availableStock(variant: { stock: number; reservedStock: number }): number {
  return Math.max(0, variant.stock - variant.reservedStock);
}

export function computePriceRange(variants: Array<{ priceCents: number; isActive: boolean }>): {
  minPriceCents: number;
  maxPriceCents: number;
} {
  const prices = variants
    .filter((variant) => variant.isActive)
    .map((variant) => variant.priceCents);
  if (prices.length === 0) return { minPriceCents: 0, maxPriceCents: 0 };
  return { minPriceCents: Math.min(...prices), maxPriceCents: Math.max(...prices) };
}

export function canManageProduct(viewer: ProductViewer, vendorId: string | null): boolean {
  if (viewer.roles.includes(Roles.ADMIN)) return true;
  return viewer.roles.includes(Roles.VENDOR) && vendorId === viewer.id;
}

export function isStaffViewer(viewer: ProductViewer | undefined): viewer is ProductViewer {
  return (
    viewer !== undefined &&
    (viewer.roles.includes(Roles.ADMIN) || viewer.roles.includes(Roles.VENDOR))
  );
}
