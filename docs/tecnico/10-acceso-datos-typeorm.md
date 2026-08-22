# Acceso a datos con TypeORM

Reglas de la plantilla: **cero SQL directo en runtime**.

## Regla principal

Todo acceso a PostgreSQL en servicios, guards, seeds y controladores debe pasar por **repositorios TypeORM** inyectados con `@InjectRepository(Entidad)`.

## Permitido

```typescript
@InjectRepository(User)
private readonly userRepository: Repository<User>;

await this.userRepository.findOne({ where: { id } });
await this.userRepository.save(entity);
await this.userRepository.update({ id }, { emailVerified: true });
await this.planRepository.upsert(rows, ['code']);
```

## Prohibido (fuera de migraciones)

```typescript
// ❌
await this.dataSource.query('SELECT * FROM users');
await queryRunner.query(`INSERT INTO ...`);
await pgClient.query('...');
```

## Única excepción: migraciones

En `src/migrations/*.ts` se permite `queryRunner.query` para cambios de esquema.

## Seeds

El módulo `src/modules/seed/` usa `repository.upsert` / `save` — nunca SQL crudo.

### Planes SaaS

- Arranque automático: `SEED_ON_STARTUP=true`
- Endpoint manual: `POST /seed/platform-plans` con `SEED_ENDPOINT_ENABLED=true`
- PayPal plan IDs opcionales vía `SEED_PLATFORM_PLAN_*_PAYPAL_PLAN_ID`

## Regla Cursor

Ver `.cursor/rules/typeorm-acceso-datos.mdc` (alwaysApply).
