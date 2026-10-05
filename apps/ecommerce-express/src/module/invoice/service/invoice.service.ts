import { invoiceRepository, type InvoiceRepository } from "../repository/invoice.repository";
import { buildUblInvoice, computeCufe, SandboxDianGateway, type DianGateway } from "../model/invoice.model";
import { CreditNoteExceedsInvoiceException, InvoiceNotFoundException, OrderNotInvoiceableException } from "../exception/invoice.exception";
import type { InvoiceDetailDto, InvoiceSummaryDto } from "../dto/invoice.dto";
import type { BuyerInput } from "../schema/invoice.schema";
import { renderInvoicePdf } from "../util/pdf.util";
import { commerceEvents } from "../../order/event/order.event";
import { prisma } from "../../../config/database.config";
import { appConfig } from "../../../config/app.config";
import { sha384 } from "../../../shared/util/crypto.util";
import { buildPaginationMeta, toPageParams, type PaginationQuery } from "../../../shared/util/pagination.util";
import type { PaginationMeta } from "../../../shared/types/pagination.types";
import { isAdmin } from "../../../shared/decorator/auth.decorator";

const SELLER_NAME = "eCommerce Web3 S.A.S.";

interface Viewer {
  id: string;
  roles: string[];
}

export class InvoiceService {
  constructor(
    private readonly repository: InvoiceRepository,
    private readonly dian: DianGateway
  ) {}

  public async createInvoice(orderId: string, buyerOverride?: BuyerInput): Promise<InvoiceDetailDto> {
    const existing = await this.repository.findByOrder(orderId);
    if (existing) return existing;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!order || order.status === "CANCELLED") throw new OrderNotInvoiceableException();

    const buyer: BuyerInput = buyerOverride ?? {
      documentType: "CC",
      documentNumber: "222222222222",
      name: `${order.user.firstName} ${order.user.lastName}`,
      email: order.user.email,
    };
    const number = `${appConfig.DIAN_INVOICE_PREFIX}${await this.repository.nextInvoiceNumber()}`;
    const issuedAt = new Date();
    const subtotalCents = order.totalCents - order.taxCents;
    const cufe = computeCufe({
      number,
      issuedAt,
      subtotalCents,
      ivaCents: order.taxCents,
      totalCents: order.totalCents,
      sellerNit: appConfig.DIAN_SELLER_NIT,
      buyerDocument: buyer.documentNumber,
      technicalKey: appConfig.DIAN_TECHNICAL_KEY,
      environment: appConfig.DIAN_ENVIRONMENT,
    });
    const lines = [
      ...order.items.map((item) => ({ description: `${item.productName} (${item.variantName})`, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents })),
      ...(order.shippingCents > 0 ? [{ description: "Envío", quantity: 1, unitPriceCents: order.shippingCents, totalCents: order.shippingCents }] : []),
      ...(order.discountCents > 0 ? [{ description: "Descuento", quantity: 1, unitPriceCents: -order.discountCents, totalCents: -order.discountCents }] : []),
    ];
    const xml = buildUblInvoice({
      number,
      cufe,
      issuedAt,
      currency: order.currency,
      seller: { nit: appConfig.DIAN_SELLER_NIT, name: SELLER_NAME },
      buyer,
      lines,
      subtotalCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
    });

    const invoice = await this.repository.create({
      number,
      orderId,
      userId: order.userId,
      status: "ISSUED",
      cufe,
      buyer,
      currency: order.currency,
      subtotalCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      xml,
      pdfUrl: null,
      issuedAt,
    });

    const result = await this.dian.submit({ number, cufe, xml });
    const updated = await this.repository.update(invoice.id, {
      status: result.accepted ? "ACCEPTED" : "REJECTED",
      dianResponse: result.response as object,
      pdfUrl: `${appConfig.API_BASE_URL}/api/v1/invoice/${invoice.id}/pdf`,
    });
    commerceEvents.emit("invoice.issued", { userId: order.userId, invoiceId: invoice.id, number, orderId });
    return updated;
  }

  public async listInvoices(query: PaginationQuery & { from?: Date | undefined; to?: Date | undefined }, viewer: Viewer): Promise<{ items: InvoiceSummaryDto[]; meta: PaginationMeta }> {
    const page = toPageParams(query);
    const { items, total } = await this.repository.findMany(isAdmin(viewer) ? undefined : viewer.id, query, page);
    return { items, meta: buildPaginationMeta(page, total) };
  }

  public async getInvoiceById(id: string, viewer: Viewer): Promise<InvoiceDetailDto> {
    const invoice = await this.repository.findById(id);
    if (!invoice || (invoice.userId !== viewer.id && !isAdmin(viewer))) throw new InvoiceNotFoundException(id);
    return invoice;
  }

  public async renderPdf(id: string, viewer: Viewer): Promise<{ number: string; pdf: Buffer }> {
    const invoice = await this.getInvoiceById(id, viewer);
    const items = await prisma.orderItem.findMany({ where: { orderId: invoice.orderId } });
    const pdf = await renderInvoicePdf({
      number: invoice.number,
      cufe: invoice.cufe,
      issuedAt: invoice.issuedAt ?? new Date(),
      seller: { name: SELLER_NAME, nit: appConfig.DIAN_SELLER_NIT },
      buyer: invoice.buyer,
      items: items.map((item) => ({ description: `${item.productName} (${item.variantName})`, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents })),
      subtotalCents: invoice.subtotalCents,
      taxCents: invoice.taxCents,
      totalCents: invoice.totalCents,
      currency: invoice.currency,
    });
    return { number: invoice.number, pdf };
  }

  public async createCreditNote(invoiceId: string, input: { amountCents: number; reason: string; refundId?: string | undefined }): Promise<InvoiceDetailDto> {
    const invoice = await this.repository.findById(invoiceId);
    if (!invoice) throw new InvoiceNotFoundException(invoiceId);
    const credited = invoice.creditNotes.reduce((sum, note) => sum + note.amountCents, 0);
    if (input.amountCents > invoice.totalCents - credited) throw new CreditNoteExceedsInvoiceException(invoice.totalCents - credited);

    const number = `NC${await this.repository.nextCreditNoteNumber()}`;
    const cude = sha384(`${number}${new Date().toISOString()}${input.amountCents}${invoice.cufe ?? ""}${appConfig.DIAN_SELLER_NIT}`);
    await this.repository.createCreditNote({
      number,
      invoiceId,
      refundId: input.refundId ?? null,
      reason: input.reason,
      amountCents: input.amountCents,
      cude,
    });
    return (await this.repository.findById(invoiceId)) as InvoiceDetailDto;
  }

  public registerSubscribers(): void {
    commerceEvents.on("order.placed", async (event) => {
      await this.createInvoice(event.orderId);
    });
    commerceEvents.on("refund.updated", async (event) => {
      if (event.status !== "PROCESSED") return;
      const invoice = await this.repository.findByOrder(event.orderId);
      if (!invoice) return;
      await this.createCreditNote(invoice.id, { amountCents: event.amountCents, reason: "Devolución procesada", refundId: event.refundId });
    });
  }
}

export const invoiceService = new InvoiceService(invoiceRepository, new SandboxDianGateway());
