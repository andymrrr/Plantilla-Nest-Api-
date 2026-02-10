<!-- Instrucciones de proyecto para GitHub Copilot. Basadas en .cursor/rules/. -->

# Plantilla Nest API – Reglas para Copilot

Este repositorio es la **plantilla** de backend NestJS. Las convenciones están en `.cursor/rules/`: la regla principal es `proyecto-plantilla.mdc`; el resto (auth-plantilla, nest-modules, paginacion, typeorm-entities) aplican por contexto.

## Estructura modular (plantilla)

- Cada feature en `src/modules/<nombre-modulo>/` (ej. `auth`, `usuarios`, `cursos`).
- Entidades TypeORM **solo** en `src/modules/database/entities/`, archivos `<nombre>.entity.ts`. Barrel en `entities/index.ts`.
- Código compartido en `src/common/` (decorators, dto, filters, helpers, types, utils).

## Respuestas API

- Todos los endpoints devuelven `RespuestaServicio<T>` con `ResponseHelper.ok(datos, mensaje)` o `ResponseHelper.fail(mensaje, error?)`.
- Formato: `{ exito, mensaje, data?, error? }`. No devolver objetos crudos.

## Tipado 100 % estricto

- No usar `any`. Usar tipos concretos, `unknown` con type guards o genéricos acotados.
- Arrays siempre tipados (ej. `User[]`, `PaginationResult<Entidad>`).
- Objetos con interfaces o tipos (DTOs, tipos de retorno). Parámetros y retornos de funciones siempre tipados.
- En parámetros decorados (ej. `@CurrentUser() user: RequestUser`) usar `import type` si hace falta.

## Paginación (listados)

- No usar `findAll()` ni equivalentes sin paginación.
- Query: `PageQueryDto` desde `common/dto/page-query.dto.ts` o DTO que lo extienda (page, limit, orderBy, order, search).
- Respuesta: `PaginationResult<T>` con `{ items, page, limit, total, pages }`. Usar `createPaginationResult(items, page, limit, total)` desde `common/types/pagination.types.ts`.
- En el servicio: `buildTypeOrmPaginationArgs<Entidad>(query, { searchableFields, filterKeys, defaultOrderBy })` desde `common/utils/pagination.ts` y `repository.findAndCount(...)`.
- DTO de listado: extender `PageQueryDto`, añadir `declare orderBy?: OrderByPermitido` y filtros; restringir orderBy con `@IsIn([...])`.

## Entidades TypeORM (plantilla)

- PK: `@PrimaryGeneratedColumn('uuid')` (id tipo `string`).
- Columnas en BD en snake_case con `name: 'nombre_columna'` cuando no coincida (ej. `created_at`).
- Enums: definir en `enums.ts` y en entidad usar `enumName` igual al tipo en BD. Relaciones con `@JoinColumn`, `onDelete: 'CASCADE'` o `'SET NULL'`. Índices con `@Index`, `@Unique`. Sin lógica de negocio en entidades.

## Autenticación (plantilla)

- Usuario: tabla del dominio (ej. `users`/`User` o `usuarios`/`Usuario`), ID UUID. Roles: enum del proyecto (ej. `RolUsuarioEnum`).
- JWT: payload `{ sub, email, role }`. Usuario en request: `RequestUser` (`id`, `email`, `role`), con `@CurrentUser()`.
- Rutas públicas (login, register): `@Public()`. Protegidas: `JwtAuthGuard` + `RolesGuard` y `@Roles('...')` según roles del proyecto.
- No exponer hash de contraseña en respuestas.

## Módulos Nest (plantilla)

- Estructura: `<nombre>.module.ts`, `<nombre>.controller.ts`, `<nombre>.service.ts`, `dto/` (create, update, list-query).
- Controladores: `@Param('id', ParseUUIDPipe) id: string` para UUID. Respuesta con `ResponseHelper`. DTOs con class-validator.
- Servicios: `@InjectRepository(Entidad)`. Listados con método `paginate(query)` que devuelve `PaginationResult<T>`. Excepciones Nest con mensajes en **español**.

## Idioma

- Mensajes al cliente y textos de validación en **español** (ej. "Recurso no encontrado", "El nombre es obligatorio").

## Clean Code

- Responsabilidades claras, métodos pequeños, sin lógica duplicada.
