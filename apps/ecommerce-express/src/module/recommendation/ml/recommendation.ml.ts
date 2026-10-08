import type { Locale } from "../../../shared/util/i18n.util";

export interface Candidate {
  productId: string;
  score: number;
}

export const STRATEGY_WEIGHTS = { CO_PURCHASE: 3, CATEGORY: 2, POPULAR: 1 } as const;
export type RecommendationStrategy = keyof typeof STRATEGY_WEIGHTS;

export function rankCandidates(
  lists: Partial<Record<RecommendationStrategy, Candidate[]>>,
  exclude: ReadonlySet<string>,
  limit: number
): { productIds: string[]; strategies: RecommendationStrategy[] } {
  const totals = new Map<string, number>();
  const used: RecommendationStrategy[] = [];
  for (const [strategy, candidates] of Object.entries(lists) as Array<
    [RecommendationStrategy, Candidate[]]
  >) {
    const max = Math.max(0, ...candidates.map((candidate) => candidate.score));
    if (max === 0) continue;
    used.push(strategy);
    for (const { productId, score } of candidates) {
      if (exclude.has(productId)) continue;
      totals.set(
        productId,
        (totals.get(productId) ?? 0) + (score / max) * STRATEGY_WEIGHTS[strategy]
      );
    }
  }
  const productIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  return { productIds, strategies: used };
}

const FALLBACK_REASON: Record<Locale, Record<RecommendationStrategy, string>> = {
  es: {
    CO_PURCHASE: "Otros clientes compraron estos productos junto con los que estás mirando.",
    CATEGORY: "Productos de las categorías que más te interesan.",
    POPULAR: "Los productos mejor valorados de la tienda.",
  },
  en: {
    CO_PURCHASE: "Other customers bought these together with the products you are viewing.",
    CATEGORY: "Products from the categories you like most.",
    POPULAR: "The store's top-rated products.",
  },
};

export function explainRecommendation(input: {
  locale: Locale;
  strategies: RecommendationStrategy[];
  seedNames: string[];
  productNames: string[];
}): Promise<string> {
  return Promise.resolve(FALLBACK_REASON[input.locale][input.strategies[0] ?? "POPULAR"]);
}
