import type { ProductListItemDto } from "../../product/dto/product.dto";
import type { RecommendationStrategy } from "../ml/recommendation.ml";

export interface SessionContextDto {
  viewedProductIds: string[];
  cartProductIds: string[];
  categoryIds: string[];
}

export interface RecommendationDto {
  id: string;
  products: ProductListItemDto[];
  strategies: RecommendationStrategy[];
  reason: string;
  context: SessionContextDto;
  createdAt: Date;
}
