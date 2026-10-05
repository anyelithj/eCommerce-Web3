import nodemailer from "nodemailer";
import { appConfig } from "../../../config/app.config";
import type { EmailMessage } from "../util/template.util";

const transport = nodemailer.createTransport({
  host: appConfig.SMTP_HOST,
  port: appConfig.SMTP_PORT,
  ...(appConfig.SMTP_USER && appConfig.SMTP_PASS ? { auth: { user: appConfig.SMTP_USER, pass: appConfig.SMTP_PASS } } : {}),
});

export const emailService = {
  async send(to: string, message: EmailMessage): Promise<void> {
    await transport.sendMail({ from: appConfig.SMTP_FROM, to, ...message });
  },
};
