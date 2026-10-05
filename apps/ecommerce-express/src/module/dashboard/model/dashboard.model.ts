import { Schema, model, type InferSchemaType } from "mongoose";

export const WidgetTypes = ["KPI", "SALES_CHART", "TOP_PRODUCTS", "LOW_STOCK", "FUNNEL", "RECENT_ORDERS"] as const;
export type WidgetType = (typeof WidgetTypes)[number];

export const MAX_WIDGETS_PER_USER = 30;

const positionSchema = new Schema({ x: { type: Number, min: 0, max: 11 }, y: { type: Number, min: 0, max: 200 }, w: { type: Number, min: 1, max: 12 }, h: { type: Number, min: 1, max: 12 } }, { _id: false });

const widgetSchema = new Schema(
  {
    userId: { type: String, required: true },
    type: { type: String, enum: WidgetTypes, required: true },
    title: { type: String, required: true, maxlength: 80 },
    position: { type: positionSchema, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false }
);
widgetSchema.index({ userId: 1, "position.y": 1, "position.x": 1 });

export const DEFAULT_LAYOUT: ReadonlyArray<{ type: WidgetType; title: string; position: { x: number; y: number; w: number; h: number }; config: Record<string, unknown> }> = [
  { type: "KPI", title: "Ingresos", position: { x: 0, y: 0, w: 3, h: 1 }, config: { metric: "revenueCents" } },
  { type: "KPI", title: "Pedidos", position: { x: 3, y: 0, w: 3, h: 1 }, config: { metric: "orders" } },
  { type: "KPI", title: "Ticket promedio", position: { x: 6, y: 0, w: 3, h: 1 }, config: { metric: "aovCents" } },
  { type: "KPI", title: "Conversión", position: { x: 9, y: 0, w: 3, h: 1 }, config: { metric: "conversionRate" } },
  { type: "SALES_CHART", title: "Ventas del período", position: { x: 0, y: 1, w: 8, h: 3 }, config: {} },
  { type: "TOP_PRODUCTS", title: "Productos top", position: { x: 8, y: 1, w: 4, h: 3 }, config: { limit: 5 } },
];

export type WidgetRecord = InferSchemaType<typeof widgetSchema>;
export const DashboardWidgetModel = model("DashboardWidget", widgetSchema);
