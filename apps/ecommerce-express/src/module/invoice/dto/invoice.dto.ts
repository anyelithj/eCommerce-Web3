import type { InvoiceStatus } from "@prisma/client";
import type { BuyerInput } from "../schema/invoice.schema";

export interface InvoiceSummaryDto {
  id: string;
  number: string;
  orderId: string;
  status: InvoiceStatus;
  currency: string;
  totalCents: number;
  issuedAt: Date | null;
}

export interface InvoiceDetailDto extends InvoiceSummaryDto {
  userId: string;
  cufe: string | null;
  buyer: BuyerInput;
  subtotalCents: number;
  taxCents: number;
  xml: string | null;
  pdfUrl: string | null;
  creditNotes: Array<{ id: string; number: string; amountCents: number; reason: string; cude: string | null; issuedAt: Date }>;
}
