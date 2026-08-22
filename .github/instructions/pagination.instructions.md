---
applyTo: "src/modules/**/*.service.ts,src/modules/**/dto/*list*.dto.ts,src/modules/**/dto/*query*.dto.ts"
---

# Instrucciones — Paginación (listados)

> Espejo de `.cursor/rules/paginacion.mdc` (igual que ZynklyBackend).

## Formato estándar

- **Query:** `PageQueryDto` (`page`, `limit`, `orderBy`, `order`, `search`) o DTO que lo extienda.
- **Respuesta:** `PaginationResult<T>` → `{ items, page, limit, total, pages }`.
- **Helper:** `createPaginationResult(items, page, limit, total)` en `common/types/pagination.types.ts`.

## Servicio

1. DTO `XxxListQueryDto extends PageQueryDto` con `declare orderBy` restringido `@IsIn([...])`.
2. `buildTypeOrmPaginationArgs<Entidad>(query, { searchableFields, defaultOrderBy })`.
3. Filtros extra del DTO (activo, estado, etc.) en el **servicio**, no en el helper.
4. `repository.findAndCount(...)` → `createPaginationResult(...)`.

## Controller

```typescript
@Get()
async list(@Query() query: UserListQueryDto) {
  const result = await this.service.paginate(query);
  return ResponseHelper.ok(result, 'Recursos obtenidos correctamente');
}
```

## Prohibido

- `findAll()` sin paginación en endpoints.
- Respuestas sin `{ items, page, limit, total, pages }`.
- SQL directo para paginar (usar TypeORM + helpers).

## Archivos base

- `src/common/dto/page-query.dto.ts`
- `src/common/types/pagination.types.ts`
- `src/common/utils/pagination.ts`
