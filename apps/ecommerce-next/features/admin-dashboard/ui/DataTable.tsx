// DataTable.tsx (Client Component) => tabla de datos genérica del panel: columnas declarativas, estados de carga y
// vacío, paginación y acciones por fila. Patrones: Composite (columnas como datos) + Template Method (la tabla fija la
// estructura; cada sección aporta columnas). Tipado seguro con genéricos "<T>".
// Accesibilidad: <table> semántica con <caption>, <th scope="col">, aria-busy durante la carga; responsive: scroll
// horizontal propio (la página nunca se desborda en móvil).
"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { PaginationMeta } from "@/shared/types/api.types";
import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";
import { cn } from "@/shared/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode; // Render de la celda (Strategy por columna)
  className?: string;
}

interface DataTableProps<T> {
  caption: string; // Título accesible de la tabla (visible solo para lectores de pantalla)
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  meta?: PaginationMeta | undefined;
  onPage?: (page: number) => void;
  empty?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  loading = false,
  meta,
  onPage,
  empty,
  onRowClick,
}: DataTableProps<T>) {
  const t = useTranslations("admin.table");
  if (loading && !rows) return <Skeleton className="h-48 w-full" />;
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-left text-sm" aria-busy={loading || undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-muted/60 text-xs uppercase text-slate-600">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn("px-3 py-2.5 font-semibold", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows?.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">
                  {empty ?? t("empty")}
                </td>
              </tr>
            )}
            {rows?.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn("hover:bg-muted/40", onRowClick && "cursor-pointer")}
                // El clic en la fila es un atajo; cada fila también ofrece un botón/enlace accesible por teclado
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3 py-2.5 align-middle", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta && onPage && meta.totalPages > 1 && (
        <nav aria-label={t("pagination")} className="flex items-center justify-between text-sm">
          <Button
            size="sm"
            variant="secondary"
            disabled={meta.page <= 1}
            onClick={() => onPage(meta.page - 1)}
          >
            {t("previous")}
          </Button>
          <span className="text-slate-600">
            {t("page", { page: meta.page, total: meta.totalPages, count: meta.total })}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={meta.page >= meta.totalPages}
            onClick={() => onPage(meta.page + 1)}
          >
            {t("next")}
          </Button>
        </nav>
      )}
    </div>
  );
}
