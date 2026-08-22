import { Controller, ForbiddenException, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SkipEmpresaContext } from '../../common/decorators/skip-empresa-context.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { PlatformPlansSeedService } from './platform-plans-seed.service';
import { RbacSeedService } from './rbac-seed.service';

@ApiTags('Seed')
@Controller('seed')
@SkipEmpresaContext()
export class SeedController {
  constructor(
    private readonly config: ConfigService,
    private readonly platformPlansSeed: PlatformPlansSeedService,
    private readonly rbacSeed: RbacSeedService,
  ) {}

  @Public()
  @Post('fundacion')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sembrar catálogo RBAC',
    description:
      'Upsert de aplicaciones, módulos y roles sistema. Requiere SEED_ENDPOINT_ENABLED=true.',
  })
  async seedFundacion() {
    this.assertSeedEndpointEnabled();
    const data = await this.rbacSeed.sembrarFundacion();
    return ResponseHelper.ok(data, 'Catálogo RBAC sincronizado correctamente');
  }

  @Public()
  @Post('platform-plans')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sembrar planes SaaS de ejemplo',
    description:
      'Upsert de planes starter/professional/enterprise vía TypeORM. Requiere SEED_ENDPOINT_ENABLED=true.',
  })
  async seedPlatformPlans() {
    this.assertSeedEndpointEnabled();
    const data = await this.platformPlansSeed.seedPlatformSubscriptionPlans();
    return ResponseHelper.ok(data, 'Planes SaaS sincronizados correctamente');
  }

  private assertSeedEndpointEnabled(): void {
    const enabled =
      this.config.get<string>('SEED_ENDPOINT_ENABLED')?.trim().toLowerCase() ===
      'true';
    if (!enabled) {
      throw new ForbiddenException(
        'Endpoint de seed deshabilitado. Define SEED_ENDPOINT_ENABLED=true en desarrollo.',
      );
    }
  }
}
