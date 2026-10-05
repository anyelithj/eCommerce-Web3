import { Router } from "express";
import { invoiceController } from "../controller/invoice.controller";
import { jwtAuthGuard } from "../../auth/guard/auth.guard";
import { requirePermission } from "../../../shared/middleware/rbac.middleware";

export const invoiceRouter = Router();
invoiceRouter.use(jwtAuthGuard);

invoiceRouter.post("/", requirePermission("CREATE", "invoice"), invoiceController.createInvoice);
invoiceRouter.get("/", invoiceController.listInvoices);
invoiceRouter.get("/:id", invoiceController.getInvoiceById);
invoiceRouter.get("/:id/pdf", invoiceController.downloadPdf);
invoiceRouter.post("/:id/credit-note", requirePermission("CREATE", "invoice"), invoiceController.createCreditNote);
