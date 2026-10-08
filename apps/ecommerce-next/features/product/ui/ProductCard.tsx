// ProductCard.tsx => tarjeta de producto (Server Component compatible: sin hooks => también renderiza en el servidor).
// Semántica: <article> con enlace en el título; la tarjeta completa es clicable con un pseudo-elemento (patrón
// "card link" accesible: un solo destino de foco por tarjeta, no N enlaces redundantes para el lector de pantalla).
import { useTranslations } from "next-intl";
import { Link } from "@/shared/lib/i18n/navigation";
import { useFormat } from "@/shared/hook/useFormat";
import type { ProductCard as ProductCardData } from "@/entities/product/model/product.types";
import { ProductImage } from "@/entities/product/ui/ProductImage";
import { discountPercent } from "@/shared/lib/format";
import { routes } from "@/shared/constants/routes";
import { Badge } from "@/shared/ui/Badge";

// Estrellas de solo lectura: texto accesible "4,5 de 5" + glifos decorativos (aria-hidden)
function RatingStars({ value, count }: { value: number; count: number }) {
  const t = useTranslations("product");
  if (count === 0) return null;
  const rounded = Math.round(value);
  return (
    <p className="flex items-center gap-1 text-xs text-slate-600">
      <span aria-hidden="true" className="text-amber-500">
        {"★".repeat(rounded)}
        <span className="text-slate-300">{"★".repeat(5 - rounded)}</span>
      </span>
      <span className="sr-only">{t("ratingOutOf", { value: value.toFixed(1) })},</span>
      <span>({count})</span>
    </p>
  );
}

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  const t = useTranslations("product");
  const { money } = useFormat();
  const discount = discountPercent(product.minPriceCents, product.compareAtPriceCents);
  const priceLabel =
    product.minPriceCents === product.maxPriceCents
      ? money(product.minPriceCents, product.currency)
      : t("from", { price: money(product.minPriceCents, product.currency) });

  return (
    <article className="group relative flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-lg">
        <ProductImage
          src={product.imageUrl}
          alt={product.imageAlt ?? product.name}
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
        />
        {/* Badges de estado sobre la imagen */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount && <Badge tone="danger">-{discount}%</Badge>}
          {!product.inStock && <Badge tone="neutral">{t("soldOut")}</Badge>}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {product.brand && (
          <p className="text-xs uppercase tracking-wide text-slate-500">{product.brand.name}</p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium text-slate-900">
          {/* "after:absolute after:inset-0" => el enlace cubre toda la tarjeta (área de clic grande: WCAG 2.5.5) */}
          <Link
            href={routes.product(product.slug)}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-slate-900"
          >
            {product.name}
          </Link>
        </h3>
        <RatingStars value={product.ratingAvg} count={product.ratingCount} />
        <p className="flex items-baseline gap-2">
          <span className="font-semibold text-slate-900">{priceLabel}</span>
          {discount && product.compareAtPriceCents && (
            <span className="text-xs text-slate-500 line-through">
              <span className="sr-only">{t("before")} </span>
              {money(product.compareAtPriceCents, product.currency)}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}
