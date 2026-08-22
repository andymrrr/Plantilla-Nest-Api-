import {
  EMPTY_MODULO_PERMISOS,
  FULL_MODULO_PERMISOS,
  esModuloPlataforma,
  type ModuloCodigo,
  type ModuloPermisos,
} from '../../common/types/permisos.types';
import { CODIGO_ROL_PROPIETARIO, CODIGO_ROL_SOPORTE } from '../../common/constants/roles-rbac';

export { CODIGOS_MODULO_RBAC, type ModuloCodigo } from '../../common/types/permisos.types';
export { CODIGO_ROL_PROPIETARIO, CODIGO_ROL_SOPORTE } from '../../common/constants/roles-rbac';

export interface ModuloCatalogo {
  codigo: ModuloCodigo;
  nombre: string;
}

export interface AplicacionCatalogo {
  codigo: string;
  nombre: string;
  modulos: ModuloCatalogo[];
}

/** Fuente de verdad: códigos de `@RequirePermission` deben coincidir con estos módulos. */
export const APLICACIONES_RBAC: AplicacionCatalogo[] = [
  {
    codigo: 'ADMINISTRACION',
    nombre: 'Administración',
    modulos: [
      { codigo: 'empresas', nombre: 'Empresas' },
      { codigo: 'sucursales', nombre: 'Sucursales' },
      { codigo: 'usuarios', nombre: 'Usuarios' },
      { codigo: 'roles', nombre: 'Roles' },
    ],
  },
  {
    codigo: 'PLATAFORMA',
    nombre: 'Plataforma',
    modulos: [
      { codigo: 'planes', nombre: 'Planes' },
      { codigo: 'suscripciones', nombre: 'Suscripciones' },
    ],
  },
];

const MODULOS_ADMINISTRACION = [
  'empresas',
  'sucursales',
  'usuarios',
  'roles',
] as const;

export type PresetPermiso = 'full' | 'lectura';

export interface RolSistemaCatalogo {
  codigo: string;
  nombre: string;
  descripcion: string;
  accesoTotal?: boolean;
  lecturaEnTodos?: boolean;
  permisos?: Record<string, PresetPermiso>;
}

function mapaFull(codigos: readonly string[]): Record<string, PresetPermiso> {
  return Object.fromEntries(codigos.map((codigo) => [codigo, 'full' as const]));
}

/**
 * Plantillas de rol: agrupan flags por módulo. La autorización nunca mira el código del rol.
 * - SOPORTE: catálogo `roles` y módulos de plataforma (`planes`, `suscripciones`).
 * - ADMINISTRADOR: organización de la empresa; `roles` y plataforma solo si el catálogo lo dice.
 * - PROPIETARIO: negocio de la empresa; no administra el SaaS ni muta el catálogo `roles`.
 */
export const ROLES_SISTEMA_RBAC: RolSistemaCatalogo[] = [
  {
    codigo: CODIGO_ROL_PROPIETARIO,
    nombre: 'Propietario',
    descripcion:
      'Acceso total al negocio de la empresa. Planes y suscripciones de plataforma son de Soporte.',
    accesoTotal: true,
    permisos: { roles: 'lectura' },
  },
  {
    codigo: CODIGO_ROL_SOPORTE,
    nombre: 'Soporte',
    descripcion:
      'Administra roles, planes SaaS y suscripciones. El resto de módulos queda en consulta.',
    lecturaEnTodos: true,
    permisos: mapaFull(['roles', 'planes', 'suscripciones']),
  },
  {
    codigo: 'ADMINISTRADOR',
    nombre: 'Administrador',
    descripcion:
      'Administra usuarios y sucursales de la empresa. Planes y suscripciones SaaS los administra Soporte.',
    lecturaEnTodos: true,
    permisos: {
      ...mapaFull(MODULOS_ADMINISTRACION),
      roles: 'lectura',
    },
  },
  {
    codigo: 'SOLO_LECTURA',
    nombre: 'Solo lectura',
    descripcion: 'Consulta todos los módulos sin mutar datos.',
    lecturaEnTodos: true,
  },
];

export function flagsDeRolParaModulo(
  rol: RolSistemaCatalogo,
  codigoModulo: ModuloCodigo,
): ModuloPermisos {
  const preset = rol.permisos?.[codigoModulo];
  if (preset === 'full') {
    return { ...FULL_MODULO_PERMISOS };
  }
  if (preset === 'lectura') {
    return { ...EMPTY_MODULO_PERMISOS, lectura: true };
  }
  if (esModuloPlataforma(codigoModulo)) {
    return { ...EMPTY_MODULO_PERMISOS };
  }
  if (rol.accesoTotal) {
    return { ...FULL_MODULO_PERMISOS };
  }
  if (rol.lecturaEnTodos) {
    return { ...EMPTY_MODULO_PERMISOS, lectura: true };
  }
  return { ...EMPTY_MODULO_PERMISOS };
}

export function flagsDePlantilla(
  codigoRol: string,
  codigoModulo: ModuloCodigo,
): ModuloPermisos {
  const rol = ROLES_SISTEMA_RBAC.find((item) => item.codigo === codigoRol);
  if (!rol) {
    return { ...EMPTY_MODULO_PERMISOS };
  }
  return flagsDeRolParaModulo(rol, codigoModulo);
}
