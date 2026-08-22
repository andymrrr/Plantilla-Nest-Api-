# Paginación (listados API)

Reglas idénticas a ZynklyBackend. Fuente Cursor: `.cursor/rules/paginacion.mdc`.

## Formato

| Capa | Contrato |
|------|----------|
| Query | `PageQueryDto`: `page`, `limit`, `orderBy`, `order`, `search` |
| Respuesta | `PaginationResult<T>`: `items`, `page`, `limit`, `total`, `pages` |

## Archivos compartidos

```
src/common/dto/page-query.dto.ts
src/common/types/pagination.types.ts   → createPaginationResult
src/common/utils/pagination.ts         → buildTypeOrmPaginationArgs
```

## Flujo en servicio

```typescript
async paginate(query: UserListQueryDto): Promise<PaginationResult<User>> {
  const args = buildTypeOrmPaginationArgs<User>(query, {
    searchableFields: ['correo', 'nombre', 'apellido'],
    defaultOrderBy: 'createdAt',
  });
  const [items, total] = await this.userRepository.findAndCount({
    where: args.where,
    skip: args.skip,
    take: args.take,
    order: args.order as { [key: string]: 'ASC' | 'DESC' },
  });
  return createPaginationResult(items, args.page, args.limit, total);
}
```

### Filtros adicionales (en el servicio)

El helper solo resuelve **page, limit, order y search**. Si el DTO trae filtros (`activo`, `status`, etc.), combínalos en el servicio sobre `args.where` usando propiedades tipadas del DTO — sin casts genéricos ni `typeof` en el util.

## DTO de listado

```typescript
export class UserListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['correo', 'nombre', 'apellido', 'fechaCreacion'])
  declare orderBy?: 'correo' | 'nombre' | 'apellido' | 'fechaCreacion';
}
```

## Controller

```typescript
@Get()
async list(@Query() query: UserListQueryDto) {
  const result = await this.usersService.paginate(query);
  return ResponseHelper.ok(result, 'Usuarios obtenidos correctamente');
}
```

El cliente recibe: `{ exito, mensaje, data: { items, page, limit, total, pages } }`.

## Prohibido

- Endpoints de listado sin paginación.
- Devolver arrays crudos sin metadatos de página.
- Paginar con SQL directo (usar TypeORM + helpers).
