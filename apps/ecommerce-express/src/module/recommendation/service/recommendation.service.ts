import {
  recommendationRepository,
  type RecommendationRepository,
  type RecommendationRow,
} from "../repository/recommendation.repository";
import { explainRecommendation, rankCandidates } from "../ml/recommendation.ml";
import { RecommendationNotFoundException } from "../exception/recommendation.exception";
import type { RecommendationDto } from "../dto/recommendation.dto";
import type { SessionContextInput } from "../schema/recommendation.schema";
import { productRepository } from "../../product/repository/product.repository";
import {
  buildPaginationMeta,
  toPageParams,
  type PaginationQuery,
} from "../../../shared/util/pagination.util";
import type { PaginationMeta } from "../../../shared/types/pagination.types";
import type { Locale } from "../../../shared/util/i18n.util";

const POOL = 30;

export class RecommendationService {
  constructor(private readonly repository: RecommendationRepository) {}

  public async createRecommendationSession(
    input: SessionContextInput,
    userId: string,
    locale: Locale
  ): Promise<RecommendationDto> {
    const { limit, ...context } = input;
    const contextSeeds = [...new Set([...context.viewedProductIds, ...context.cartProductIds])];
    const seeds =
      contextSeeds.length > 0 ? contextSeeds : await this.repository.recentPurchases(userId);
    const categoryIds = [
      ...new Set([...context.categoryIds, ...(await this.repository.categoriesOf(seeds))]),
    ];

    const [coPurchase, category, popular] = await Promise.all([
      this.repository.coPurchase(seeds, POOL),
      this.repository.byCategories(categoryIds, POOL),
      this.repository.popular(POOL),
    ]);
    const ranked = rankCandidates(
      { CO_PURCHASE: coPurchase, CATEGORY: category, POPULAR: popular },
      new Set(seeds),
      limit
    );

    const cards = await productRepository.findCardsByIds([
      ...ranked.productIds,
      ...seeds.slice(0, 5),
    ]);
    const names = new Map(cards.map((card) => [card.id, card.name]));
    const reason = await explainRecommendation({
      locale,
      strategies: ranked.strategies,
      seedNames: seeds.slice(0, 5).flatMap((id) => names.get(id) ?? []),
      productNames: ranked.productIds.flatMap((id) => names.get(id) ?? []),
    });

    const row = await this.repository.create({
      userId,
      locale,
      context,
      productIds: ranked.productIds,
      strategies: ranked.strategies,
      reason,
    });
    return (await this.hydrate([row]))[0] as RecommendationDto;
  }

  public async listRecommendations(
    userId: string,
    query: PaginationQuery
  ): Promise<{ items: RecommendationDto[]; meta: PaginationMeta }> {
    const page = toPageParams(query);
    const { items, total } = await this.repository.findMany(userId, page);
    return { items: await this.hydrate(items), meta: buildPaginationMeta(page, total) };
  }

  public async getRecommendationById(id: string, userId: string): Promise<RecommendationDto> {
    const row = await this.repository.findById(id, userId);
    if (!row) throw new RecommendationNotFoundException(id);
    return (await this.hydrate([row]))[0] as RecommendationDto;
  }

  public async deleteAllRecommendations(userId: string): Promise<{ deleted: number }> {
    return { deleted: await this.repository.deleteAll(userId) };
  }

  private async hydrate(rows: RecommendationRow[]): Promise<RecommendationDto[]> {
    const cards = new Map(
      (
        await productRepository.findCardsByIds([...new Set(rows.flatMap((row) => row.productIds))])
      ).map((card) => [card.id, card])
    );
    return rows.map(({ productIds, ...row }) => ({
      ...row,
      products: productIds.flatMap((id) => cards.get(id) ?? []),
    }));
  }
}

export const recommendationService = new RecommendationService(recommendationRepository);
