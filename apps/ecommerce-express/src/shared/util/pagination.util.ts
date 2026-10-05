import { z } from "zod";
import type { PageParams, PaginationMeta } from "../types/pagination.types";

const MAX_LIMIT = 100;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export function toPageParams(query: PaginationQuery): PageParams {
  return { page: query.page, limit: query.limit, skip: (query.page - 1) * query.limit };
}

export function buildPaginationMeta(params: Pick<PageParams, "page" | "limit">, total: number): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}
