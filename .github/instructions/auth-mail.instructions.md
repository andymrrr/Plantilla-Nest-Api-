---
applyTo: "src/modules/auth/**/*.ts,src/modules/otp/**/*.ts,src/modules/mail/**/*.ts"
---

# Instrucciones — Auth, OTP y correo

> Espejo de `.cursor/rules/auth-plantilla.mdc` — mantener ambos alineados.

## Modelo (estado actual)

- `Usuario.id`: **UUID (`string`)**.
- `RequestUser`: `{ id, email, empresaId, sucursalId, esPropietario, permisos }` — `src/common/types/request-user.types.ts`.
- JWT payload: `{ sub: string, email }`. Sin rol en el token.

## Registro

- `POST /auth/register` → **no** JWT; `{ verificationRequired, verificationToken, emailMasked }`.
- Verificación: `RegisterEmailVerificationService` + `TransactionalMailService.sendRegisterVerificationEmail`.
- `POST /auth/register/verify-email` → JWT.
- La suscripción se crea en `POST /empresas`, no en el registro.

## Login 2FA

- `dosFactoresActivo` → `{ twoFactorRequired, twoFactorToken, expiresInSeconds }`.
- `POST /auth/login/complete-2fa` → `LoginTwoFactorService`.
- Correo: `TransactionalMailService.sendLoginTwoFactorCode`.

## Decoradores

- `@Public()` — register, login, verify-email, resend.
- `@SkipEmpresaContext()` — controller `auth` completo.
- `@AllowIncompleteSubscription()` — `/auth/me`, `/auth/me/two-factor`, rutas payments checkout.

## Guards globales

`JwtAuthGuard`, `ThrottlerGuard`, `ContextoEmpresaGuard`, `PermisosGuard`, `SubscriptionActiveGuard`.

## Correo

- Shell único: `buildTransactionalEmailShell`; `escapeHtml` en dinámicos.
- Branding: `APP_NAME`. Regla: `email-templates-design-system.mdc`.

## Prohibido

- SQL directo en servicios auth/otp.
- HTML de correo inline en `AuthService`.
- Exponer hash de contraseña en respuestas.
- Autorizar por código de rol o `esPropietario`.
