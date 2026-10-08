// recommendation.exception.ts => errores de dominio del módulo Recommendation (los traduce error.middleware).
import { NotFoundException } from "../../../shared/filter/http-exception.filter";

export class RecommendationNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Recommendation", id); // 404 RECOMMENDATION_NOT_FOUND (también si pertenece a otro usuario: no se revela)
  }
}
