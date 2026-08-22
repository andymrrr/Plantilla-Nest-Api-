# RBAC, usuarios, empresas y suscripción

Núcleo multiempresa de la plantilla. El rol **no autoriza**: solo agrupa flags por módulo.

## Modelo

```
Aplicacion → Modulo
Rol (empresaId null = plantilla sistema) → RolModulo (6 flags)
Usuario → UsuarioEmpresa → UsuarioSucursalRol → Rol
Empresa → Suscripcion → Plan
```

Flags: `lectura`, `escritura`, `modificar`, `eliminar`, `especial`, `reporte`. Si el usuario tiene varios roles, se fusionan con OR.

## Catálogo mínimo

Fuente: `src/modules/seed/rbac-catalogo.ts`.

| Aplicación | Módulos |
|------------|---------|
| ADMINISTRACION | empresas, sucursales, usuarios, roles |
| PLATAFORMA | planes, suscripciones |

Roles sistema: `PROPIETARIO`, `SOPORTE`, `ADMINISTRADOR`, `SOLO_LECTURA`.

Para un producto derivado (ERP, LMS, etc.):

1. Añadir aplicaciones/módulos en `APLICACIONES_RBAC`.
2. Añadir el código a `CODIGOS_MODULO_RBAC`.
3. Ajustar `ROLES_SISTEMA_RBAC` si hace falta.
4. Sembrar: `POST /seed/fundacion` o `SEED_ON_STARTUP=true`.

## Onboarding

1. `POST /auth/register` + verify-email → JWT **sin** empresa.
2. `POST /empresas` (`@SkipEmpresaContext`, `@AllowIncompleteSubscription`):
   - crea empresa + sucursal principal
   - clona roles sistema
   - asigna `PROPIETARIO` al creador
   - `bootstrapEmpresaSubscription` → `INCOMPLETA`
3. Checkout PayPal (`empresas/escritura`). Estado final **solo por webhook**.
4. Requests de negocio: `Authorization` + `x-empresa-id` (+ `x-sucursal-id` opcional).

## Guards

Orden en `app.module.ts`:

1. `JwtAuthGuard`
2. `ThrottlerGuard`
3. `ContextoEmpresaGuard`
4. `PermisosGuard`
5. `SubscriptionActiveGuard`

`SubscriptionActiveGuard` no bloquea si no hay `empresaId`. Con empresa, exige `ACTIVA` o `EN_PRUEBA` y `fechaProximoPago` vigente.

## Endpoints clave

| Área | Rutas |
|------|--------|
| Roles | `GET /aplicaciones`, `GET /modulos`, CRUD `/roles`, `POST /roles/asignaciones` |
| Usuarios | `GET/POST /usuarios`, `GET /usuarios/:id/asignacion-rol` |
| Empresas | `GET/POST /empresas`, `GET/PATCH /empresas/:id` |
| Sucursales | CRUD `/sucursales` |
| Planes (admin) | CRUD `/planes` (permisos `planes`; rol Soporte) |
| Billing | `/payments/platform-subscription/*` (permisos `empresas`) |

## Seed

- `POST /seed/fundacion` — aplicaciones, módulos, roles sistema.
- `POST /seed/platform-plans` — planes starter/professional/enterprise.
- Ambos requieren `SEED_ENDPOINT_ENABLED=true`.

## Reglas

- `.cursor/rules/rbac-modulos.mdc`
- `.cursor/rules/auth-plantilla.mdc`
- Espejo Copilot: `.github/instructions/rbac.instructions.md`
