import type { ProductCard as ProductCardData } from "@/entities/product/model/product.types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useTranslations } from "next-intl";

interface ProductGridProps {
  products: ProductCardData[];
  priorityCount?: number;
  emptyMessage?: string;
}

export function ProductGrid({ products, priorityCount = 4, emptyMessage }: ProductGridProps) {
  const t = useTranslations("product.grid");
  if (products.length === 0) {
    return (
      <EmptyState
        icon="🛍️"
        title={t("emptyTitle")}
        description={emptyMessage ?? t("emptyDescription")}
        action={{ label: t("viewAll"), href: "/products" }}
      />
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
