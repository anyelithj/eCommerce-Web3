import { z } from "zod";
import { queryBoolean } from "../../../shared/pipe/transform.pipe";
import { WidgetTypes } from "../model/dashboard.model";

const PositionSchema = z
  .object({ x: z.number().int().min(0).max(11), y: z.number().int().min(0).max(200), w: z.number().int().min(1).max(12), h: z.number().int().min(1).max(12) })
  .refine((position) => position.x + position.w <= 12, { message: "El widget excede las 12 columnas" });

export const WidgetSchema = z.object({
  type: z.enum(WidgetTypes),
  title: z.string().trim().min(1).max(80),
  position: PositionSchema,
  config: z.record(z.unknown()).default({}).refine((value) => JSON.stringify(value).length <= 2_000, { message: "config máximo 2 KB" }),
});

export const UpdateWidgetSchema = WidgetSchema.omit({ type: true }).partial();

export const KPIQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  realtime: queryBoolean,
});

export type WidgetInput = z.infer<typeof WidgetSchema>;
export type UpdateWidgetInput = z.infer<typeof UpdateWidgetSchema>;
export type KPIQuery = z.infer<typeof KPIQuerySchema>;
