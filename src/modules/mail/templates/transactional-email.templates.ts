import {
  buildHighlightBox,
  buildInfoCard,
  buildTransactionalEmailShell,
  escapeHtml,
} from '../email-template.util';

export interface TransactionalEmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface RegisterVerificationEmailParams {
  brandName: string;
  code: string;
  expiresMinutes: number;
  verificationUrl: string;
}

export interface LoginTwoFactorEmailParams {
  brandName: string;
  code: string;
  expiresMinutes: number;
}

export interface SubscriptionPaymentSuccessEmailParams {
  brandName: string;
  ownerName: string;
  planName: string;
  amountLabel: string;
  nextRenewalLabel: string;
  subscriptionId: string;
}

export interface WelcomeAfterActivationEmailParams {
  brandName: string;
  ownerName: string;
}

export function buildRegisterVerificationEmail(
  params: RegisterVerificationEmailParams,
): TransactionalEmailContent {
  const { brandName, code, expiresMinutes, verificationUrl } = params;
  const subject = `Verifica tu cuenta de ${brandName}`;
  const text =
    `Hola,\n\n` +
    `Tu código de verificación para activar tu cuenta de ${brandName} es: ${code}\n\n` +
    `Este código caduca en ${expiresMinutes} minutos.\n` +
    `También puedes abrir este enlace para completar el proceso: ${verificationUrl}\n\n` +
    `Si no solicitaste este registro, ignora este correo.\n\n` +
    `Equipo ${brandName}`;

  const html = buildTransactionalEmailShell({
    brandName,
    preheader: `Usa este código para activar tu cuenta de ${brandName}.`,
    eyebrow: 'Verificación de cuenta',
    title: 'Activa tu cuenta de forma segura',
    tone: 'warning',
    subtitle: `Gracias por registrarte en ${escapeHtml(brandName)}. Usa este código para confirmar tu correo y activar tu cuenta.`,
    body: `
${buildInfoCard({
  content: `
<div style="text-align:center;">
  <span style="display:inline-block;padding:14px 20px;border-radius:12px;background:#eef2ff;border:1px solid #c7d2fe;font-size:28px;font-weight:800;letter-spacing:0.25em;color:#312e81;">
    ${escapeHtml(code)}
  </span>
</div>
<p style="margin:14px 0 0 0;">
  Este código vence en <strong>${expiresMinutes} minuto${expiresMinutes > 1 ? 's' : ''}</strong>.
</p>`,
  tone: 'warning',
})}
${buildHighlightBox({
  content: `Si no solicitaste este registro, puedes ignorar este correo. Nadie de ${escapeHtml(brandName)} te pedirá este código por chat o llamada.`,
  tone: 'neutral',
})}
<div style="margin-top:20px;text-align:center;">
  <a href="${escapeHtml(verificationUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;">
    Abrir verificación
  </a>
  <p style="margin:10px 0 0 0;font-size:13px;color:#64748b;">
    También puedes pegar este enlace en el navegador:<br />
    <span style="word-break:break-all;">${escapeHtml(verificationUrl)}</span>
  </p>
</div>
`,
  });

  return { subject, text, html };
}

export function buildLoginTwoFactorEmail(
  params: LoginTwoFactorEmailParams,
): TransactionalEmailContent {
  const { brandName, code, expiresMinutes } = params;
  const subject = `Código de verificación ${brandName}`;
  const text =
    `Tu código de verificación es: ${code}\n\n` +
    `Caduca en ${expiresMinutes} minutos. Si no fuiste tú, ignora este mensaje.`;

  const html = buildTransactionalEmailShell({
    brandName,
    preheader: 'Introduce este código para completar tu inicio de sesión.',
    eyebrow: 'Inicio de sesión seguro',
    title: 'Tu código de verificación',
    tone: 'warning',
    subtitle: `Usa este código para confirmar tu acceso a ${escapeHtml(brandName)}.`,
    body: `
${buildInfoCard({
  content: `
<div style="text-align:center;">
  <span style="display:inline-block;padding:14px 20px;border-radius:12px;background:#fffbeb;border:1px solid #fcd34d;font-size:28px;font-weight:800;letter-spacing:0.25em;color:#92400e;">
    ${escapeHtml(code)}
  </span>
</div>
<p style="margin:14px 0 0 0;">
  Este código vence en <strong>${expiresMinutes} minuto${expiresMinutes > 1 ? 's' : ''}</strong>.
</p>`,
  tone: 'warning',
})}
${buildHighlightBox({
  content:
    'Si no intentaste iniciar sesión, ignora este correo y revisa la seguridad de tu cuenta.',
  tone: 'neutral',
})}
`,
  });

  return { subject, text, html };
}

