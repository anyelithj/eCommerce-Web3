import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";

interface ProductImageProps {
  src: string | null;
  alt: string;
  priority?: boolean;
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
