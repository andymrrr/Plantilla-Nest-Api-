# Idempotencia y anti doble submit

El backend es la autoridad. No basta con deshabilitar el botón en el frontend.

## Interceptor global

`IdempotencyInterceptor` en `src/common/interceptors/idempotency.interceptor.ts`, registrado en `app.module.ts`.

Aplica a `POST`, `PATCH`, `PUT`, `DELETE` autenticados. Rutas `@Public()` (login, registro, webhooks) no se interceptan.

## Cómo decide la clave

1. Si llega `x-idempotency-key`: `userId + key`. El éxito se reutiliza 15 minutos.
2. Si no hay header: huella SHA256 de `method + path + userId + empresaId + body`. Solo **single-flight** (dos requests concurrentes de la misma intención comparten la ejecución). El éxito no se cachea.

Un error **no** se guarda. El cliente puede reintentar.

## Cliente

- Bloquear submit en vuelo (`isLoading` / `disabled`).
- En flujos críticos (crear empresa, checkout, asignar rol, crear usuario) enviar `x-idempotency-key` por intención de negocio (un UUID por clic/intento).

## Billing

El interceptor evita doble checkout. El estado final de la suscripción sigue siendo **webhook-first**.

## Regla

`.cursor/rules/idempotencia-antidoble-submit.mdc`
