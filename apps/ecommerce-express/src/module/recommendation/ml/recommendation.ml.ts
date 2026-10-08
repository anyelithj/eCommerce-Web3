// recommendation.ml.ts => pipeline de recomendaciones.
// Patrón Pipeline: 1) candidatos (co-compra, afinidad de categoría, populares) 2) ranking ponderado 3) explicación.
// Paradigma funcional: etapas puras que se componen. La explicación es un texto fijo por idioma y estrategia.
import type { Locale } from "../../../shared/util/i18n.util";

// --- Ranking (funciones puras: testeables sin base de datos) ---

// Candidate => producto sugerido por una estrategia con su puntaje bruto
export interface Candidate {
  productId: string;
  score: number;
}

// Strategy => fuente de candidatos (Strategy declarativa: un nombre y su peso en el ranking final)
export const STRATEGY_WEIGHTS = { CO_PURCHASE: 3, CATEGORY: 2, POPULAR: 1 } as const;
export type RecommendationStrategy = keyof typeof STRATEGY_WEIGHTS;

// rankCandidates => normaliza cada lista a [0,1], pondera por estrategia, suma y descarta los productos semilla.
// "Record<Strategy, Candidate[]>" => una lista por estrategia; devuelve IDs ordenados y las estrategias usadas.
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
    if (max === 0) continue; // Estrategia sin resultados: no aporta ni figura como usada
    used.push(strategy);
    for (const { productId, score } of candidates) {
      if (exclude.has(productId)) continue; // No se recomienda lo que el usuario ya está viendo o tiene en el carrito
      totals.set(
        productId,
        (totals.get(productId) ?? 0) + (score / max) * STRATEGY_WEIGHTS[strategy]
      );
    }
  }
  // "[...entries].sort" => mayor puntaje primero; "slice" => solo los N mejores
  const productIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  return { productIds, strategies: used };
}

// Explicación por idioma y estrategia principal
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

// explainRecommendation => frase corta según la estrategia principal
export function explainRecommendation(input: {
  locale: Locale;
  strategies: RecommendationStrategy[];
  seedNames: string[];
  productNames: string[];
}): Promise<string> {
  return Promise.resolve(FALLBACK_REASON[input.locale][input.strategies[0] ?? "POPULAR"]);
}
