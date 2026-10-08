// ProductCarousel.tsx => carrusel horizontal con CSS scroll-snap (desplazamiento nativo: táctil, teclado y
// lector de pantalla funcionan sin librería) + botones anterior/siguiente. También exporta "Vistos recientemente".
"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { ProductCard as ProductCardData } from "@/entities/product/model/product.types";
import { ProductCard } from "@/features/product/ui/ProductCard";
import { useRecentlyViewed } from "@/features/product/model/product.store";

export function ProductCarousel({
  title,
  products,
}: {
  title: string;
  products: ProductCardData[];
}) {
  const t = useTranslations("product.carousel");
  const trackRef = useRef<HTMLUListElement>(null);
  if (products.length === 0) return null;

  // scroll => desplaza el ancho visible del carrusel (una "página" de tarjetas)
  const scroll = (direction: 1 | -1) =>
    trackRef.current?.scrollBy({
      left: direction * trackRef.current.clientWidth * 0.9,
      behavior: "smooth",
    });

  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={t("previous", { title })}
            className="h-9 w-9 rounded-full border border-slate-300 hover:bg-slate-50"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={t("next", { title })}
            className="h-9 w-9 rounded-full border border-slate-300 hover:bg-slate-50"
          >
            ›
          </button>
        </div>
      </div>
      {/* "snap-x snap-mandatory" + "snap-start" => cada tarjeta se alinea al soltar el desplazamiento */}
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 motion-reduce:scroll-auto"
      >
        {products.map((product) => (
          <li key={product.id} className="w-40 shrink-0 snap-start sm:w-52">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// RecentlyViewed => historial local (Redux Toolkit + localStorage); excluye el producto que se está viendo
export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const t = useTranslations("product.carousel");
  const { items } = useRecentlyViewed();
  return (
    <ProductCarousel
      title={t("recentlyViewed")}
      products={items.filter((item) => item.id !== excludeId)}
    />
  );
}
