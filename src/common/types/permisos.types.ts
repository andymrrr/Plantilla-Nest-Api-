export const PERMISSION_FLAGS = [
  'lectura',
  'escritura',
  'modificar',
  'eliminar',
  'especial',
  'reporte',
] as const;

export type PermissionFlag = (typeof PERMISSION_FLAGS)[number];

/** Códigos de `@RequirePermission`. Mantener alineado con `APLICACIONES_RBAC`. */
export const CODIGOS_MODULO_RBAC = [
  'empresas',
  'sucursales',
  'usuarios',
  'roles',
  'planes',
  'suscripciones',
] as const;

export type ModuloCodigo = (typeof CODIGOS_MODULO_RBAC)[number];

export interface ModuloPermisos {
  lectura: boolean;
  escritura: boolean;
  modificar: boolean;
  eliminar: boolean;
  especial: boolean;
  reporte: boolean;
}

export const EMPTY_MODULO_PERMISOS: ModuloPermisos = {
  lectura: false,
  escritura: false,
  modificar: false,
  eliminar: false,
  especial: false,
  reporte: false,
};

export const FULL_MODULO_PERMISOS: ModuloPermisos = {
  lectura: true,
  escritura: true,
  modificar: true,
  eliminar: true,
  especial: true,
  reporte: true,
};

export type PermisosPorModulo = Partial<Record<ModuloCodigo, ModuloPermisos>>;

/** Catálogo SaaS: no es de la empresa; solo la plantilla Soporte lleva estos flags. */
export const MODULOS_PLATAFORMA = ['planes', 'suscripciones'] as const;

export type ModuloPlataforma = (typeof MODULOS_PLATAFORMA)[number];

export function esModuloPlataforma(codigo: string): boolean {
  return (MODULOS_PLATAFORMA as readonly string[]).includes(codigo);
}

export function mergeModuloPermisos(
  current: ModuloPermisos | undefined,
  extra: ModuloPermisos,
): ModuloPermisos {
  const base = current ?? EMPTY_MODULO_PERMISOS;
  return {
    lectura: base.lectura || extra.lectura,
    escritura: base.escritura || extra.escritura,
    modificar: base.modificar || extra.modificar,
    eliminar: base.eliminar || extra.eliminar,
    especial: base.especial || extra.especial,
    reporte: base.reporte || extra.reporte,
  };
}
