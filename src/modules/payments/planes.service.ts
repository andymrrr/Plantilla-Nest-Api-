import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createPaginationResult } from '../../common/types/pagination.types';
import type { PaginationResult } from '../../common/types/pagination.types';
import { buildTypeOrmPaginationArgs } from '../../common/utils/pagination';
import { Plan } from '../database/entities/plan.entity';
import { Suscripcion } from '../database/entities/suscripcion.entity';
import {
  ActualizarPlanDto,
  CrearPlanDto,
  PlanListQueryDto,
} from './dto/plan.dto';

@Injectable()
export class PlanesService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Suscripcion)
    private readonly suscripcionRepo: Repository<Suscripcion>,
  ) {}

  async paginar(query: PlanListQueryDto): Promise<PaginationResult<Plan>> {
    const args = buildTypeOrmPaginationArgs<Plan>(query, {
      searchableFields: ['codigo', 'nombre', 'descripcion'],
      defaultOrderBy: 'ordenVisualizacion',
    });
    const [items, total] = await this.planRepo.findAndCount({
      where: args.where,
      skip: args.skip,
      take: args.take,
      order: args.order,
    });
    return createPaginationResult(items, args.page, args.limit, total);
  }

  async obtener(id: string): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }
    return plan;
  }

  async crear(dto: CrearPlanDto): Promise<Plan> {
    const codigo = dto.codigo.trim().toLowerCase();
    const duplicado = await this.planRepo.findOne({ where: { codigo } });
    if (duplicado) {
      throw new ConflictException('Ya existe un plan con ese código.');
    }
    return this.planRepo.save(
      this.planRepo.create({
        codigo,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() ?? null,
        precio: dto.precio ?? '0',
        moneda: dto.moneda?.trim().toUpperCase() ?? 'USD',
        paypalPlanId: dto.paypalPlanId?.trim() ?? null,
        ordenVisualizacion: dto.ordenVisualizacion ?? 0,
        precioMensualCentavos: dto.precioMensualCentavos ?? 0,
        maximoRecursos: dto.maximoRecursos ?? 1,
        activo: dto.activo ?? true,
      }),
    );
  }

  async actualizar(id: string, dto: ActualizarPlanDto): Promise<Plan> {
    const plan = await this.obtener(id);
    if (dto.codigo && dto.codigo.trim().toLowerCase() !== plan.codigo) {
      const duplicado = await this.planRepo.findOne({
        where: { codigo: dto.codigo.trim().toLowerCase() },
      });
      if (duplicado) {
        throw new ConflictException('Ya existe un plan con ese código.');
      }
    }
    await this.planRepo.update(id, {
      codigo: dto.codigo?.trim().toLowerCase() ?? plan.codigo,
      nombre: dto.nombre?.trim() ?? plan.nombre,
      descripcion:
        dto.descripcion === undefined
          ? plan.descripcion
          : dto.descripcion.trim() || null,
      precio: dto.precio ?? plan.precio,
      moneda: dto.moneda?.trim().toUpperCase() ?? plan.moneda,
      paypalPlanId:
        dto.paypalPlanId === undefined
          ? plan.paypalPlanId
          : dto.paypalPlanId.trim() || null,
      ordenVisualizacion: dto.ordenVisualizacion ?? plan.ordenVisualizacion,
      precioMensualCentavos:
        dto.precioMensualCentavos ?? plan.precioMensualCentavos,
      maximoRecursos: dto.maximoRecursos ?? plan.maximoRecursos,
      activo: dto.activo ?? plan.activo,
    });
    return this.obtener(id);
  }

  async eliminar(id: string): Promise<void> {
    await this.obtener(id);
    const enUso = await this.suscripcionRepo.count({ where: { planId: id } });
    if (enUso > 0) {
      throw new ConflictException(
        'No se puede eliminar un plan con suscripciones. Desactívelo.',
      );
    }
    await this.planRepo.delete(id);
  }
}
