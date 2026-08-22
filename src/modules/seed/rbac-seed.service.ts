import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { ModuloCodigo } from '../../common/types/permisos.types';
import { Aplicacion } from '../database/entities/aplicacion.entity';
import { Modulo } from '../database/entities/modulo.entity';
import { Rol } from '../database/entities/rol.entity';
import { RolModulo } from '../database/entities/rol-modulo.entity';
import {
  APLICACIONES_RBAC,
  ROLES_SISTEMA_RBAC,
  flagsDeRolParaModulo,
} from './rbac-catalogo';

export interface RbacSeedResult {
  aplicaciones: number;
  modulos: number;
  rolesSistema: number;
}

@Injectable()
export class RbacSeedService {
  private readonly logger = new Logger(RbacSeedService.name);

  constructor(
    @InjectRepository(Aplicacion)
    private readonly aplicacionRepo: Repository<Aplicacion>,
    @InjectRepository(Modulo)
    private readonly moduloRepo: Repository<Modulo>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(RolModulo)
    private readonly rolModuloRepo: Repository<RolModulo>,
  ) {}

  async sembrarFundacion(): Promise<RbacSeedResult> {
    const apps = await this.sembrarAplicaciones();
    const rolesSistema = await this.sembrarRolesSistema();
    this.logger.log(
      `RBAC sincronizado: ${apps.aplicaciones} apps, ${apps.modulos} módulos, ${rolesSistema} roles sistema`,
    );
    return { ...apps, rolesSistema };
  }

  private async sembrarAplicaciones(): Promise<{
    aplicaciones: number;
    modulos: number;
  }> {
    let modulos = 0;
    for (const app of APLICACIONES_RBAC) {
      await this.aplicacionRepo.upsert(
        { codigo: app.codigo, nombre: app.nombre, activo: true },
        ['codigo'],
      );
      const aplicacion = await this.aplicacionRepo.findOneByOrFail({
        codigo: app.codigo,
      });
      for (const modulo of app.modulos) {
        await this.moduloRepo.upsert(
          {
            aplicacionId: aplicacion.id,
            codigo: modulo.codigo,
            nombre: modulo.nombre,
            activo: true,
          },
          ['codigo'],
        );
        modulos += 1;
      }
    }
    return { aplicaciones: APLICACIONES_RBAC.length, modulos };
  }

  private async sembrarRolesSistema(): Promise<number> {
    const modulos = await this.moduloRepo.find({ where: { activo: true } });
    for (const def of ROLES_SISTEMA_RBAC) {
      let rol = await this.rolRepo.findOne({
        where: { codigo: def.codigo, empresaId: IsNull(), esSistema: true },
      });
      if (!rol) {
        rol = await this.rolRepo.save(
          this.rolRepo.create({
            empresaId: null,
            codigo: def.codigo,
            nombre: def.nombre,
            descripcion: def.descripcion,
            esSistema: true,
            activo: true,
          }),
        );
      } else {
        await this.rolRepo.update(rol.id, {
          nombre: def.nombre,
          descripcion: def.descripcion,
          activo: true,
        });
      }
      for (const modulo of modulos) {
        await this.rolModuloRepo.upsert(
          {
            rolId: rol.id,
            moduloId: modulo.id,
            ...flagsDeRolParaModulo(def, modulo.codigo as ModuloCodigo),
          },
          ['rolId', 'moduloId'],
        );
      }
    }
    return ROLES_SISTEMA_RBAC.length;
  }
}
