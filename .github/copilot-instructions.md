# Plantilla Nest API — Instrucciones para GitHub Copilot / VS Code

> Fuente de verdad extendida: `.cursor/rules/*.mdc` y `docs/tecnico/`.
> Este archivo resume lo **obligatorio** y el **estado real del repo** para que Copilot genere código alineado.

---

## 1. Prioridades (leer primero)

1. **Respuestas API**: siempre `ResponseHelper.ok(data, mensaje)` o `ResponseHelper.fail(mensaje)` → `{ exito, mensaje, data?, error? }`.
2. **TypeORM estricto**: cero SQL directo en runtime. Solo `@InjectRepository` + `find`, `findOne`, `save`, `update`, `delete`, `upsert`, `findAndCount`. SQL crudo **solo** en `src/migrations/**`.
3. **Tipado estricto**: prohibido `any`. Tipos explícitos en parámetros y retornos.
4. **Idioma**: mensajes al cliente y validaciones en **español**.
5. **Listados**: siempre paginados (`PageQueryDto` → `PaginationResult<T>`). Prohibido `findAll()` en endpoints.
6. **Mutaciones**: bloquear doble submit en UI; en backend el `IdempotencyInterceptor` es autoridad (`idempotencia-antidoble-submit.mdc`). Enviar `x-idempotency-key` en flujos críticos.

---

## 2. Mapa del repositorio

```
src/
  app.module.ts          # Guards: Jwt, Throttler, ContextoEmpresa, Permisos, SubscriptionActive, PlanFeature
  main.ts                # rawBody: true (webhooks PayPal), ValidationPipe global
  common/                # decorators, dto, filters, helpers, types, utils
  modules/
    auth/                # JWT UUID, registro OTP, login 2FA, PermisosService
    otp/                 # LoginTwoFactorService, EmailOtpDeliveryService
    users/               # UsersService scoped a empresa
    empresas/            # Onboarding tenant + sucursales
    roles/               # Aplicaciones, módulos, roles, asignaciones
    mail/                # MailService, TransactionalMailService, plantillas HTML
    payments/            # PayPal por empresa, webhooks, checkout
    seed/                # RBAC + planes SaaS (TypeORM, sin SQL)
    database/            # DatabaseModule + entities/
  migrations/            # Único lugar permitido para queryRunner.query
```

**Módulos registrados en `AppModule`:** `DatabaseModule`, `MailModule`, `PaymentsModule`, `SeedModule`, `AuthModule`, `UsersModule`, `EmpresasModule`, `RolesModule`.

---

## 3. Identidad y entidades

| Tema | Estado actual |
|------|----------------|
| Ubicación entidades | `src/modules/database/entities/` + barrel `index.ts` |
| PK `Usuario.id` | UUID (`string`); JWT `sub` UUID |
| Autorización | RBAC módulo + flag (`@RequirePermission`). El rol no autoriza. |
| Tenancy | Multiempresa (`x-empresa-id`); suscripción por empresa |

**Al crear módulos nuevos:** seguir `.cursor/rules/rbac-modulos.mdc` y `typeorm-entities.mdc`.

---

## 4. Capas Nest (controller → service → repository)

### Paginación (listados)

- No usar `findAll()` ni equivalentes sin paginación.
- Query: `PageQueryDto` desde `common/dto/page-query.dto.ts` o DTO que lo extienda (`page`, `limit`, `orderBy`, `order`, `search`).
- Respuesta: `PaginationResult<T>` con `{ items, page, limit, total, pages }`. Usar `createPaginationResult(...)` desde `common/types/pagination.types.ts`.
- Servicio: `buildTypeOrmPaginationArgs<Entidad>(query, { searchableFields, defaultOrderBy })` + `repository.findAndCount(...)`.
- Filtros de negocio: combinar en el servicio desde el DTO tipado (no en el helper de paginación).
- DTO listado: extender `PageQueryDto`, `declare orderBy` con `@IsIn([...])`.
- Regla completa: `.cursor/rules/paginacion.mdc`.

