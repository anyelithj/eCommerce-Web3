import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import type { InvoiceDetailDto, InvoiceSummaryDto } from "../dto/invoice.dto";
import { BuyerSchema } from "../schema/invoice.schema";
import type { PageParams, Paginated } from "../../../shared/types/pagination.types";

const DETAIL_INCLUDE = {
  creditNotes: { orderBy: { issuedAt: "asc" }, select: { id: true, number: true, amountCents: true, reason: true, cude: true, issuedAt: true } },
} satisfies Prisma.InvoiceInclude;

type DetailRow = Prisma.InvoiceGetPayload<{ include: typeof DETAIL_INCLUDE }>;

export class InvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async nextInvoiceNumber(): Promise<bigint> {
    const [row] = await this.prisma.$queryRaw<Array<{ value: bigint }>>`SELECT nextval('invoice_number_seq') AS value`;
    return row?.value ?? 0n;
  }

  public async nextCreditNoteNumber(): Promise<bigint> {
    const [row] = await this.prisma.$queryRaw<Array<{ value: bigint }>>`SELECT nextval('credit_note_number_seq') AS value`;
    return row?.value ?? 0n;
  }

  public async findMany(userId: string | undefined, range: { from?: Date | undefined; to?: Date | undefined }, page: PageParams): Promise<Paginated<InvoiceSummaryDto>> {
    const where: Prisma.InvoiceWhereInput = {
      ...(userId ? { userId } : {}),
      ...(range.from || range.to ? { issuedAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.limit,
        select: { id: true, number: true, orderId: true, status: true, currency: true, totalCents: true, issuedAt: true },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items: rows, total };
  }

  public async findById(id: string): Promise<InvoiceDetailDto | null> {
    const row = await this.prisma.invoice.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    return row ? toDetail(row) : null;
  }

  public async findByOrder(orderId: string): Promise<InvoiceDetailDto | null> {
    const row = await this.prisma.invoice.findUnique({ where: { orderId }, include: DETAIL_INCLUDE });
    return row ? toDetail(row) : null;
  }

  public async create(data: Prisma.InvoiceUncheckedCreateInput): Promise<InvoiceDetailDto> {
    return toDetail(await this.prisma.invoice.create({ data, include: DETAIL_INCLUDE }));
  }

  public async update(id: string, data: Prisma.InvoiceUncheckedUpdateInput): Promise<InvoiceDetailDto> {
    return toDetail(await this.prisma.invoice.update({ where: { id }, data, include: DETAIL_INCLUDE }));
  }

  public async createCreditNote(data: Prisma.CreditNoteUncheckedCreateInput): Promise<void> {
    await this.prisma.creditNote.create({ data });
  }
}

function toDetail(row: DetailRow): InvoiceDetailDto {
  return {
    id: row.id,
    number: row.number,
    orderId: row.orderId,
    status: row.status,
    currency: row.currency,
    totalCents: row.totalCents,
    issuedAt: row.issuedAt,
    userId: row.userId,
    cufe: row.cufe,
    buyer: BuyerSchema.parse(row.buyer),
    subtotalCents: row.subtotalCents,
    taxCents: row.taxCents,
    xml: row.xml,
    pdfUrl: row.pdfUrl,
    creditNotes: row.creditNotes,
  };
}

export const invoiceRepository = new InvoiceRepository(prisma);
