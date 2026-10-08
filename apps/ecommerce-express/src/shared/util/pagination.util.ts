// pagination.util.ts => funciones PURAS de paginación (Programación Funcional: sin estado ni efectos).
import { z } from "zod";
import type { PageParams, PaginationMeta } from "../types/pagination.types";

// Límite superior del tamaño de página: evita que un cliente pida 1.000.000 de filas (protección DoS)
const MAX_LIMIT = 100;

// PaginationQuerySchema => valida ?page=&limit= (los query params llegan como string: z.coerce los convierte)
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
});

// "z.infer" => tipo derivado del schema (DRY)
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// toPageParams => convierte page/limit en el "skip" que espera Prisma (offset = (page-1) * limit)
export function toPageParams(query: PaginationQuery): PageParams {
  return { page: query.page, limit: query.limit, skip: (query.page - 1) * query.limit };
}

// buildPaginationMeta => metadatos que el frontend usa para dibujar el componente <Pagination />
export function buildPaginationMeta(
  params: Pick<PageParams, "page" | "limit">,
  total: number
): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    // "Math.max(1, ...)" => una lista vacía sigue teniendo 1 página (evita "página 1 de 0" en la UI)
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}
