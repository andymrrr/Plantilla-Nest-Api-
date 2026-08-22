import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ILike, In, Repository } from 'typeorm';
import { buildTypeOrmPaginationArgs } from '../../common/utils/pagination';
import { createPaginationResult } from '../../common/types/pagination.types';
import type { PaginationResult } from '../../common/types/pagination.types';
import type { RequestUser } from '../../common/types/request-user.types';
import { withWhereExtras } from '../../common/utils/empresa-scope';
import { Rol } from '../database/entities/rol.entity';
import { Sucursal } from '../database/entities/sucursal.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { UsuarioEmpresa } from '../database/entities/usuario-empresa.entity';
import { UsuarioSucursalRol } from '../database/entities/usuario-sucursal-rol.entity';
import {
  resumenAsignacionRol,
  type AsignacionRolResumen,
} from '../roles/asignacion-rol.util';
import { CrearUsuarioEmpresaDto } from './dto/crear-usuario-empresa.dto';
import { UsuarioListQueryDto } from './dto/usuario-list-query.dto';

export interface CrearUsuarioOpciones {
  correoVerificado?: boolean;
  dosFactoresActivo?: boolean;
  planCodigoElegido?: string | null;
}

export type UsuarioListadoItem = Omit<Usuario, 'claveHash'> & {
  asignacionRol: AsignacionRolResumen | null;
  rolNombre: string | null;
  sucursalNombre: string | null;
  esPropietario: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(UsuarioEmpresa)
    private readonly usuarioEmpresaRepo: Repository<UsuarioEmpresa>,
  ) {}

  async create(
    correo: string,
    password: string,
    nombre: string,
    apellido: string,
    opciones: CrearUsuarioOpciones = {},
  ): Promise<Usuario> {
    const claveHash = await bcrypt.hash(password, 10);
    const usuario = this.usuarioRepo.create({
      correo,
      claveHash,
      nombre,
      apellido,
      correoVerificado: opciones.correoVerificado ?? false,
      dosFactoresActivo: opciones.dosFactoresActivo ?? false,
      planCodigoElegido: opciones.planCodigoElegido ?? null,
    });
    return this.usuarioRepo.save(usuario);
  }

  async findByEmail(correo: string): Promise<Usuario | null> {
    return this.usuarioRepo.findOne({ where: { correo } });
  }

  async findById(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return usuario;
  }

  async setTwoFactorEnabled(usuarioId: string, enabled: boolean): Promise<void> {
    await this.usuarioRepo.update(
      { id: usuarioId },
      { dosFactoresActivo: enabled },
    );
  }

  async deleteUserForRollback(usuarioId: string): Promise<void> {
    await this.usuarioRepo.delete({ id: usuarioId });
  }

  async paginate(
    user: RequestUser,
    query: UsuarioListQueryDto,
  ): Promise<PaginationResult<UsuarioListadoItem>> {
    if (!user.empresaId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    const membresias = await this.usuarioEmpresaRepo.find({
      where: { empresaId: user.empresaId, activo: true },
      relations: { sucursalesRoles: { rol: true, sucursal: true } },
    });
    const usuarioIds = membresias.map((item) => item.usuarioId);
    const membresiaPorUsuario = new Map(
      membresias.map((item) => [item.usuarioId, item]),
    );
    const asignacionPorUsuario = new Map(
      membresias.map((item) => [
        item.usuarioId,
        resumenAsignacionRol(item.sucursalesRoles ?? []),
      ]),
    );
    const args = buildTypeOrmPaginationArgs<Usuario>(query, {
      searchableFields: ['correo', 'nombre', 'apellido'],
      defaultOrderBy: 'fechaCreacion',
    });
    if (usuarioIds.length === 0) {
      return createPaginationResult([], args.page, args.limit, 0);
    }
    const [items, total] = await this.usuarioRepo.findAndCount({
      where: withWhereExtras(args.where, { id: In(usuarioIds) }),
      skip: args.skip,
      take: args.take,
      order: args.order as { [key: string]: 'ASC' | 'DESC' },
    });
    const listado = items.map((item) => {
      const membresia = membresiaPorUsuario.get(item.id);
      return this.toListadoItem(item, {
        esPropietario: membresia?.esPropietario ?? false,
        asignacionRol: asignacionPorUsuario.get(item.id) ?? null,
      });
    });
    return createPaginationResult(listado, args.page, args.limit, total);
  }

  async crearEnEmpresa(
    user: RequestUser,
    dto: CrearUsuarioEmpresaDto,
  ): Promise<UsuarioListadoItem> {
    if (!user.empresaId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    const empresaId = user.empresaId;
    const correo = dto.correo.trim().toLowerCase();
    const claveHash = await bcrypt.hash(dto.password, 10);

    return this.usuarioRepo.manager.transaction(async (manager) => {
      const usuarioRepo = manager.getRepository(Usuario);
      const membresiaRepo = manager.getRepository(UsuarioEmpresa);
      const rolRepo = manager.getRepository(Rol);
      const sucursalRepo = manager.getRepository(Sucursal);
      const asignacionRepo = manager.getRepository(UsuarioSucursalRol);

      const existente = await usuarioRepo.findOne({
        where: { correo: ILike(correo) },
      });
      if (existente) {
        throw new ConflictException('Ya existe una cuenta con ese correo.');
      }

      const rol = await rolRepo.findOne({
        where: { id: dto.rolId, empresaId, activo: true },
      });
      if (!rol) {
        throw new BadRequestException('Rol no encontrado en la empresa activa.');
      }

      let sucursal: Sucursal | null = null;
      if (dto.sucursalId) {
        sucursal = await sucursalRepo.findOne({
          where: { id: dto.sucursalId, empresaId },
        });
        if (!sucursal) {
          throw new BadRequestException(
            'Sucursal no encontrada en la empresa activa.',
          );
        }
      }

      const usuario = await usuarioRepo.save(
        usuarioRepo.create({
          correo,
          claveHash,
          nombre: dto.nombre.trim(),
          apellido: dto.apellido.trim(),
          correoVerificado: true,
          dosFactoresActivo: false,
        }),
      );

      const membresia = await membresiaRepo.save(
        membresiaRepo.create({
          usuarioId: usuario.id,
          empresaId,
          esPropietario: false,
          activo: true,
        }),
      );

      const asignacion = await asignacionRepo.save(
        asignacionRepo.create({
          usuarioEmpresaId: membresia.id,
          sucursalId: sucursal?.id ?? null,
          rolId: rol.id,
          activo: true,
        }),
      );

      return this.toListadoItem(usuario, {
        esPropietario: false,
        asignacionRol: {
          id: asignacion.id,
          rolId: rol.id,
          rolCodigo: rol.codigo,
          rolNombre: rol.nombre,
          sucursalId: sucursal?.id ?? null,
          sucursalNombre: sucursal?.nombre ?? null,
        },
      });
    });
  }

  async obtenerAsignacionRol(
    user: RequestUser,
    usuarioId: string,
  ): Promise<AsignacionRolResumen | null> {
    if (!user.empresaId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    const membresia = await this.usuarioEmpresaRepo.findOne({
      where: { usuarioId, empresaId: user.empresaId, activo: true },
      relations: { sucursalesRoles: { rol: true, sucursal: true } },
    });
    if (!membresia) {
      throw new NotFoundException('El usuario no pertenece a la empresa activa.');
    }
    return resumenAsignacionRol(membresia.sucursalesRoles ?? []);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private toListadoItem(
    usuario: Usuario,
    opciones: {
      esPropietario: boolean;
      asignacionRol: AsignacionRolResumen | null;
    },
  ): UsuarioListadoItem {
    const { claveHash: _omit, ...resto } = usuario;
    return {
      ...resto,
      asignacionRol: opciones.asignacionRol,
      rolNombre: opciones.asignacionRol?.rolNombre ?? null,
      sucursalNombre: opciones.asignacionRol?.sucursalNombre ?? null,
      esPropietario: opciones.esPropietario,
    };
  }
}
