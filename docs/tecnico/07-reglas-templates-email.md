# Reglas del sistema de templates de email

Documentación del design system de correos transaccionales en la plantilla Nest API.

## Objetivo

- Identidad visual consistente en todos los correos.
- HTML centralizado; sin duplicación por servicio.
- Branding configurable con `APP_NAME`.
- Facilitar mantenimiento y QA.

## Estructura del módulo

```
src/modules/mail/
  mail.module.ts
  mail.service.ts                    # SMTP / nodemailer
  transactional-mail.service.ts      # Envío con plantillas
  email-template.util.ts             # Shell + bloques + escapeHtml
  templates/
    transactional-email.templates.ts   # Plantillas de negocio
  index.ts
```

## Capas

| Capa | Responsabilidad |
|------|-----------------|
| `MailService` | Transporte SMTP, simulación en dev (`MAIL_LOG_ONLY`) |
| `email-template.util.ts` | Shell HTML, tarjetas, escape |
| `transactional-email.templates.ts` | Builders `{ subject, text, html }` |
| `TransactionalMailService` | Resuelve `APP_NAME` y envía |

## Plantillas incluidas (desde Zynkly, genéricas)

### 1. Verificación de registro

- **Builder:** `buildRegisterVerificationEmail`
- **Envío:** `transactionalMail.sendRegisterVerificationEmail(to, { code, expiresMinutes, verificationUrl })`
- **Tono:** `warning`
- **Uso:** activación de cuenta por OTP + enlace

### 2. OTP login (2FA)

- **Builder:** `buildLoginTwoFactorEmail`
- **Envío:** `transactionalMail.sendLoginTwoFactorCode(to, { code, expiresMinutes })`
- **Tono:** `warning`

### 3. Pago de suscripción exitoso

- **Builder:** `buildSubscriptionPaymentSuccessEmail`
- **Envío:** `transactionalMail.sendSubscriptionPaymentSuccess(to, { ownerName, planName, amountLabel, nextRenewalLabel, subscriptionId })`
- **Tono:** `success`

### 4. Bienvenida post-activación

- **Builder:** `buildWelcomeAfterActivationEmail`
- **Envío:** `transactionalMail.sendWelcomeAfterActivation(to, { ownerName })`
- **Tono:** `success`

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `APP_NAME` | Marca en header y textos del correo |
| `APP_PUBLIC_URL` | Base URL para enlaces (registro, etc.) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Servidor SMTP |
| `MAIL_LOG_ONLY=true` | Simula envío (log en consola) |

En desarrollo, si no hay `SMTP_HOST`, el correo se simula automáticamente cuando `NODE_ENV !== production` o `MAIL_LOG_ONLY=true`.

## Reglas obligatorias

1. Shell único: `buildTransactionalEmailShell`.
2. Escapar dinámicos: `escapeHtml`.
3. Tono explícito: `neutral` | `success` | `warning`.
4. Bloques: `buildInfoCard`, `buildHighlightBox`.
5. Siempre `text` + `html` en `sendMessage`.
6. Español profesional; preheader, eyebrow, title, subtitle, body, footerNote.

## Añadir una plantilla nueva

1. Crear builder en `templates/transactional-email.templates.ts` (retorna `{ subject, text, html }`).
2. Añadir método en `TransactionalMailService`.
3. Exportar desde `index.ts` si es API pública.
4. Documentar aquí y en `.cursor/rules/email-templates-design-system.mdc`.

## Ejemplo en un servicio de dominio

```typescript
constructor(private readonly transactionalMail: TransactionalMailService) {}

await this.transactionalMail.sendLoginTwoFactorCode(user.email, {
  code: otpCode,
  expiresMinutes: 10,
});
```

## Checklist antes de merge

- [ ] ¿Usa `buildTransactionalEmailShell`?
- [ ] ¿Escapa valores dinámicos?
- [ ] ¿Tono correcto?
- [ ] ¿Reutiliza bloques existentes?
- [ ] ¿Incluye versión `text`?
- [ ] ¿Probado render en cliente real?