export function buildSubscriptionPaymentSuccessEmail(
  params: SubscriptionPaymentSuccessEmailParams,
): TransactionalEmailContent {
  const {
    brandName,
    ownerName,
    planName,
    amountLabel,
    nextRenewalLabel,
    subscriptionId,
  } = params;

  const safeOwner = escapeHtml(ownerName);
  const safePlan = escapeHtml(planName);
  const safeAmount = escapeHtml(amountLabel);
  const safeRenewal = escapeHtml(nextRenewalLabel);
  const safeSubscriptionId = escapeHtml(subscriptionId);

  const subject = `Pago exitoso de tu suscripción en ${brandName}`;
  const text =
    `Hola ${ownerName},\n\n` +
    `Tu suscripción se activó correctamente.\n` +
    `Plan: ${planName}\n` +
    `Monto mensual: ${amountLabel}\n` +
    `Próxima renovación: ${nextRenewalLabel}\n` +
    `ID de suscripción: ${subscriptionId}\n\n` +
    `Este correo funciona como comprobante de activación.\n\n` +
    `Gracias por usar ${brandName}.`;

  const activationSummary = buildInfoCard({
    title: 'Resumen de la activación',
    content: `
<p style="margin:0 0 8px 0;"><strong>Plan:</strong> ${safePlan}</p>
<p style="margin:0 0 8px 0;"><strong>Monto mensual:</strong> ${safeAmount}</p>
<p style="margin:0 0 8px 0;"><strong>Próxima renovación:</strong> ${safeRenewal}</p>
<p style="margin:0;"><strong>ID suscripción:</strong> ${safeSubscriptionId}</p>`,
    tone: 'neutral',
  });

  const html = buildTransactionalEmailShell({
    brandName,
    preheader:
      'Tu pago de suscripción fue confirmado y tu acceso premium ya está activo.',
    eyebrow: 'Comprobante de pago',
    title: 'Pago exitoso de tu suscripción',
    tone: 'success',
    subtitle: `Hola <strong>${safeOwner}</strong>, confirmamos el pago de tu suscripción en ${escapeHtml(brandName)}. Tu acceso premium está activo.`,
    body: `
${activationSummary}
${buildHighlightBox({
  content:
    'Este correo funciona como comprobante de activación. La factura oficial y el detalle del cobro también están disponibles en tu proveedor de pagos.',
  tone: 'warning',
})}
<p style="margin:0;font-size:13px;line-height:1.65;color:#475569;">
  Gracias por confiar en ${escapeHtml(brandName)}.
</p>
`,
    footerNote:
      'Correo transaccional de suscripción. Si necesitas ayuda, responde a este mensaje.',
  });

  return { subject, text, html };
}

export function buildWelcomeAfterActivationEmail(
  params: WelcomeAfterActivationEmailParams,
): TransactionalEmailContent {
  const { brandName, ownerName } = params;
  const safeOwner = escapeHtml(ownerName);
  const subject = `Bienvenido a ${brandName}: tu cuenta ya está activa`;
  const text =
    `Hola ${ownerName},\n\n` +
    `¡Bienvenido a ${brandName}! Tu cuenta ya está activa y lista para operar.\n` +
    `Ya puedes gestionar tu equipo y configuración desde el panel.\n\n` +
    'Nos alegra tenerte con nosotros.';

  const html = buildTransactionalEmailShell({
    brandName,
    preheader: `Tu cuenta en ${escapeHtml(brandName)} ya está activa y lista para operar.`,
    eyebrow: 'Cuenta activada',
    title: `Bienvenido a ${escapeHtml(brandName)}`,
    tone: 'success',
    subtitle: `Hola <strong>${safeOwner}</strong>, tu cuenta premium ya está habilitada.`,
    body: `
${buildInfoCard({
  title: '¿Qué puedes hacer ahora?',
  content: `
<ul style="margin:0;padding-left:18px;">
  <li>Completar la configuración de tu cuenta.</li>
  <li>Invitar a tu equipo y asignar roles.</li>
  <li>Gestionar operaciones desde el panel de administración.</li>
</ul>`,
  tone: 'neutral',
})}
<p style="margin:0;font-size:13px;line-height:1.65;color:#475569;">
  Nuestro objetivo es que operes con claridad, rapidez y una experiencia profesional desde el primer día.
</p>
`,
    footerNote: `Equipo ${escapeHtml(brandName)} · Estamos listos para acompañarte.`,
  });

  return { subject, text, html };
}
