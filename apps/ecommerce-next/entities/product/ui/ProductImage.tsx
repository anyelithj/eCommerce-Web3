// ProductImage.tsx (next/image) => imagen de producto optimizada: WebP/AVIF automático, tamaños responsive,
// lazy loading y dimensiones reservadas (sin CLS). "priority" solo para la imagen LCP (primera del detalle).
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";

interface ProductImageProps {
  src: string | null;
  alt: string;
  priority?: boolean;
  // "sizes" => le indica al navegador el ancho que ocupará la imagen en cada breakpoint (descarga la variante justa)
  sizes?: string;
  className?: string;
}

export function ProductImage({
  src,
  alt,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  className,
}: ProductImageProps) {
  const t = useTranslations("product");
  return (
    // "relative aspect-square" => caja cuadrada reservada ANTES de que cargue la imagen (evita saltos de layout)
    <div className={cn("relative aspect-square overflow-hidden bg-slate-100", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div
          className="flex h-full items-center justify-center text-sm text-slate-400"
          role="img"
          aria-label={alt}
        >
          {t("noImage")}
        </div>
      )}
    </div>
  );
}
