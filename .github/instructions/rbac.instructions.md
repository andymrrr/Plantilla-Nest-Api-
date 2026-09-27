---
applyTo: "src/modules/roles/**/*.ts,src/modules/empresas/**/*.ts,src/modules/auth/permisos.service.ts,src/modules/auth/guards/**/*.ts,src/modules/seed/rbac-catalogo.ts,src/common/decorators/require-permission.decorator.ts,src/common/decorators/require-plan-feature.decorator.ts,src/common/types/permisos.types.ts,src/common/types/plan-caracteristicas.types.ts"
---

# Instrucciones — RBAC módulo + flag

> Espejo de `.cursor/rules/rbac-modulos.mdc`.

## Autorización

- Usar `@RequirePermission('usuarios', 'escritura')` (u otro módulo/flag del catálogo).
- **Prohibido** autorizar con `codigoRol`, `PROPIETARIO`, `SOPORTE` o `user.esPropietario`.
- `esPropietario` es membresía; los flags salen del rol asignado.

## Catálogo

- Códigos en `CODIGOS_MODULO_RBAC` y `APLICACIONES_RBAC` (`src/modules/seed/rbac-catalogo.ts`).
- Plantilla mínima: empresas, sucursales, usuarios, roles, planes, suscripciones.
- Presets: `full` | `operar` | `lectura` | `ninguno`.
- Un derivado añade módulos al catálogo y vuelve a sembrar (`RbacSeedService`).

## Capas SaaS

- `@RequirePlanFeature` + `PlanFeatureGuard`. Keys en `PLAN_FEATURE_KEYS` (vacío en la plantilla).
- `SubscriptionActiveGuard` evalúa la suscripción de la **empresa**.
- Cupo de sucursales: `PlanFeaturesService.assertCupoSucursales`.

## Contexto

- Header `x-empresa-id` obligatorio salvo `@Public()` o `@SkipEmpresaContext()`.
- `PermisosService.resolverContexto` fusiona flags con OR.
- Suscripción operativa se evalúa por **empresa**, no por usuario.
