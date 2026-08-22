# OTP y autenticación

Sistema de verificación por correo y segundo factor (2FA) migrado desde ZynklyBackend, adaptado a la plantilla genérica.

## Flujos

### Registro con verificación email

1. `POST /auth/register` — crea usuario (`correoVerificado: false`), guarda `planCodigoElegido` opcional, envía OTP. No crea empresa ni suscripción.
2. `POST /auth/register/verify-email` — valida OTP → JWT + cuenta activa.
3. `POST /auth/register/resend-email-code` — reenvío con cooldown.

### Login con 2FA opcional

1. `POST /auth/login` — si `dosFactoresActivo`: devuelve `{ twoFactorRequired, twoFactorToken }`.
2. `POST /auth/login/complete-2fa` — valida OTP → JWT.
3. `PATCH /auth/me/two-factor` — activar/desactivar (requiere contraseña actual).

Si el email no está verificado al hacer login, se re-emite el flujo de verificación de registro.

## JWT y usuario en request

- `Usuario.id`: **UUID (`string`)**.
- Payload JWT: `{ sub: string, email }`.
- Tipo `RequestUser`: `src/common/types/request-user.types.ts` (`id: string`, permisos y contexto empresa).
- Reglas: `.cursor/rules/auth-plantilla.mdc` (espejo: `.github/instructions/auth-mail.instructions.md`).
- RBAC: `docs/tecnico/11-rbac-usuarios-y-suscripcion.md`.

## Módulos

```
src/modules/otp/           # LoginTwoFactorService, EmailOtpDeliveryService
src/modules/auth/          # RegisterEmailVerificationService, AuthService
src/modules/mail/          # TransactionalMailService (plantillas HTML)
```

## Variables de entorno

| Variable | Default | Uso |
|----------|---------|-----|
| `AUTH_REGISTER_EMAIL_OTP_TTL_SECONDS` | 600 | TTL desafío registro |
| `AUTH_REGISTER_EMAIL_OTP_RESEND_SECONDS` | 60 | Cooldown reenvío |
| `AUTH_REGISTER_EMAIL_OTP_MAX_ATTEMPTS` | 5 | Intentos máximos |
| `AUTH_REGISTER_EMAIL_OTP_PEPPER` | — | Hash OTP registro |
| `AUTH_LOGIN_2FA_OTP_TTL_SECONDS` | 600 | TTL 2FA login |
| `AUTH_LOGIN_2FA_MAX_ATTEMPTS` | 5 | Intentos 2FA |
| `AUTH_LOGIN_2FA_OTP_PEPPER` | — | Hash OTP 2FA |

## Entidades

- `desafios_verificacion_registro`
- `desafios_login_dos_factores`
- Campos en `usuarios`: `correo_verificado`, `dos_factores_activo`

## Seguridad

- OTP hasheado SHA256 con pepper (nunca en claro en BD).
- Throttling en login, 2FA y reenvío (`@nestjs/throttler`).
- Cron cada 5 min limpia desafíos expirados de registro.