### Controller
- Solo orquesta: recibe DTO, llama servicio, devuelve `ResponseHelper`.
- Rutas públicas: `@Public()`.
- Sin contexto empresa: `@SkipEmpresaContext()`.
- Rutas que permiten suscripción incompleta (checkout, sync): `@AllowIncompleteSubscription()`.
- Permiso: `@RequirePermission('usuarios', 'escritura')`.
- Feature de plan: `@RequirePlanFeature('…')` (claves en `PLAN_FEATURE_KEYS`; vacío en la plantilla).
- Usuario autenticado: `@CurrentUser() user: RequestUser` (`src/common/types/request-user.types.ts`).

### Service
- Lógica de negocio + `@InjectRepository(Entidad)`.
- Excepciones Nest con mensaje en español: `NotFoundException`, `BadRequestException`, `ConflictException`, etc.
- Listados: `paginate(query)` con `buildTypeOrmPaginationArgs` + `createPaginationResult`.

### DTO
- `class-validator` + `class-transformer`.
- Listados: extender `PageQueryDto`; restringir `orderBy` con `@IsIn([...])`.

---

## 5. Autenticación y OTP

> Detalle completo: `.cursor/rules/auth-plantilla.mdc` (espejo de esta sección).

**Archivos clave:** `src/modules/auth/`, `src/modules/otp/`, `RegisterEmailVerificationService`.

### Modelo (obligatorio en este repo)

- `Usuario.id`: **UUID (`string`)** — JWT `sub: string`, `RequestUser.id: string`.
- Sin rol en el JWT. Permisos por empresa vía `ContextoEmpresaGuard`.
- Campos: `correoVerificado`, `dosFactoresActivo`; no exponer `claveHash`.

| Endpoint | Comportamiento |
|----------|----------------|
| `POST /auth/register` | Crea usuario, **sin JWT**; envía OTP. No crea empresa ni suscripción |
| `POST /auth/register/verify-email` | Verifica OTP → JWT |
| `POST /auth/register/resend-email-code` | Reenvío (throttled) |
| `POST /auth/login` | JWT directo, o `{ twoFactorRequired }`, o re-verificación email |
| `POST /auth/login/complete-2fa` | Completa login 2FA |
| `PATCH /auth/me/two-factor` | Activa/desactiva 2FA (contraseña actual) |
| `GET /auth/me` | Perfil + membresías (`@SkipEmpresaContext`, `@AllowIncompleteSubscription`) |
| `POST /empresas` | Onboarding tenant + bootstrap suscripción `INCOMPLETA` |

- JWT payload: `{ sub: string, email }` (sub = `Usuario.id`).
- OTP: hash SHA256 con pepper de env; correos vía `TransactionalMailService` (no HTML inline en auth).
- Docs: `docs/tecnico/08-otp-y-autenticacion.md`, `docs/tecnico/11-rbac-usuarios-y-suscripcion.md`.

---

## 6. Correo transaccional

- **Transporte:** `MailService` (`sendMessage`, `sendPlainText`).
- **Plantillas:** `TransactionalMailService` + `templates/transactional-email.templates.ts`.
- **Shell HTML:** `buildTransactionalEmailShell` en `email-template.util.ts`; escapar dinámicos con `escapeHtml`.
- Branding: `APP_NAME` en env.
- Regla: `.cursor/rules/email-templates-design-system.mdc`.

---

## 7. PayPal / suscripciones SaaS

- **Servicios:** `PlatformSubscriptionService`, `PaypalBillingService`.
- **Webhook:** `POST /integrations/paypal/webhook` — requiere `NestFactory.create(AppModule, { rawBody: true })`.
- Flujo **webhook-first**: no marcar suscripción activa solo por return URL de PayPal.
- Suscripción por **empresa** (`Suscripcion.empresaId`).
- Guard global `SubscriptionActiveGuard` bloquea si la empresa no tiene suscripción operativa.
- Excepciones: `@Public()`, `@AllowIncompleteSubscription()`, rutas sin `empresaId`.
- Docs: `docs/tecnico/09-suscripciones-paypal.md`.

---

