import { z } from "zod";
import { PaginationQuerySchema } from "../../../shared/util/pagination.util";

const IdList = z.array(z.string().uuid()).max(20).default([]);

export const SessionContextSchema = z.object({
  viewedProductIds: IdList,
  cartProductIds: IdList,
  categoryIds: IdList,
  limit: z.number().int().min(1).max(24).default(8),
});

export const ListRecommendationsQuerySchema = PaginationQuerySchema;

export type SessionContextInput = z.infer<typeof SessionContextSchema>;
