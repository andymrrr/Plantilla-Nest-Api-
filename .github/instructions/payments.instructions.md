---
applyTo: "src/modules/payments/**/*.ts,src/main.ts"
---

# Instrucciones — PayPal y pagos

## PayPal
- Cliente HTTP con `fetch` nativo en `PaypalBillingService` — no SDK externo.
- Credenciales: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL`, `PAYPAL_WEBHOOK_ID`.
- `brand_name` en checkout: `APP_NAME` desde ConfigService.

## Webhook-first
- Activación de suscripción **después** de webhook verificado, no solo por redirect de PayPal.
- `main.ts` debe usar `NestFactory.create(AppModule, { rawBody: true })`.
- Dedupe por `paypal-transmission-id` en `eventos_paypal`.
- La suscripción es de la **empresa** (`Suscripcion.empresaId`), no del usuario.

## Mantenimiento de planes
- CRUD admin en `/planes` (`PlanesController` + `PlanesService`).
- Permisos del módulo `planes` (`lectura`, `escritura`, `modificar`, `eliminar`).
- No eliminar un plan con suscripciones; desactivarlo.
- Distinto del catálogo público `GET /payments/platform-subscription/plans`.

## Features de plan
- JSON `planes.caracteristicas`. Claves en `PLAN_FEATURE_KEYS` (`src/common/types/plan-caracteristicas.types.ts`).
- Guard: `PlanFeatureGuard` + `@RequirePlanFeature`.
- Cupo de sucursales: `PlanFeaturesService.assertCupoSucursales` (`maximoRecursos`).
- En la plantilla el mapa de features está **vacío**; el producto derivado lo rellena.

## Guards
- Endpoints checkout/sync/pause/resume/cancel: `@AllowIncompleteSubscription()` + `@RequirePermission('empresas', ...)`.
- CRUD `/planes`: `@AllowIncompleteSubscription()` + `@RequirePermission('planes', ...)`.
- Catálogo público: `@Public()` en `GET /payments/platform-subscription/plans`.
- Requieren `x-empresa-id` excepto el catálogo público.

## Persistencia
- Solo TypeORM: `Plan`, `Suscripcion`, `EventoPaypal`.
- Emails post-activación: `TransactionalMailService.sendSubscriptionPaymentSuccess` + `sendWelcomeAfterActivation`.
