import { z } from "zod";

export const REFUND_REASONS = [
  "DAMAGED",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "NOT_RECEIVED",
  "CHANGED_MIND",
  "OTHER",
] as const;

export const cancelSchema = z.object({
  reason: z.string().trim().min(3, "validation.cancelReason").max(500),
});

export const refundSchema = z.object({
  reason: z.enum(REFUND_REASONS),
  description: z.string().trim().min(10, "validation.refundDescription").max(2000),
  evidenceUrls: z.array(z.string().url()).max(6).default([]),
});

export type CancelFormValues = z.infer<typeof cancelSchema>;
export type RefundFormValues = z.infer<typeof refundSchema>;
