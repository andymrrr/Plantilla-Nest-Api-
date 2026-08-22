import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_PERMISSION_KEY,
  type RequiredPermission,
} from '../../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../../common/types/request-user.types';

type RequestWithUser = {
  user?: RequestUser;
};

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      return true;
    }

    const flags = user.permisos[required.modulo];
    if (flags?.[required.flag] === true) {
      return true;
    }

    throw new ForbiddenException(
      `No tienes permiso de ${required.flag} en el módulo ${required.modulo}.`,
    );
  }
}
