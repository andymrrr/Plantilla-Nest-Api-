import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aplicacion } from '../database/entities/aplicacion.entity';
import { Modulo } from '../database/entities/modulo.entity';
import { Plan } from '../database/entities/plan.entity';
import { Rol } from '../database/entities/rol.entity';
import { RolModulo } from '../database/entities/rol-modulo.entity';
import { SeedController } from './seed.controller';
import {
  PlatformPlansSeedService,
  SeedBootstrapService,
} from './platform-plans-seed.service';
import { RbacSeedService } from './rbac-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Aplicacion, Modulo, Rol, RolModulo]),
  ],
  controllers: [SeedController],
  providers: [PlatformPlansSeedService, RbacSeedService, SeedBootstrapService],
  exports: [PlatformPlansSeedService, RbacSeedService],
})
export class SeedModule implements OnModuleInit {
  constructor(private readonly seedBootstrap: SeedBootstrapService) {}

  async onModuleInit(): Promise<void> {
    await this.seedBootstrap.runStartupSeedIfEnabled();
  }
}
