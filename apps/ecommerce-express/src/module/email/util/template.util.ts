import type { Locale } from "../../../shared/util/i18n.util";

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

const CTA: Record<Locale, string> = { es: "Ver detalle", en: "View details" };

export const EmailTemplates = {
  notification(locale: Locale, input: { title: string; body: string; url?: string | undefined }): EmailMessage {
    const link = input.url ? `<p><a href="${escapeHtml(input.url)}">${CTA[locale]}</a></p>` : "";
    return {
      subject: input.title,
      html: `<h2>${escapeHtml(input.title)}</h2><p>${escapeHtml(input.body)}</p>${link}`,
      text: [input.title, input.body, input.url].filter(Boolean).join("\n\n"),
    };
  },
};
