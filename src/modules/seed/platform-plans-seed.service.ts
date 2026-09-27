import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../database/entities/plan.entity';
import { RbacSeedService } from './rbac-seed.service';

export interface PlatformPlansSeedResult {
  upserted: number;
  codes: string[];
}

@Injectable()
export class PlatformPlansSeedService {
  private readonly logger = new Logger(PlatformPlansSeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  async seedPlatformSubscriptionPlans(): Promise<PlatformPlansSeedResult> {
    const rows = this.buildPlanRows();
    await this.planRepository.upsert(rows, ['codigo']);

    this.logger.log(
      `Planes SaaS sincronizados: ${rows.map((row) => row.codigo).join(', ')}`,
    );

    return {
      upserted: rows.length,
      codes: rows.map((row) => row.codigo),
    };
  }

  private buildPlanRows(): Array<
    Pick<
      Plan,
      | 'codigo'
      | 'nombre'
      | 'descripcion'
      | 'paypalPlanId'
      | 'ordenVisualizacion'
      | 'precioMensualCentavos'
      | 'maximoRecursos'
      | 'caracteristicas'
      | 'activo'
      | 'precio'
      | 'moneda'
    >
  > {
    return [
      {
        codigo: 'starter',
        nombre: 'Plan inicial',
        descripcion: 'Ideal para comenzar con recursos limitados.',
        paypalPlanId: this.normalizeNullableEnv(
          this.config.get<string>('SEED_PLATFORM_PLAN_STARTER_PAYPAL_PLAN_ID'),
        ),
        ordenVisualizacion: 10,
        precioMensualCentavos: this.getPlanPriceCentsFromEnv(
          'SEED_PLATFORM_PLAN_STARTER_PRICE_CENTS',
          1900,
        ),
        maximoRecursos: 1,
        caracteristicas: {},
        activo: true,
        precio: '19.00',
        moneda: 'USD',
      },
      {
        codigo: 'professional',
        nombre: 'Plan profesional',
        descripcion: 'Para equipos en crecimiento con más capacidad.',
        paypalPlanId: this.normalizeNullableEnv(
          this.config.get<string>(
            'SEED_PLATFORM_PLAN_PROFESSIONAL_PAYPAL_PLAN_ID',
          ),
        ),
        ordenVisualizacion: 20,
        precioMensualCentavos: this.getPlanPriceCentsFromEnv(
          'SEED_PLATFORM_PLAN_PROFESSIONAL_PRICE_CENTS',
          4900,
        ),
        maximoRecursos: 3,
        caracteristicas: {},
        activo: true,
        precio: '49.00',
        moneda: 'USD',
      },
      {
        codigo: 'enterprise',
        nombre: 'Plan empresa',
        descripcion: 'Máxima capacidad para operaciones avanzadas.',
        paypalPlanId: this.normalizeNullableEnv(
          this.config.get<string>(
            'SEED_PLATFORM_PLAN_ENTERPRISE_PAYPAL_PLAN_ID',
          ),
        ),
        ordenVisualizacion: 30,
        precioMensualCentavos: this.getPlanPriceCentsFromEnv(
          'SEED_PLATFORM_PLAN_ENTERPRISE_PRICE_CENTS',
          9900,
        ),
        maximoRecursos: 10,
        caracteristicas: {},
        activo: true,
        precio: '99.00',
        moneda: 'USD',
      },
    ];
  }

  private normalizeNullableEnv(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private getPlanPriceCentsFromEnv(key: string, fallback: number): number {
    const raw = Number(this.config.get<string>(key));
    if (!Number.isFinite(raw) || raw < 0) {
      return fallback;
    }
    return Math.round(raw);
  }
}

@Injectable()
export class SeedBootstrapService {
  private readonly logger = new Logger(SeedBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly platformPlansSeed: PlatformPlansSeedService,
    private readonly rbacSeed: RbacSeedService,
  ) {}

  async runStartupSeedIfEnabled(): Promise<void> {
    const enabled =
      this.config.get<string>('SEED_ON_STARTUP')?.trim().toLowerCase() ===
      'true';
    if (!enabled) {
      return;
    }

    try {
      await this.rbacSeed.sembrarFundacion();
      await this.platformPlansSeed.seedPlatformSubscriptionPlans();
    } catch (error: unknown) {
      const detail =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Seed de arranque falló: ${detail}`);
      throw new ServiceUnavailableException(
        'No se pudo ejecutar el seed de arranque. Revisa migraciones y conexión a BD.',
      );
    }
  }
}
