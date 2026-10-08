// recommendation.dto.ts => contratos de salida del módulo Recommendation (página (ai)/recommendations de Next.js).
import type { ProductListItemDto } from "../../product/dto/product.dto";
import type { RecommendationStrategy } from "../ml/recommendation.ml";

// SessionContextDto => contexto que envía el storefront (productos vistos, carrito, categorías de interés)
export interface SessionContextDto {
  viewedProductIds: string[];
  cartProductIds: string[];
  categoryIds: string[];
}

// RecommendationDto => tarjetas de producto (MISMO DTO que el catálogo: el frontend reutiliza su ProductCard)
export interface RecommendationDto {
  id: string;
  products: ProductListItemDto[];
  strategies: RecommendationStrategy[];
  reason: string;
  context: SessionContextDto;
  createdAt: Date;
}
