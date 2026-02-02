<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

- [x] Verify that the copilot-instructions.md file in the .github directory is created.

## Reglas del template (obligatorias)

1. **Estructura modular**: todo feature debe vivir en `src/modules/<feature>`.
2. **Tipado estricto**: no usar `any`. Ajustar tipos y DTOs.
3. **Respuesta estándar**: todos los endpoints responden con `RespuestaServicio<T>`.
4. **Paginación obligatoria**: listados deben responder con `PaginacionVm<T>`.
5. **Sin buscar todo**: ningún servicio debe tener método `findAll()` o similar sin paginación.
6. **Clean Code**: responsabilidades claras, métodos pequeños y sin lógica duplicada.

## Checklist

- [x] Clarify Project Requirements
- [x] Scaffold the Project
- [x] Customize the Project
- [ ] Install Required Extensions
- [ ] Compile the Project
- [ ] Create and Run Task
- [ ] Launch the Project
- [ ] Ensure Documentation is Complete
