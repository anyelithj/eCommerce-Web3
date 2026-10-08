import { Schema, model, type InferSchemaType } from "mongoose";
import { STRATEGY_WEIGHTS } from "../ml/recommendation.ml";

const RETENTION_SECONDS = 90 * 24 * 60 * 60;

export const RecommendationStrategies = Object.keys(STRATEGY_WEIGHTS) as Array<
  keyof typeof STRATEGY_WEIGHTS
>;

const recommendationSchema = new Schema(
  {
    userId: { type: String, required: true },
    context: {
      viewedProductIds: { type: [String], default: [] },
      cartProductIds: { type: [String], default: [] },
      categoryIds: { type: [String], default: [] },
    },
    productIds: { type: [String], default: [] },
    strategies: { type: [String], enum: RecommendationStrategies, default: [] },
    reason: { type: String, required: true, maxlength: 300 },
    locale: { type: String, enum: ["es", "en"], default: "es" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

recommendationSchema.index({ userId: 1, createdAt: -1 });
recommendationSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export type RecommendationRecord = InferSchemaType<typeof recommendationSchema>;
export const RecommendationModel = model("Recommendation", recommendationSchema);
