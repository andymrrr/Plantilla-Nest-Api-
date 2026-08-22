import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { createPaginationResult } from '../../common/types/pagination.types';
import type { PaginationResult } from '../../common/types/pagination.types';
import { buildTypeOrmPaginationArgs } from '../../common/utils/pagination';
import { Empresa } from '../database/entities/empresa.entity';
import { Modulo } from '../database/entities/modulo.entity';
import { Rol } from '../database/entities/rol.entity';
import { RolModulo } from '../database/entities/rol-modulo.entity';
import { Sucursal } from '../database/entities/sucursal.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { UsuarioEmpresa } from '../database/entities/usuario-empresa.entity';
import { UsuarioSucursalRol } from '../database/entities/usuario-sucursal-rol.entity';
import { PlatformSubscriptionService } from '../payments/platform-subscription.service';
import { CODIGO_ROL_PROPIETARIO } from '../../common/constants/roles-rbac';
import { flagsDePlantilla } from '../seed/rbac-catalogo';
import type { ModuloCodigo } from '../../common/types/permisos.types';
import type { RequestUser } from '../../common/types/request-user.types';
import { CrearEmpresaDto } from './dto/crear-empresa.dto';
import { ActualizarEmpresaDto } from './dto/actualizar-empresa.dto';
import { EmpresaListQueryDto } from './dto/empresa-list-query.dto';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(UsuarioEmpresa)
    private readonly usuarioEmpresaRepo: Repository<UsuarioEmpresa>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    private readonly platformSubscription: PlatformSubscriptionService,
  ) {}

  async paginate(
    user: RequestUser,
    query: EmpresaListQueryDto,
  ): Promise<PaginationResult<Empresa>> {
    const membresias = await this.usuarioEmpresaRepo.find({
      where: { usuarioId: user.id, activo: true },
    });
    const empresaIds = membresias.map((item) => item.empresaId);
    if (empresaIds.length === 0) {
      return createPaginationResult([], query.page ?? 1, query.limit ?? 10, 0);
    }

    const args = buildTypeOrmPaginationArgs<Empresa>(query, {
      searchableFields: ['nombre', 'nombreComercial'],
      defaultOrderBy: 'fechaCreacion',
    });
    const whereBase = Array.isArray(args.where)
      ? args.where.map((clause) => ({ ...clause, id: In(empresaIds) }))
      : { ...args.where, id: In(empresaIds) };
    const [items, total] = await this.empresaRepo.findAndCount({
      where: whereBase,
      skip: args.skip,
      take: args.take,
      order: args.order as { [key: string]: 'ASC' | 'DESC' },
    });
    return createPaginationResult(items, args.page, args.limit, total);
  }

  async crear(user: RequestUser, dto: CrearEmpresaDto): Promise<Empresa> {
    const empresa = await this.empresaRepo.manager.transaction(async (manager) => {
      const empresaRepo = manager.getRepository(Empresa);
      const sucursalRepo = manager.getRepository(Sucursal);
      const usuarioEmpresaRepo = manager.getRepository(UsuarioEmpresa);
      const usuarioSucursalRolRepo = manager.getRepository(UsuarioSucursalRol);
      const rolRepo = manager.getRepository(Rol);
      const rolModuloRepo = manager.getRepository(RolModulo);
      const moduloRepo = manager.getRepository(Modulo);

      const empresa = await empresaRepo.save(
        empresaRepo.create({
          nombre: dto.nombre.trim(),
          nombreComercial: dto.nombreComercial?.trim() ?? null,
          direccion: dto.direccion?.trim() ?? null,
          telefono: dto.telefono?.trim() ?? null,
          correo: dto.correo?.trim() ?? null,
          propietarioUsuarioId: user.id,
          activo: true,
        }),
      );

      const sucursal = await sucursalRepo.save(
        sucursalRepo.create({
          empresaId: empresa.id,
          codigo: 'PRINCIPAL',
          nombre: dto.sucursalNombre?.trim() || 'Sucursal principal',
          esPrincipal: dto.sucursalEsPrincipal ?? true,
        }),
      );

      const membresia = await usuarioEmpresaRepo.save(
        usuarioEmpresaRepo.create({
          usuarioId: user.id,
          empresaId: empresa.id,
          esPropietario: true,
          activo: true,
        }),
      );

      const plantillas = await rolRepo.find({
        where: { empresaId: IsNull(), esSistema: true, activo: true },
        relations: { rolesModulos: true },
      });
      const modulos = await moduloRepo.find({ where: { activo: true } });
      let rolPropietarioId: string | null = null;

      for (const plantilla of plantillas) {
        const copiado = await rolRepo.save(
          rolRepo.create({
            empresaId: empresa.id,
            codigo: plantilla.codigo,
            nombre: plantilla.nombre,
            descripcion: plantilla.descripcion,
            esSistema: false,
            activo: true,
          }),
        );
        if (plantilla.codigo === CODIGO_ROL_PROPIETARIO) {
          rolPropietarioId = copiado.id;
        }
        if (plantilla.rolesModulos.length > 0) {
          await rolModuloRepo.save(
            plantilla.rolesModulos.map((item) =>
              rolModuloRepo.create({
                rolId: copiado.id,
                moduloId: item.moduloId,
                lectura: item.lectura,
                escritura: item.escritura,
                modificar: item.modificar,
                eliminar: item.eliminar,
                especial: item.especial,
                reporte: item.reporte,
              }),
            ),
          );
        } else if (plantilla.codigo === CODIGO_ROL_PROPIETARIO) {
          await rolModuloRepo.save(
            modulos.map((modulo) =>
              rolModuloRepo.create({
                rolId: copiado.id,
                moduloId: modulo.id,
                ...flagsDePlantilla(
                  CODIGO_ROL_PROPIETARIO,
                  modulo.codigo as ModuloCodigo,
                ),
              }),
            ),
          );
        }
      }

      if (rolPropietarioId) {
        await usuarioSucursalRolRepo.save(
          usuarioSucursalRolRepo.create({
            usuarioEmpresaId: membresia.id,
            sucursalId: null,
            rolId: rolPropietarioId,
            activo: true,
          }),
        );
      }

      empresa.sucursales = [sucursal];
      return empresa;
    });
    const usuario = await this.usuarioRepo.findOne({ where: { id: user.id } });
    const planCode = dto.planCode?.trim() || usuario?.planCodigoElegido;
    await this.platformSubscription.bootstrapEmpresaSubscription(
      empresa.id,
      planCode,
    );
    return empresa;
  }

  async obtener(user: RequestUser, id: string): Promise<Empresa> {
    const empresa = await this.empresaRepo.findOne({
      where: { id },
      relations: { sucursales: true },
    });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }
    const membresia = await this.usuarioEmpresaRepo.findOne({
      where: { usuarioId: user.id, empresaId: id, activo: true },
    });
    if (!membresia) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return empresa;
  }

  async actualizar(
    user: RequestUser,
    id: string,
    dto: ActualizarEmpresaDto,
  ): Promise<Empresa> {
    const empresa = await this.obtener(user, id);
    await this.empresaRepo.update(id, {
      nombre: dto.nombre?.trim() ?? empresa.nombre,
      nombreComercial: dto.nombreComercial?.trim() ?? empresa.nombreComercial,
      direccion: dto.direccion?.trim() ?? empresa.direccion,
      telefono: dto.telefono?.trim() ?? empresa.telefono,
      correo: dto.correo?.trim() ?? empresa.correo,
    });
    return this.obtener(user, id);
  }
}
