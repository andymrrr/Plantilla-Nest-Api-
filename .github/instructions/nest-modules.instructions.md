---
applyTo: "src/modules/**/*.service.ts,src/modules/**/*.controller.ts,src/modules/**/guards/**/*.ts"
---

# Instrucciones — módulos Nest (servicios y controladores)

> Espejo de `.cursor/rules/nest-modules.mdc`.

## Controller
- No llamar repositorios ni `DataSource` directamente.
- Devolver siempre `ResponseHelper.ok` / `ResponseHelper.fail`.
- DTOs con class-validator; no usar `any`.

## Service
- Inyectar `@InjectRepository(Entidad)` — **prohibido** `.query()`, `getConnection()`, SQL crudo.
- Persistencia: `find`, `findOne`, `findOneBy`, `save`, `update`, `delete`, `upsert`, `findAndCount`.
- Transacciones: `this.repo.manager.transaction(async (manager) => manager.getRepository(Entidad)...)`.
- Listados: `paginate()` + `PageQueryDto` + `PaginationResult<T>`.
- Lanzar `NotFoundException`, `BadRequestException`, etc. con mensajes en **español**.

## Auth / guards
- `@Public()` en rutas sin JWT.
- `@SkipEmpresaContext()` en auth, listado/alta de empresas y seed.
- `@AllowIncompleteSubscription()` en checkout PayPal, sync, `/auth/me`, 2FA config.
- `@RequirePermission('usuarios', 'escritura')` (u otro módulo/flag) en mutaciones de negocio.
- `@CurrentUser() user: RequestUser` — tipo en `src/common/types/request-user.types.ts`.
- IDs con `ParseUUIDPipe`.
