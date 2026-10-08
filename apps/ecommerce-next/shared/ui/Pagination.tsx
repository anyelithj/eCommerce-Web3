import { useTranslations } from "next-intl";
import { Link } from "../lib/i18n/navigation";
import { cn } from "../lib/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

function visiblePages(page: number, total: number): Array<number | "gap"> {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((n, index) =>
    index > 0 && n - (sorted[index - 1] ?? n) > 1 ? ["gap" as const, n] : [n]
  );
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  const t = useTranslations("common.pagination");
  if (totalPages <= 1) return null;
  const linkClass =
    "flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm focus-visible:ring-2 focus-visible:ring-slate-900";

  return (
    <nav aria-label={t("label")} className="flex flex-wrap items-center justify-center gap-1">
      {page > 1 && (
        <Link href={buildHref(page - 1)} rel="prev" className={cn(linkClass, "hover:bg-slate-100")}>
          {t("previous")}
        </Link>
      )}
      {visiblePages(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-2 text-slate-400" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(linkClass, item === page ? "bg-brand text-white" : "hover:bg-slate-100")}
          >
            {item}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link href={buildHref(page + 1)} rel="next" className={cn(linkClass, "hover:bg-slate-100")}>
          {t("next")}
        </Link>
      )}
    </nav>
  );
}
