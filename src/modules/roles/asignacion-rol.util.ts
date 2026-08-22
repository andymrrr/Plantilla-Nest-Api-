import type { UsuarioSucursalRol } from '../database/entities/usuario-sucursal-rol.entity';

export type AsignacionRolResumen = {
  id: string;
  rolId: string;
  rolCodigo: string;
  rolNombre: string;
  sucursalId: string | null;
  sucursalNombre: string | null;
};

export function resumenAsignacionRol(
  asignaciones: UsuarioSucursalRol[],
): AsignacionRolResumen | null {
  const activas = asignaciones.filter((item) => item.activo);
  if (activas.length === 0) {
    return null;
  }
  const principal =
    activas.find((item) => item.sucursalId == null) ?? activas[0];
  return {
    id: principal.id,
    rolId: principal.rolId,
    rolCodigo: principal.rol?.codigo ?? '',
    rolNombre: principal.rol?.nombre ?? '',
    sucursalId: principal.sucursalId,
    sucursalNombre: principal.sucursal?.nombre ?? null,
  };
}
