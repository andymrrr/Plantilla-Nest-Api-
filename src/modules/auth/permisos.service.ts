import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  mergeModuloPermisos,
  type ModuloCodigo,
  type PermisosPorModulo,
} from '../../common/types/permisos.types';
import { UsuarioEmpresa } from '../database/entities/usuario-empresa.entity';
import { UsuarioSucursalRol } from '../database/entities/usuario-sucursal-rol.entity';

export interface ContextoPermisos {
  empresaId: string;
  sucursalId: string | null;
  esPropietario: boolean;
  permisos: PermisosPorModulo;
}

@Injectable()
export class PermisosService {
  constructor(
    @InjectRepository(UsuarioEmpresa)
    private readonly usuarioEmpresaRepo: Repository<UsuarioEmpresa>,
    @InjectRepository(UsuarioSucursalRol)
    private readonly usuarioSucursalRolRepo: Repository<UsuarioSucursalRol>,
  ) {}

  async resolverContexto(
    usuarioId: string,
    empresaId: string,
    sucursalId: string | null,
  ): Promise<ContextoPermisos | null> {
    const membresia = await this.usuarioEmpresaRepo.findOne({
      where: { usuarioId, empresaId, activo: true },
    });
    if (!membresia) {
      return null;
    }

    const asignaciones = await this.usuarioSucursalRolRepo.find({
      where: [
        { usuarioEmpresaId: membresia.id, activo: true, sucursalId: IsNull() },
        ...(sucursalId
          ? [
              {
                usuarioEmpresaId: membresia.id,
                activo: true,
                sucursalId,
              },
            ]
          : []),
      ],
      relations: {
        rol: { rolesModulos: { modulo: true } },
      },
    });

    const rolesActivos = asignaciones.filter((item) => item.rol?.activo);
    const permisos: PermisosPorModulo = {};
    for (const asignacion of rolesActivos) {
      for (const rolModulo of asignacion.rol.rolesModulos ?? []) {
        if (!rolModulo.modulo?.activo) {
          continue;
        }
        const codigo = rolModulo.modulo.codigo as ModuloCodigo;
        permisos[codigo] = mergeModuloPermisos(permisos[codigo], {
          lectura: rolModulo.lectura,
          escritura: rolModulo.escritura,
          modificar: rolModulo.modificar,
          eliminar: rolModulo.eliminar,
          especial: rolModulo.especial,
          reporte: rolModulo.reporte,
        });
      }
    }

    return {
      empresaId,
      sucursalId,
      esPropietario: membresia.esPropietario,
      permisos,
    };
  }

  async listarMembresias(usuarioId: string): Promise<UsuarioEmpresa[]> {
    return this.usuarioEmpresaRepo.find({
      where: { usuarioId, activo: true },
      relations: { empresa: true },
    });
  }

  async tieneMembresia(usuarioId: string, empresaIds: string[]): Promise<boolean> {
    if (empresaIds.length === 0) {
      return false;
    }
    const count = await this.usuarioEmpresaRepo.count({
      where: { usuarioId, activo: true, empresaId: In(empresaIds) },
    });
    return count > 0;
  }
}
