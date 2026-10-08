// recommendation.schema.ts => validación Zod del módulo Recommendation.
import { z } from "zod";
import { PaginationQuerySchema } from "../../../shared/util/pagination.util";

// Lista acotada de UUIDs: límite de 20 semillas => consultas SQL pequeñas (rendimiento y ahorro de CPU)
const IdList = z.array(z.string().uuid()).max(20).default([]);

// SessionContextSchema => POST /api/v1/recommendation/session ("iniciar sesión de personalización con contexto")
export const SessionContextSchema = z.object({
  viewedProductIds: IdList,
  cartProductIds: IdList,
  categoryIds: IdList,
  limit: z.number().int().min(1).max(24).default(8),
});

export const ListRecommendationsQuerySchema = PaginationQuerySchema;

export type SessionContextInput = z.infer<typeof SessionContextSchema>;
