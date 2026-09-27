---
applyTo: "docs/postman/**,src/modules/**/*.controller.ts"
---

# Instrucciones — Colecciones Postman

> Espejo de `.cursor/rules/postman-colecciones.mdc`.

## Regla

No editar `*.postman_collection.json` a mano.

1. Añade el body en `docs/postman/example-bodies.mjs` (`METHOD /ruta`).
2. Regenera: `node docs/postman/generate-full-collection.mjs`.

Mutaciones autenticadas llevan `x-idempotency-key`. Negocio lleva `x-empresa-id` salvo `@Public` / `@SkipEmpresaContext`.

Guía: `docs/postman/README.md`.
