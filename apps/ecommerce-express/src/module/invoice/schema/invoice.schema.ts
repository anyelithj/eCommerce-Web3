import { z } from "zod";
import { PaginationQuerySchema } from "../../../shared/util/pagination.util";

export const BuyerSchema = z.object({
  documentType: z.enum(["CC", "NIT", "CE", "PP"]),
  documentNumber: z.string().regex(/^[0-9A-Za-z-]{5,20}$/),
  name: z.string().trim().min(2).max(200),
  email: z.string().email(),
});

export const CreateInvoiceSchema = z.object({ orderId: z.string().uuid(), buyer: BuyerSchema.optional() });

export const ListInvoicesQuerySchema = PaginationQuerySchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const CreateCreditNoteSchema = z.object({
  amountCents: z.number().int().positive(),
  reason: z.string().trim().min(5).max(300),
  refundId: z.string().uuid().optional(),
});

export type BuyerInput = z.infer<typeof BuyerSchema>;
