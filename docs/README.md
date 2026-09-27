# Documentación técnica — Plantilla Nest API

## Postman

- [Colecciones Postman (API completa, Ready, auth y seed)](./postman/README.md)

## Módulos

- [Paginación (listados API)](./tecnico/05-paginacion.md)
- [Reglas de templates de email](./tecnico/07-reglas-templates-email.md)
- [OTP y autenticación](./tecnico/08-otp-y-autenticacion.md)
- [Suscripciones PayPal](./tecnico/09-suscripciones-paypal.md)
- [Acceso a datos TypeORM (cero SQL directo)](./tecnico/10-acceso-datos-typeorm.md)
- [RBAC, usuarios, empresas y suscripción](./tecnico/11-rbac-usuarios-y-suscripcion.md)
- [Idempotencia y anti doble submit](./tecnico/12-idempotencia.md)

## Reglas Cursor (fuente de verdad)

Ver `.cursor/rules/` — **mantener sincronizado** con `.github/copilot-instructions.md`:

- `proyecto-plantilla.mdc`, `auth-plantilla.mdc`, `rbac-modulos.mdc`, `typeorm-entities.mdc`, `typeorm-acceso-datos.mdc`
- `email-templates-design-system.mdc`, `idempotencia-antidoble-submit.mdc`, `nest-modules.mdc`, `paginacion.mdc`
- `postman-colecciones.mdc` — regenerar colecciones; no editar JSON a mano

## Instrucciones GitHub Copilot / VS Code (espejo)

- Global: `.github/copilot-instructions.md`
- Por ruta: `.github/instructions/*.instructions.md` (frontmatter `applyTo`)
