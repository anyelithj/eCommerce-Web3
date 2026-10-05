import { sha384 } from "../../../shared/util/crypto.util";

export const dianAmount = (cents: number): string => (cents / 100).toFixed(2);

export interface CufeInput {
  number: string;
  issuedAt: Date;
  subtotalCents: number;
  ivaCents: number;
  totalCents: number;
  sellerNit: string;
  buyerDocument: string;
  technicalKey: string;
  environment: "1" | "2";
}

export function computeCufe(input: CufeInput): string {
  const date = input.issuedAt.toISOString().slice(0, 10);
  const time = `${input.issuedAt.toISOString().slice(11, 19)}-05:00`;
  const zero = dianAmount(0);
  return sha384(
    [
      input.number,
      date,
      time,
      dianAmount(input.subtotalCents),
      "01",
      dianAmount(input.ivaCents),
      "04",
      zero,
      "03",
      zero,
      dianAmount(input.totalCents),
      input.sellerNit,
      input.buyerDocument,
      input.technicalKey,
      input.environment,
    ].join("")
  );
}

export const escapeXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export interface UblInvoiceInput {
  number: string;
  cufe: string;
  issuedAt: Date;
  currency: string;
  seller: { nit: string; name: string };
  buyer: { documentType: string; documentNumber: string; name: string; email: string };
  lines: Array<{ description: string; quantity: number; unitPriceCents: number; totalCents: number }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function buildUblInvoice(input: UblInvoiceInput): string {
  const lines = input.lines
    .map(
      (line, index) => `  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="94">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${input.currency}">${dianAmount(line.totalCents)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>${escapeXml(line.description)}</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${input.currency}">${dianAmount(line.unitPriceCents)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:ProfileID>DIAN 2.1: Factura Electrónica de Venta</cbc:ProfileID>
  <cbc:ID>${escapeXml(input.number)}</cbc:ID>
  <cbc:UUID schemeName="CUFE-SHA384">${input.cufe}</cbc:UUID>
  <cbc:IssueDate>${input.issuedAt.toISOString().slice(0, 10)}</cbc:IssueDate>
  <cbc:IssueTime>${input.issuedAt.toISOString().slice(11, 19)}-05:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${input.currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyTaxScheme><cbc:RegistrationName>${escapeXml(input.seller.name)}</cbc:RegistrationName><cbc:CompanyID schemeName="31">${input.seller.nit}</cbc:CompanyID></cac:PartyTaxScheme>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyTaxScheme><cbc:RegistrationName>${escapeXml(input.buyer.name)}</cbc:RegistrationName><cbc:CompanyID schemeName="${escapeXml(input.buyer.documentType)}">${escapeXml(input.buyer.documentNumber)}</cbc:CompanyID></cac:PartyTaxScheme>
    <cac:Contact><cbc:ElectronicMail>${escapeXml(input.buyer.email)}</cbc:ElectronicMail></cac:Contact>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${input.currency}">${dianAmount(input.taxCents)}</cbc:TaxAmount>
    <cac:TaxSubtotal><cbc:TaxAmount currencyID="${input.currency}">${dianAmount(input.taxCents)}</cbc:TaxAmount><cac:TaxCategory><cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${input.currency}">${dianAmount(input.subtotalCents)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${input.currency}">${dianAmount(input.totalCents)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${input.currency}">${dianAmount(input.totalCents)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}

export interface DianGateway {
  submit(document: { number: string; cufe: string; xml: string }): Promise<{ accepted: boolean; response: Record<string, unknown> }>;
}

export class SandboxDianGateway implements DianGateway {
  public async submit(document: { number: string; cufe: string }): Promise<{ accepted: boolean; response: Record<string, unknown> }> {
    return { accepted: true, response: { environment: "habilitacion", number: document.number, cufe: document.cufe, receivedAt: new Date().toISOString() } };
  }
}
