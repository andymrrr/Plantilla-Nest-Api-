---
applyTo: "src/modules/**/entities/**/*.ts,src/modules/**/*.service.ts,src/modules/seed/**/*.ts,src/migrations/**/*.ts"
---

# Instrucciones — TypeORM y acceso a datos

> Espejo de `.cursor/rules/typeorm-entities.mdc` y `typeorm-acceso-datos.mdc`.

## Runtime (servicios, seeds, guards)
- **Solo** repositorios TypeORM vía `@InjectRepository`.
- Operaciones permitidas: `find`, `findOne`, `findAndCount`, `save`, `update`, `delete`, `upsert`, `count`, `exist`.
- **Prohibido:** `queryRunner.query`, `dataSource.query`, driver `pg`, SQL embebido.

## Entidades (estado actual del repo)
- Ubicación: `src/modules/database/entities/` + barrel `index.ts`.
- Todas las PKs de dominio son UUID (`string`). `Usuario.id` y JWT `sub` son UUID.
- Columnas BD: snake_case con `name: 'columna_snake'`.
- Enums PostgreSQL: archivo `*-enum.ts` + `enumName` en `@Column`.

## Migraciones (`src/migrations/`)
- Única capa donde se permite SQL crudo con `queryRunner.query`.
- Preferir cambios incrementales; no lógica de negocio.

## Seeds
- Usar `repository.upsert` / `save` — ver `src/modules/seed/platform-plans-seed.service.ts`.