## 8. Acceso a datos (TypeORM)

### Hacer
```typescript
@InjectRepository(Usuario)
private readonly usuarioRepo: Repository<Usuario>;

await this.usuarioRepo.findOne({ where: { id } });
await this.usuarioRepo.update({ id }, { correoVerificado: true });
await this.planRepository.upsert(rows, ['codigo']);
await this.usuarioRepo.findAndCount({ skip, take, where, order });
```

### No hacer (en servicios, guards, seeds)
```typescript
await dataSource.query('SELECT ...');      // ❌
await queryRunner.query('INSERT ...');       // ❌ (solo migraciones)
```

- Regla: `.cursor/rules/typeorm-acceso-datos.mdc`
- Docs: `docs/tecnico/10-acceso-datos-typeorm.md`

---

## 9. Seed

- `RbacSeedService` + `PlatformPlansSeedService` usan `repository.upsert` (TypeORM).
- `SEED_ON_STARTUP=true` → siembra RBAC + planes al arrancar.
- `POST /seed/fundacion` y `POST /seed/platform-plans` → `SEED_ENDPOINT_ENABLED=true`.

---

## 10. Guards e interceptores globales

| Guard / interceptor | Rol |
|---------------------|-----|
| `JwtAuthGuard` | Auth Bearer por defecto |
| `ThrottlerGuard` | Rate limit global (120/min) |
| `ContextoEmpresaGuard` | `x-empresa-id` + permisos fusionados |
| `PermisosGuard` | `@RequirePermission(modulo, flag)` |
| `SubscriptionActiveGuard` | Suscripción de la empresa operativa |
| `PlanFeatureGuard` | `@RequirePlanFeature` según `planes.caracteristicas` |
| `IdempotencyInterceptor` | Dedup mutaciones (`x-idempotency-key` o huella) |
| `LoggingInterceptor` | Log HTTP |
| `AllExceptionsFilter` | Formato de error unificado |

Decoradores en `src/common/decorators/`: `Public`, `SkipEmpresaContext`, `RequirePermission`, `RequirePlanFeature`, `CurrentUser`, `AllowIncompleteSubscription`.

---

## 11. Índice de reglas Cursor (detalle)

| Archivo | Cuándo aplica |
|---------|----------------|
| `proyecto-plantilla.mdc` | Siempre — convenciones base |
| `typeorm-acceso-datos.mdc` | Siempre — cero SQL directo |
| `idempotencia-antidoble-submit.mdc` | Mutaciones POST/PATCH/PUT/DELETE |
| `email-templates-design-system.mdc` | Correos transaccionales |
| `rbac-modulos.mdc` | Siempre — autorización módulo + flag |
| `auth-plantilla.mdc` | Auth, OTP, 2FA, guards, JWT (`Usuario.id` UUID) |
| `nest-modules.mdc` | `src/modules/**/*.ts` |
| `typeorm-entities.mdc` | Entidades (`database/entities/`) |
| `paginacion.mdc` | Listados paginados (`PageQueryDto`, `PaginationResult`) |
| `postman-colecciones.mdc` | Colecciones Postman (`docs/postman/`) |

**Copilot path-scoped:** `.github/instructions/*.instructions.md` — deben coincidir con las reglas Cursor anteriores (incluye `pagination.instructions.md`).

---

## 12. Checklist antes de proponer código

- [ ] ¿Usa `ResponseHelper` en controller?
- [ ] ¿Servicio usa `@InjectRepository` sin SQL crudo?
- [ ] ¿Listado paginado?
- [ ] ¿Mensajes en español?
- [ ] ¿Sin `any`?
- [ ] ¿Correo vía `TransactionalMailService` / shell único?
- [ ] ¿Mutación crítica con `x-idempotency-key` (el interceptor ya cubre single-flight)?
- [ ] ¿Ruta pública, `@SkipEmpresaContext` o `@AllowIncompleteSubscription` si aplica?
- [ ] ¿Mutación de negocio con `@RequirePermission(modulo, flag)`?
- [ ] ¿Si el módulo depende del plan, `@RequirePlanFeature`?
