import type { Request, Response } from "express";
import { recommendationService } from "../service/recommendation.service";
import {
  ListRecommendationsQuerySchema,
  SessionContextSchema,
} from "../schema/recommendation.schema";
import { asyncHandler, sendSuccess } from "../../../shared/interceptor/transform.interceptor";
import { parseObjectId } from "../../../shared/pipe/validation.pipe";
import { currentUser } from "../../../shared/decorator/auth.decorator";
import { HttpStatus } from "../../../shared/constants/http.constants";
import { requestLocale } from "../../../shared/util/i18n.util";

export class RecommendationController {
  public readonly createRecommendationSession = asyncHandler(
    async (req: Request, res: Response) => {
      const dto = await recommendationService.createRecommendationSession(
        SessionContextSchema.parse(req.body),
        currentUser(req).id,
        requestLocale(req)
      );
      sendSuccess(res, dto, HttpStatus.CREATED);
    }
  );

  public readonly listRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await recommendationService.listRecommendations(
      currentUser(req).id,
      ListRecommendationsQuerySchema.parse(req.query)
    );
    sendSuccess(res, items, HttpStatus.OK, meta);
  });

  public readonly getRecommendationById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await recommendationService.getRecommendationById(parseObjectId(req), currentUser(req).id)
    );
  });

  public readonly deleteAllRecommendations = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await recommendationService.deleteAllRecommendations(currentUser(req).id));
  });
}

export const recommendationController = new RecommendationController();
