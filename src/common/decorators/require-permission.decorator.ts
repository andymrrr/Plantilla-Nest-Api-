import { SetMetadata } from '@nestjs/common';
import type { ModuloCodigo, PermissionFlag } from '../types/permisos.types';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export interface RequiredPermission {
  modulo: ModuloCodigo;
  flag: PermissionFlag;
}

export const RequirePermission = (
  modulo: ModuloCodigo,
  flag: PermissionFlag,
): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRE_PERMISSION_KEY, {
    modulo,
    flag,
  } satisfies RequiredPermission);
