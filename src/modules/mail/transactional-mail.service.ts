import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import {
  buildLoginTwoFactorEmail,
  buildRegisterVerificationEmail,
  buildSubscriptionPaymentSuccessEmail,
  buildWelcomeAfterActivationEmail,
  type LoginTwoFactorEmailParams,
  type RegisterVerificationEmailParams,
  type SubscriptionPaymentSuccessEmailParams,
  type WelcomeAfterActivationEmailParams,
} from './templates/transactional-email.templates';

/**
 * Capa de envío de correos transaccionales con plantillas del design system.
 * Los servicios de dominio (auth, pagos, etc.) deben usar este servicio.
 */
@Injectable()
export class TransactionalMailService {
  constructor(
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  getBrandName(): string {
    return this.config.get<string>('APP_NAME')?.trim() || 'Mi Aplicación';
  }

  async sendRegisterVerificationEmail(
    to: string,
    params: Omit<RegisterVerificationEmailParams, 'brandName'>,
  ): Promise<void> {
    const content = buildRegisterVerificationEmail({
      brandName: this.getBrandName(),
      ...params,
    });
    await this.mailService.sendMessage({ to, ...content });
  }

  async sendLoginTwoFactorCode(
    to: string,
    params: Omit<LoginTwoFactorEmailParams, 'brandName'>,
  ): Promise<void> {
    const content = buildLoginTwoFactorEmail({
      brandName: this.getBrandName(),
      ...params,
    });
    await this.mailService.sendMessage({ to, ...content });
  }

  async sendSubscriptionPaymentSuccess(
    to: string,
    params: Omit<SubscriptionPaymentSuccessEmailParams, 'brandName'>,
  ): Promise<void> {
    const content = buildSubscriptionPaymentSuccessEmail({
      brandName: this.getBrandName(),
      ...params,
    });
    await this.mailService.sendMessage({ to, ...content });
  }

  async sendWelcomeAfterActivation(
    to: string,
    params: Omit<WelcomeAfterActivationEmailParams, 'brandName'>,
  ): Promise<void> {
    const content = buildWelcomeAfterActivationEmail({
      brandName: this.getBrandName(),
      ...params,
    });
    await this.mailService.sendMessage({ to, ...content });
  }
}
