import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoSuscripcionPlataforma } from '../database/entities/estado-suscripcion-plataforma.enum';
import { Plan } from '../database/entities/plan.entity';
import { Suscripcion } from '../database/entities/suscripcion.entity';
import {
  normalizarCaracteristicas,
  type PlanCaracteristicas,
  type PlanFeatureKey,
} from '../../common/types/plan-caracteristicas.types';

@Injectable()
export class PlanFeaturesService {
  constructor(
    @InjectRepository(Suscripcion)
    private readonly suscripcionRepo: Repository<Suscripcion>,
  ) {}

  async obtenerPlanEmpresa(empresaId: string): Promise<Plan> {
    const suscripcion = await this.suscripcionRepo.findOne({
      where: { empresaId },
      relations: { plan: true },
      order: { fechaCreacion: 'DESC' },
    });
    if (!suscripcion?.plan) {
      throw new NotFoundException(
        'La empresa no tiene un plan de suscripción asociado.',
      );
    }
    return suscripcion.plan;
  }

  async caracteristicas(empresaId: string): Promise<PlanCaracteristicas> {
    const plan = await this.obtenerPlanEmpresa(empresaId);
    return normalizarCaracteristicas(plan.caracteristicas, plan.codigo);
  }

  async assertFeature(empresaId: string, feature: PlanFeatureKey): Promise<void> {
    const caracteristicas = await this.caracteristicas(empresaId);
    if (caracteristicas[feature] !== true) {
      throw new ForbiddenException({
        message: `Tu plan no incluye la función requerida (${String(feature)}). Actualiza la suscripción para continuar.`,
        code: 'PLAN_FEATURE_NO_INCLUIDA',
        feature,
      });
    }
  }

  async assertCupoSucursales(
    empresaId: string,
    sucursalesActuales: number,
  ): Promise<void> {
    const plan = await this.obtenerPlanEmpresa(empresaId);
    if (sucursalesActuales >= plan.maximoRecursos) {
      throw new ForbiddenException({
        message: `El plan permite como máximo ${plan.maximoRecursos} sucursal(es). Actualiza el plan para crear otra.`,
        code: 'PLAN_LIMITE_SUCURSALES',
        maximoRecursos: plan.maximoRecursos,
      });
    }
  }

  esOperativa(suscripcion: Suscripcion): boolean {
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
