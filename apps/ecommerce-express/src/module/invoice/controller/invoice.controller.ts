import type { Request, Response } from "express";
import { invoiceService } from "../service/invoice.service";
import { CreateCreditNoteSchema, CreateInvoiceSchema, ListInvoicesQuerySchema } from "../schema/invoice.schema";
import { asyncHandler, sendSuccess } from "../../../shared/interceptor/transform.interceptor";
import { parseId } from "../../../shared/pipe/validation.pipe";
import { currentUser } from "../../../shared/decorator/auth.decorator";
import { HttpStatus } from "../../../shared/constants/http.constants";

export class InvoiceController {
  public readonly createInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { orderId, buyer } = CreateInvoiceSchema.parse(req.body);
    sendSuccess(res, await invoiceService.createInvoice(orderId, buyer), HttpStatus.CREATED);
  });

  public readonly listInvoices = asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await invoiceService.listInvoices(ListInvoicesQuerySchema.parse(req.query), currentUser(req));
    sendSuccess(res, items, HttpStatus.OK, meta);
  });

  public readonly getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await invoiceService.getInvoiceById(parseId(req), currentUser(req)));
  });

  public readonly downloadPdf = asyncHandler(async (req: Request, res: Response) => {
    const { number, pdf } = await invoiceService.renderPdf(parseId(req), currentUser(req));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="factura-${number}.pdf"`);
    res.send(pdf);
  });

  public readonly createCreditNote = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await invoiceService.createCreditNote(parseId(req), CreateCreditNoteSchema.parse(req.body)), HttpStatus.CREATED);
  });
}

export const invoiceController = new InvoiceController();
