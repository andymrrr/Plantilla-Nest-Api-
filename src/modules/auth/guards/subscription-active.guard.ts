import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ALLOW_INCOMPLETE_SUBSCRIPTION_KEY } from '../../../common/decorators/allow-incomplete-subscription.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import type { RequestUser } from '../../../common/types/request-user.types';
import { EstadoSuscripcionPlataforma } from '../../database/entities/estado-suscripcion-plataforma.enum';
import { Suscripcion } from '../../database/entities/suscripcion.entity';

type RequestWithUser = {
  user?: RequestUser;
};

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Suscripcion)
    private readonly suscripcionRepo: Repository<Suscripcion>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const allowIncomplete = this.reflector.getAllAndOverride<boolean>(
      ALLOW_INCOMPLETE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowIncomplete) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user?.empresaId) {
      return true;
    }

    const suscripcion = await this.suscripcionRepo.findOne({
      where: { empresaId: user.empresaId },
      order: { fechaCreacion: 'DESC' },
    });
    if (!suscripcion) {
      throw new ForbiddenException({
        message:
          'La suscripción de la empresa aún no está activa. Completa el pago para continuar.',
        code: 'SUSCRIPCION_INACTIVA',
      });
    }

    if (this.esOperativa(suscripcion)) {
      return true;
    }

    const vencida =
      suscripcion.estadoPlataforma === EstadoSuscripcionPlataforma.ACTIVA ||
      suscripcion.estadoPlataforma === EstadoSuscripcionPlataforma.EN_PRUEBA;

    throw new ForbiddenException(
      vencida &&
        suscripcion.fechaProximoPago &&
        suscripcion.fechaProximoPago.getTime() <= Date.now()
        ? {
            message:
              'La suscripción de la empresa está vencida. Renueva el plan para continuar.',
            code: 'SUSCRIPCION_VENCIDA',
          }
        : {
            message:
              'La suscripción de la empresa aún no está activa. Completa el pago para continuar.',
            code: 'SUSCRIPCION_INACTIVA',
          },
    );
  }

  private esOperativa(suscripcion: Suscripcion): boolean {
    if (
      suscripcion.estadoPlataforma !== EstadoSuscripcionPlataforma.ACTIVA &&
      suscripcion.estadoPlataforma !== EstadoSuscripcionPlataforma.EN_PRUEBA
    ) {
      return false;
    }
    if (!suscripcion.fechaProximoPago) {
      return false;
    }
    return suscripcion.fechaProximoPago.getTime() > Date.now();
  }
}
