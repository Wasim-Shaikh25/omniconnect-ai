"use server";

import nodemailer from "nodemailer";
import { env } from "@/shared/config";
import { logger } from "@/shared/observability";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    logger.info("email.console", { to: message.to, subject: message.subject, text: message.text });
  }
}

class SmtpEmailSender implements EmailSender {
  private readonly transporter;

  constructor() {
    const host = env.SMTP_HOST;
    const port = env.SMTP_PORT;
    if (!host || !port) {
      throw new Error("SMTP_HOST and SMTP_PORT are required when EMAIL_PROVIDER=smtp");
    }
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: env.SMTP_FROM ?? env.SMTP_USER,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

export function createEmailSender(): EmailSender {
  if (env.EMAIL_PROVIDER === "smtp" && env.SMTP_HOST) {
    return new SmtpEmailSender();
  }
  return new ConsoleEmailSender();
}
