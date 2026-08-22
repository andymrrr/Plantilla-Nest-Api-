import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { SKIP_EMPRESA_CONTEXT_KEY } from '../../../common/decorators/skip-empresa-context.decorator';
import type { RequestUser } from '../../../common/types/request-user.types';
import { PermisosService } from '../permisos.service';

type RequestWithUser = {
  user?: RequestUser;
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class ContextoEmpresaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permisosService: PermisosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMPRESA_CONTEXT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      return true;
    }

    const empresaId = this.leerHeader(request, 'x-empresa-id');
    const sucursalId = this.leerHeader(request, 'x-sucursal-id');

    if (!empresaId) {
      if (skip) {
        request.user = {
          ...user,
          empresaId: null,
          sucursalId: null,
          esPropietario: false,
          permisos: {},
        };
        return true;
      }
      throw new ForbiddenException(
        'Debes indicar la empresa activa con el encabezado x-empresa-id.',
      );
    }

    const contexto = await this.permisosService.resolverContexto(
      user.id,
      empresaId,
      sucursalId,
    );
    if (!contexto) {
      throw new ForbiddenException(
        'No perteneces a la empresa indicada o la membresía está inactiva.',
      );
    }

    request.user = {
      ...user,
      empresaId: contexto.empresaId,
      sucursalId: contexto.sucursalId,
      esPropietario: contexto.esPropietario,
      permisos: contexto.permisos,
    };
    return true;
  }

  private leerHeader(
    request: RequestWithUser,
    nombre: string,
  ): string | null {
    const raw = request.headers[nombre];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }
}
