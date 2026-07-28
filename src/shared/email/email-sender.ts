import type { Transporter, SendMailOptions } from "nodemailer";
import { env } from "@/shared/config";
import { logger } from "@/shared/observability";

export interface EmailSender {
  send(to: string, subject: string, text: string, html?: string): Promise<void>;
}

function redactEmailBody(text: string): string {
  return text
    .replace(/\b\d{6,}\b/g, "***")
    .replace(/https?:\/\/[^\s]+/g, "<link>");
}

class ConsoleEmailSender implements EmailSender {
  async send(to: string, subject: string, text: string): Promise<void> {
    logger.info("email.console", {
      to,
      subject,
      body: redactEmailBody(text),
    });
  }
}

class SmtpEmailSender implements EmailSender {
  private transporter: Transporter | null = null;
  private readonly config: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };

  constructor(config: SmtpEmailSender["config"]) {
    this.config = config;
  }

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    // Nodemailer is Node-only; load it lazily so client bundles never resolve it.
    const nodemailer = await import(
      /* webpackIgnore: true */
      "nodemailer"
    );

    const secure = this.config.port === 465;
    const requireTLS = this.config.port === 587;

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure,
      requireTLS,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      },
    }) as Transporter;

    return this.transporter;
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    const transporter = await this.getTransporter();
    const options: SendMailOptions = {
      from: this.config.from,
      to,
      subject,
      text,
    };
    if (html) options.html = html;
    await transporter.sendMail(options);
  }
}

export function createEmailSender(): EmailSender {
  if (env.EMAIL_PROVIDER === "smtp") {
    if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) {
      throw new Error("SMTP configuration is incomplete");
    }
    return new SmtpEmailSender({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
      from: env.SMTP_FROM,
    });
  }
  return new ConsoleEmailSender();
}
