import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import { RecommendationModel } from "../model/recommendation.model";
import type { Candidate, RecommendationStrategy } from "../ml/recommendation.ml";
import type { SessionContextDto } from "../dto/recommendation.dto";
import type { PageParams, Paginated } from "../../../shared/types/pagination.types";
import type { Locale } from "../../../shared/util/i18n.util";

export interface RecommendationRow {
  id: string;
  productIds: string[];
  strategies: RecommendationStrategy[];
  reason: string;
  context: SessionContextDto;
  createdAt: Date;
}

const rankScore = (ids: string[]): Candidate[] =>
  ids.map((productId, index) => ({ productId, score: ids.length - index }));

export class RecommendationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async recentPurchases(userId: string, limit = 10): Promise<string[]> {
    const rows = await this.prisma.orderItem.findMany({
      where: { order: { userId, status: { not: "CANCELLED" } }, productId: { not: null } },
      orderBy: { order: { placedAt: "desc" } },
      take: limit,
      select: { productId: true },
    });
    return [...new Set(rows.flatMap((row) => row.productId ?? []))];
  }

  public async coPurchase(seedIds: string[], limit: number): Promise<Candidate[]> {
    if (seedIds.length === 0) return [];
    const rows = await this.prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { notIn: seedIds, not: null },
        order: { status: { not: "CANCELLED" }, items: { some: { productId: { in: seedIds } } } },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: limit,
    });
    return rows.flatMap((row) =>
      row.productId ? [{ productId: row.productId, score: row._count.productId }] : []
    );
  }

  public async categoriesOf(productIds: string[]): Promise<string[]> {
    if (productIds.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { id: { in: productIds }, categoryId: { not: null } },
      select: { categoryId: true },
      distinct: ["categoryId"],
    });
    return rows.flatMap((row) => row.categoryId ?? []);
  }

  public async byCategories(categoryIds: string[], limit: number): Promise<Candidate[]> {
    if (categoryIds.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { categoryId: { in: categoryIds }, status: "ACTIVE" },
      orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
      take: limit,
      select: { id: true },
    });
    return rankScore(rows.map((row) => row.id));
  }

  public async popular(limit: number): Promise<Candidate[]> {
    const rows = await this.prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ ratingCount: "desc" }, { ratingAvg: "desc" }],
      take: limit,
      select: { id: true },
    });
    return rankScore(rows.map((row) => row.id));
  }

  public async create(
    input: Omit<RecommendationRow, "id" | "createdAt"> & { userId: string; locale: Locale }
  ): Promise<RecommendationRow> {
    return toRow(await RecommendationModel.create(input));
  }

  public async findMany(userId: string, page: PageParams): Promise<Paginated<RecommendationRow>> {
    const [docs, total] = await Promise.all([
      RecommendationModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      RecommendationModel.countDocuments({ userId }),
    ]);
    return { items: docs.map(toRow), total };
  }

  public async findById(id: string, userId: string): Promise<RecommendationRow | null> {
    const doc = await RecommendationModel.findOne({ _id: id, userId }).lean();
    return doc ? toRow(doc) : null;
  }

  public async deleteAll(userId: string): Promise<number> {
    return (await RecommendationModel.deleteMany({ userId })).deletedCount;
  }
}

function toRow(doc: {
  _id: unknown;
  productIds?: string[] | null | undefined;
  strategies?: string[] | null | undefined;
  reason: string;
  context?:
    | {
        viewedProductIds?: string[] | null;
        cartProductIds?: string[] | null;
        categoryIds?: string[] | null;
      }
    | null
    | undefined;
  createdAt?: Date | undefined;
}): RecommendationRow {
  return {
    id: String(doc._id),
    productIds: doc.productIds ?? [],
    strategies: (doc.strategies ?? []) as RecommendationStrategy[],
    reason: doc.reason,
    context: {
      viewedProductIds: doc.context?.viewedProductIds ?? [],
      cartProductIds: doc.context?.cartProductIds ?? [],
      categoryIds: doc.context?.categoryIds ?? [],
    },
    createdAt: doc.createdAt ?? new Date(),
  };
}

export const recommendationRepository = new RecommendationRepository(prisma);
