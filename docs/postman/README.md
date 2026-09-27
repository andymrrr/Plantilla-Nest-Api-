# Postman — Plantilla Nest API

Colecciones para probar el núcleo: autenticación OTP/2FA, empresas, sucursales, usuarios, roles y billing.

## ¿Qué estás probando?

La **plantilla** no es un ERP. Cubre:

- Contexto `empresa` → `sucursal` (opcional) vía `x-empresa-id` / `x-sucursal-id`
- Autorización por **módulo + flag** (`lectura`, `escritura`, `modificar`, `eliminar`, `especial`, `reporte`)
- Catálogo mínimo: `empresas`, `sucursales`, `usuarios`, `roles`, `planes`, `suscripciones`
- Seed de fundación RBAC + planes SaaS (no hay seed de 10 usuarios demo; eso lo añade el producto derivado)

---

## Archivos

| Archivo | Para qué sirve |
|---------|----------------|
| [`Plantilla-API-Complete.postman_collection.json`](./Plantilla-API-Complete.postman_collection.json) | **Todos los endpoints** con bodies de ejemplo |
| [`Plantilla-API-Ready.postman_collection.json`](./Plantilla-API-Ready.postman_collection.json) | Igual + carpeta **00 Setup** que captura IDs |
| [`Plantilla-Auth-Seed.postman_collection.json`](./Plantilla-Auth-Seed.postman_collection.json) | Seed + registro + login + onboarding empresa |
| [`Plantilla-Demo.postman_environment.json`](./Plantilla-Demo.postman_environment.json) | `baseUrl`, `accessToken`, IDs |
| [`generate-full-collection.mjs`](./generate-full-collection.mjs) | Regenera Complete / Ready / Auth-Seed |
| [`example-bodies.mjs`](./example-bodies.mjs) | Bodies DEMO por `METHOD /ruta` |

---

## Arranque rápido

1. Importa el environment **Plantilla Demo** y actívalo.
2. Importa **Auth y seed** + **Complete** (o **Ready**).
3. Backend con `SEED_ENDPOINT_ENABLED=true` y `NODE_ENV` ≠ `production`.
4. **Seed → fundación** y **platform-plans**.
5. **Register** (`{{demoEmail}}` / `{{demoPassword}}`) → verifica OTP → **login** (el script guarda `accessToken`).
6. `POST /empresas` (onboarding; el creador recibe rol `PROPIETARIO`).
7. En **Ready**, ejecuta `00 — Setup` para `empresaId`, sucursal, roles, usuarios, planes.
8. Llama endpoints con `Bearer {{accessToken}}` y `x-empresa-id: {{empresaId}}`.

`baseUrl` por defecto: `http://localhost:3000`

### Body de login

```json
{
  "email": "{{demoEmail}}",
  "password": "{{demoPassword}}"
}
```

Valores por defecto del environment: `propietario@plantilla.local` / `Demo1234!`.

---

## Orden recomendado

1. Seed fundación + planes
2. Register → verify-email → login
3. `POST /empresas`
4. `GET /auth/me` con `x-empresa-id`
5. Sucursales / usuarios / roles
6. Checkout PayPal (`/payments/platform-subscription/*`) — el estado final lo confirma el webhook

Para probar 403 de permisos: crea un usuario con rol `SOLO_LECTURA` y llama un `POST`.

---

## Cómo está organizada Complete

1. **`00 — Auth helpers`** — seed + register + login (guarda token)
2. Carpetas por **módulo Nest** (`auth`, `empresas`, `users`, `roles`, `payments`, …)
3. Cada request trae body de ejemplo cuando aplica
4. Mutaciones envían `x-idempotency-key`
5. Rutas de negocio envían `x-empresa-id` salvo `@SkipEmpresaContext`

Variables del environment:

- `accessToken`, `verificationToken`, `twoFactorToken`
- `empresaId`, `sucursalId`, `rolId`, `usuarioId`, `moduloId`, `planId`

---

## Regenerar colecciones

Desde la raíz del backend:

```bash
node docs/postman/generate-full-collection.mjs
```

Tras añadir un controlador o un body en `example-bodies.mjs`, regenera e importa de nuevo (Replace).

Un producto derivado **añade bodies** y vuelve a generar: el script recorre todos los `*.controller.ts`.

---

## Errores frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| 401 | Sin token o vencido → re-login |
| 403 `x-empresa-id` | Falta el header o no hay membresía → Setup / `POST /empresas` |
| 403 permiso | Rol sin el flag → cambia de usuario o asigna rol |
| Seed 403 | `SEED_ENDPOINT_ENABLED` no es `true` o estás en `production` |
| IDs vacíos | Ejecutar Setup Ready o GETs tras crear empresa |
| Login 2FA | Si activas 2FA, usa `POST /auth/login/complete-2fa` |

---

## Documentación relacionada

- RBAC: [`../tecnico/11-rbac-usuarios-y-suscripcion.md`](../tecnico/11-rbac-usuarios-y-suscripcion.md)
- OTP y autenticación: [`../tecnico/08-otp-y-autenticacion.md`](../tecnico/08-otp-y-autenticacion.md)
- Suscripciones PayPal: [`../tecnico/09-suscripciones-paypal.md`](../tecnico/09-suscripciones-paypal.md)
- Idempotencia: [`../tecnico/12-idempotencia.md`](../tecnico/12-idempotencia.md)
- README docs: [`../README.md`](../README.md)
