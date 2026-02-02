Carpeta donde deben colocarse las entidades de la base de datos.

Regla del template:

- Todas las entidades TypeORM deben vivir en `src/modules/database/entities`.
- Nombres: `<nombre>.entity.ts`.
- Exporta la clase entidad como `export class MiEntidad {}`.

Ejemplo:

- `src/modules/database/entities/user.entity.ts`

Motivación:

- Centralizar entidades facilita migraciones y la configuración de TypeORM.
- TypeORM carga automáticamente los archivos desde esta carpeta según `DatabaseModule`.
