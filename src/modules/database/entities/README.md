# Entidades TypeORM

Las entidades viven en **`src/modules/database/entities/`** con barrel `index.ts`.

- Identidad y tenancy: `Usuario`, `Empresa`, `Sucursal`
- RBAC: `Aplicacion`, `Modulo`, `Rol`, `RolModulo`, `UsuarioEmpresa`, `UsuarioSucursalRol`
- Billing: `Plan`, `Suscripcion`, `EventoPaypal`
- Auth OTP: `DesafioVerificacionRegistro`, `DesafioLoginDosFactores`

Todas las PKs son UUID (`string`). TypeORM las carga vía:

- `DatabaseModule` → `ENTIDADES_PLANTILLA` en `forRoot` / `forFeature`
- `data-source.ts` → `entities: ['src/modules/**/entities/*.ts']`

## Reglas

Ver `.cursor/rules/typeorm-entities.mdc` y `.github/instructions/typeorm.instructions.md`.
