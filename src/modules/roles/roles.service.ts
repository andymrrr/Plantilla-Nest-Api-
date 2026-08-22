import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { RequestUser } from '../../common/types/request-user.types';
import { createPaginationResult } from '../../common/types/pagination.types';
import type { PaginationResult } from '../../common/types/pagination.types';
import { buildTypeOrmPaginationArgs } from '../../common/utils/pagination';
import { withWhereExtras } from '../../common/utils/empresa-scope';
import { Aplicacion } from '../database/entities/aplicacion.entity';
import { Modulo } from '../database/entities/modulo.entity';
import { Rol } from '../database/entities/rol.entity';
import { RolModulo } from '../database/entities/rol-modulo.entity';
import { UsuarioEmpresa } from '../database/entities/usuario-empresa.entity';
import { UsuarioSucursalRol } from '../database/entities/usuario-sucursal-rol.entity';
import { CrearRolDto, PermisosModuloDto } from './dto/crear-rol.dto';
import { ModuloListQueryDto } from './dto/modulo-list-query.dto';
import { RolListQueryDto } from './dto/rol-list-query.dto';
import { AsignarRolUsuarioDto } from './dto/asignar-rol-usuario.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(RolModulo)
    private readonly rolModuloRepo: Repository<RolModulo>,
    @InjectRepository(Aplicacion)
    private readonly aplicacionRepo: Repository<Aplicacion>,
    @InjectRepository(Modulo)
    private readonly moduloRepo: Repository<Modulo>,
    @InjectRepository(UsuarioEmpresa)
    private readonly usuarioEmpresaRepo: Repository<UsuarioEmpresa>,
    @InjectRepository(UsuarioSucursalRol)
    private readonly usuarioSucursalRolRepo: Repository<UsuarioSucursalRol>,
  ) {}

  private empresaId(user: RequestUser): string {
    if (!user.empresaId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    return user.empresaId;
  }

  async listarAplicaciones(): Promise<Aplicacion[]> {
    return this.aplicacionRepo.find({
      where: { activo: true },
      relations: { modulos: true },
      order: { codigo: 'ASC' },
    });
  }

  async paginarModulos(
    query: ModuloListQueryDto,
  ): Promise<PaginationResult<Modulo>> {
    const args = buildTypeOrmPaginationArgs<Modulo>(query, {
      searchableFields: ['codigo', 'nombre'],
      defaultOrderBy: 'codigo',
    });
    const [items, total] = await this.moduloRepo.findAndCount({
      where: withWhereExtras(args.where, { activo: true }),
      relations: { aplicacion: true },
      skip: args.skip,
      take: args.take,
      order: args.order,
    });
    return createPaginationResult(items, args.page, args.limit, total);
  }

  async paginate(
    user: RequestUser,
    query: RolListQueryDto,
  ): Promise<PaginationResult<Rol>> {
    const empresaId = this.empresaId(user);
    const args = buildTypeOrmPaginationArgs<Rol>(query, {
      searchableFields: ['nombre', 'codigo'],
      defaultOrderBy: 'nombre',
    });
    const where = Array.isArray(args.where)
      ? args.where.map((clause) => ({ ...clause, empresaId }))
      : { ...args.where, empresaId };
    const [items, total] = await this.rolRepo.findAndCount({
      where,
      relations: { rolesModulos: { modulo: true } },
      skip: args.skip,
      take: args.take,
      order: args.order as { [key: string]: 'ASC' | 'DESC' },
    });
    return createPaginationResult(items, args.page, args.limit, total);
  }

  async crear(user: RequestUser, dto: CrearRolDto): Promise<Rol> {
    const empresaId = this.empresaId(user);
    const duplicado = await this.rolRepo.findOne({
      where: { empresaId, codigo: dto.codigo.trim() },
    });
    if (duplicado) {
      throw new ConflictException('Ya existe un rol con ese código.');
    }
    const rol = await this.rolRepo.save(
      this.rolRepo.create({
        empresaId,
        codigo: dto.codigo.trim().toUpperCase(),
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() ?? null,
        esSistema: false,
        activo: true,
      }),
    );
    if (dto.modulos?.length) {
      await this.guardarPermisos(rol.id, dto.modulos);
    }
    return this.obtener(user, rol.id);
  }

  async obtener(user: RequestUser, id: string): Promise<Rol> {
    const rol = await this.rolRepo.findOne({
      where: { id, empresaId: this.empresaId(user) },
      relations: { rolesModulos: { modulo: true } },
    });
    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }
    return rol;
  }

  async actualizar(
    user: RequestUser,
    id: string,
    dto: CrearRolDto,
  ): Promise<Rol> {
    const rol = await this.obtener(user, id);
    await this.rolRepo.update(id, {
      codigo: dto.codigo?.trim().toUpperCase() ?? rol.codigo,
      nombre: dto.nombre?.trim() ?? rol.nombre,
      descripcion: dto.descripcion?.trim() ?? rol.descripcion,
    });
    if (dto.modulos) {
      await this.rolModuloRepo.delete({ rolId: id });
      await this.guardarPermisos(id, dto.modulos);
    }
    return this.obtener(user, id);
  }

  async asignarUsuario(
    user: RequestUser,
    dto: AsignarRolUsuarioDto,
  ): Promise<{ asignacion: UsuarioSucursalRol; actualizado: boolean }> {
    const empresaId = this.empresaId(user);
    const rol = await this.obtener(user, dto.rolId);
    const membresia = await this.usuarioEmpresaRepo.findOne({
      where: { usuarioId: dto.usuarioId, empresaId, activo: true },
    });
    if (!membresia) {
      throw new BadRequestException(
        'El usuario no pertenece a la empresa activa.',
      );
    }
    const actuales = await this.usuarioSucursalRolRepo.find({
      where: { usuarioEmpresaId: membresia.id, activo: true },
    });
    const principal =
      actuales.find((item) => item.sucursalId == null) ?? actuales[0];
    if (!principal) {
      const creada = await this.usuarioSucursalRolRepo.save(
        this.usuarioSucursalRolRepo.create({
          usuarioEmpresaId: membresia.id,
          sucursalId: dto.sucursalId ?? null,
          rolId: rol.id,
          activo: true,
        }),
      );
      return { asignacion: creada, actualizado: false };
    }
    principal.rolId = rol.id;
    principal.sucursalId = dto.sucursalId ?? null;
    principal.activo = true;
    const actualizada = await this.usuarioSucursalRolRepo.save(principal);
    const extras = actuales.filter((item) => item.id !== principal.id);
    if (extras.length > 0) {
      await this.usuarioSucursalRolRepo.update(
        { id: In(extras.map((item) => item.id)) },
        { activo: false },
      );
    }
    return { asignacion: actualizada, actualizado: true };
  }

  private async guardarPermisos(
    rolId: string,
    modulos: PermisosModuloDto[],
  ): Promise<void> {
    const ids = modulos.map((item) => item.moduloId);
    const existentes = await this.moduloRepo.find({
      where: { id: In(ids), activo: true },
    });
    if (existentes.length !== ids.length) {
      throw new BadRequestException('Uno o más módulos no existen o están inactivos.');
    }
    await this.rolModuloRepo.save(
      modulos.map((item) =>
        this.rolModuloRepo.create({
          rolId,
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
  }
}
