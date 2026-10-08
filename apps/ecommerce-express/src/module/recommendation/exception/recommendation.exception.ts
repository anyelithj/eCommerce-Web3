import { NotFoundException } from "../../../shared/filter/http-exception.filter";

export class RecommendationNotFoundException extends NotFoundException {
  constructor(id: string) {
    super("Recommendation", id);
  }
}
