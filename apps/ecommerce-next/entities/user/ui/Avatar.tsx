import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""}`.toUpperCase();
};

export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const t = useTranslations("common");
  const style = { width: size, height: size };
  if (src) {
    return (
      <Image
        src={src}
        alt={t("photoOf", { name })}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={style}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      style={style}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
