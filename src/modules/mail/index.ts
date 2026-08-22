export { MailModule } from './mail.module';
export { MailService } from './mail.service';
export type { SendMailMessageParams } from './mail.service';
export { TransactionalMailService } from './transactional-mail.service';
export {
  buildTransactionalEmailShell,
  buildInfoCard,
  buildHighlightBox,
  escapeHtml,
} from './email-template.util';
export type {
  TransactionalEmailShellParams,
  TransactionalEmailTone,
  EmailCardTone,
} from './email-template.util';
export {
  buildRegisterVerificationEmail,
  buildLoginTwoFactorEmail,
  buildSubscriptionPaymentSuccessEmail,
  buildWelcomeAfterActivationEmail,
} from './templates/transactional-email.templates';
export type {
  TransactionalEmailContent,
  RegisterVerificationEmailParams,
  LoginTwoFactorEmailParams,
  SubscriptionPaymentSuccessEmailParams,
  WelcomeAfterActivationEmailParams,
} from './templates/transactional-email.templates';
