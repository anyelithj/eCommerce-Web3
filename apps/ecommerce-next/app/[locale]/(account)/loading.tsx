import { useTranslations } from "next-intl";
import { Skeleton } from "@/shared/ui/Skeleton";

export default function Loading() {
  const t = useTranslations("common");
  return (
    <div
      role="status"
      aria-label={t("loading")}
      className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
      <span className="sr-only">{t("loadingContent")}</span>
    </div>
  );
}
