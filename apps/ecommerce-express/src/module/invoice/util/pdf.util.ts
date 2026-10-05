import PDFDocument from "pdfkit";

type Draw = (doc: PDFKit.PDFDocument) => void;

export function renderPdf(draw: Draw): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    draw(doc);
    doc.end();
  });
}

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency }).format(cents / 100);

export interface ShippingLabelData {
  trackingNumber: string;
  carrier: string;
  service: string;
  orderNumber: string;
  sender: string;
  recipient: { recipientName: string; phone: string; line1: string; line2?: string | null; city: string; state: string; postalCode: string; country: string };
  weightGrams: number;
}

export function renderShippingLabel(data: ShippingLabelData): Promise<Buffer> {
  return renderPdf((doc) => {
    doc.fontSize(20).text(`${data.carrier} · ${data.service}`, { align: "center" });
    doc.moveDown().fontSize(28).text(data.trackingNumber, { align: "center", characterSpacing: 2 });
    doc.moveDown().fontSize(10).text(`Pedido: ${data.orderNumber}`, { align: "center" });
    doc.moveDown(2).fontSize(12).text("REMITENTE", { underline: true }).text(data.sender);
    doc.moveDown().text("DESTINATARIO", { underline: true });
    const r = data.recipient;
    [r.recipientName, r.phone, r.line1, r.line2, `${r.city}, ${r.state} ${r.postalCode}`, r.country].filter(Boolean).forEach((line) => doc.text(String(line)));
    doc.moveDown().text(`Peso: ${(data.weightGrams / 1000).toFixed(2)} kg`);
  });
}

export interface InvoicePdfData {
  number: string;
  cufe: string | null;
  issuedAt: Date;
  seller: { name: string; nit: string };
  buyer: { name: string; documentType: string; documentNumber: string; email: string };
  items: Array<{ description: string; quantity: number; unitPriceCents: number; totalCents: number }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
}

export function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderPdf((doc) => {
    doc.fontSize(18).text("Factura electrónica de venta", { align: "right" });
    doc.fontSize(10).text(`N.º ${data.number}`, { align: "right" }).text(`Fecha: ${data.issuedAt.toISOString().slice(0, 10)}`, { align: "right" });
    doc.moveDown().fontSize(11).text(`${data.seller.name} · NIT ${data.seller.nit}`);
    doc.moveDown().text("Adquiriente:", { underline: true });
    doc.text(`${data.buyer.name} · ${data.buyer.documentType} ${data.buyer.documentNumber}`).text(data.buyer.email);
    doc.moveDown();
    data.items.forEach((item) => {
      const y = doc.y;
      doc.text(item.description, 48, y, { width: 260 });
      doc.text(String(item.quantity), 320, y, { width: 40, align: "right" });
      doc.text(money(item.unitPriceCents, data.currency), 370, y, { width: 90, align: "right" });
      doc.text(money(item.totalCents, data.currency), 470, y, { width: 80, align: "right" });
      doc.moveDown(0.5);
    });
    doc.moveDown().text(`Subtotal: ${money(data.subtotalCents, data.currency)}`, { align: "right" });
    doc.text(`IVA: ${money(data.taxCents, data.currency)}`, { align: "right" });
    doc.fontSize(13).text(`Total: ${money(data.totalCents, data.currency)}`, { align: "right" });
    if (data.cufe) doc.moveDown().fontSize(7).text(`CUFE: ${data.cufe}`, { align: "left" });
  });
}
