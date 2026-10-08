// recommendation.model.ts (Mongoose / MongoDB) => historial de sesiones de recomendación (RecommendationSession) y la
// recomendación generada en cada una (Recommendation), en UN documento por sesión.
// ¿Por qué MongoDB? Historial de alto volumen, sin transacciones de dinero y con contexto flexible (persistencia políglota).
import { Schema, model, type InferSchemaType } from "mongoose";
import { STRATEGY_WEIGHTS } from "../ml/recommendation.ml";

const RETENTION_SECONDS = 90 * 24 * 60 * 60; // 90 días: el historial viejo se borra solo (menos almacenamiento)

// "Object.keys(...) as" => lista de estrategias derivada de los pesos (fuente única, DRY)
export const RecommendationStrategies = Object.keys(STRATEGY_WEIGHTS) as Array<
  keyof typeof STRATEGY_WEIGHTS
>;

const recommendationSchema = new Schema(
  {
    userId: { type: String, required: true }, // UUID del usuario en PostgreSQL (referencia lógica)
    // Contexto de la sesión: lo que el usuario está viendo (semillas del pipeline)
    context: {
      viewedProductIds: { type: [String], default: [] },
      cartProductIds: { type: [String], default: [] },
      categoryIds: { type: [String], default: [] },
    },
    productIds: { type: [String], default: [] }, // Resultado ordenado por relevancia
    strategies: { type: [String], enum: RecommendationStrategies, default: [] },
    reason: { type: String, required: true, maxlength: 300 }, // Explicación (LLM o texto de respaldo)
    locale: { type: String, enum: ["es", "en"], default: "es" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false } // Inmutable: solo fecha de creación
);

recommendationSchema.index({ userId: 1, createdAt: -1 }); // Historial del usuario, más reciente primero
recommendationSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS }); // TTL: limpieza automática

export type RecommendationRecord = InferSchemaType<typeof recommendationSchema>;
export const RecommendationModel = model("Recommendation", recommendationSchema);
