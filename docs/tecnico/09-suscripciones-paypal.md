# Suscripciones PayPal (SaaS)

Módulo de billing B2B con PayPal Subscriptions, webhook-first e idempotencia por `transmission_id`.

## Flujo

1. `POST /empresas` → `bootstrapEmpresaSubscription` (estado `INCOMPLETA`).
2. `POST /payments/platform-subscription/checkout-session` → URL de aprobación PayPal. Requiere `x-empresa-id`.
3. Usuario aprueba en PayPal.
4. `POST /integrations/paypal/webhook` → activa suscripción + correos transaccionales.
5. Fallback dev: `POST /payments/platform-subscription/sync-provider` (una consulta por checkout).

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/planes` | Mantenimiento admin (permiso `planes`) |
| GET/PATCH/DELETE | `/planes/:id` | Detalle, editar o borrar (no si tiene suscripciones) |
| GET | `/payments/platform-subscription/plans` | Catálogo (público) |
| GET | `/payments/platform-subscription` | Estado de la empresa |
| POST | `/payments/platform-subscription/checkout-session` | Iniciar PayPal |
| POST | `/payments/platform-subscription/sync-provider` | Sync one-shot |
| POST | `/payments/platform-subscription/pause` | Pausar |
| POST | `/payments/platform-subscription/resume` | Reactivar |
| POST | `/payments/platform-subscription/cancel` | Cancelar |
| GET | `/payments/platform-subscription/invoices` | Transacciones PayPal |
| POST | `/integrations/paypal/webhook` | Webhook verificado |

Rutas de checkout/sync/pausa usan `@AllowIncompleteSubscription()` para permitir acceso antes de activación.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PAYPAL_BASE_URL` | Sandbox o producción |
| `PAYPAL_CLIENT_ID` | OAuth client ID |
| `PAYPAL_CLIENT_SECRET` | OAuth secret |
| `PAYPAL_WEBHOOK_ID` | ID webhook para verificación de firma |
| `APP_PUBLIC_URL` | URLs return/cancel del checkout |

## Entidades

- `planes` — catálogo con `paypal_plan_id`
- `suscripciones` — suscripción canónica por **empresa**
- `eventos_paypal` — auditoría + dedupe webhooks

## Guard de suscripción

`SubscriptionActiveGuard` (global) bloquea rutas con `x-empresa-id` si la suscripción de la empresa no está operativa. Excepciones: `@Public()`, `@AllowIncompleteSubscription()` y rutas sin contexto empresa.

## Seed de planes

Insertar planes en `planes` con `paypal_plan_id` de tu cuenta PayPal Developer antes de probar checkout (`POST /seed/platform-plans`).

## main.ts

Requiere `NestFactory.create(AppModule, { rawBody: true })` para verificación de firma webhook.
