import type { PermisosPorModulo } from './permisos.types';

export interface RequestUser {
  id: string;
  email: string;
  empresaId: string | null;
  sucursalId: string | null;
  esPropietario: boolean;
  permisos: PermisosPorModulo;
}
