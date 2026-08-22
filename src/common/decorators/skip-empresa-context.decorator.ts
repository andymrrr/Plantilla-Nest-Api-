import { SetMetadata } from '@nestjs/common';

export const SKIP_EMPRESA_CONTEXT_KEY = 'skipEmpresaContext';

/** Rutas autenticadas que no exigen header x-empresa-id (auth, seed, listado de empresas). */
export const SkipEmpresaContext = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(SKIP_EMPRESA_CONTEXT_KEY, true);
