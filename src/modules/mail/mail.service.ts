import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendMailMessageParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Servicio único de envío SMTP. Sin lógica de dominio ni plantillas HTML.
 * Variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 * Desarrollo sin SMTP: MAIL_LOG_ONLY=true o NODE_ENV≠production.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('SMTP_HOST')?.trim());
  }

  private shouldLogInsteadOfSend(): boolean {
    const flag = this.config.get<string>('MAIL_LOG_ONLY') ?? '';
    return flag.toLowerCase() === 'true';
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS') ?? '';
    if (!host) {
      throw new ServiceUnavailableException(
        'SMTP no configurado. Define SMTP_HOST (y credenciales) para enviar correo.',
      );
    }
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
    return this.transporter;
  }

  async sendMessage(params: SendMailMessageParams): Promise<void> {
    const to = params.to.trim();
    const { subject, text, html } = params;

    if (!this.isConfigured()) {
      if (
        this.shouldLogInsteadOfSend() ||
        process.env.NODE_ENV !== 'production'
      ) {
        this.logger.warn(
          `[mail simulado] Para: ${to}\nAsunto: ${subject}\n\n${text}`,
        );
        return;
      }
      throw new ServiceUnavailableException(
        'No hay servidor de correo configurado.',
      );
    }

    const from =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      'no-reply@localhost';

    await this.getTransporter().sendMail({ from, to, subject, text, html });
  }

  async sendPlainText(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    await this.sendMessage({ to, subject, text });
  }
}
