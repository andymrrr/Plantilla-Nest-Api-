import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RequestUser } from '../../common/types/request-user.types';
import { createPaginationResult } from '../../common/types/pagination.types';
import type { PaginationResult } from '../../common/types/pagination.types';
import { buildTypeOrmPaginationArgs } from '../../common/utils/pagination';
import { withEmpresaId } from '../../common/utils/empresa-scope';
import { Sucursal } from '../database/entities/sucursal.entity';
import { CrearSucursalDto } from './dto/crear-sucursal.dto';
import { SucursalListQueryDto } from './dto/sucursal-list-query.dto';

@Injectable()
export class SucursalesService {
  constructor(
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
  ) {}

  private empresaId(user: RequestUser): string {
    if (!user.empresaId) {
      throw new NotFoundException('No hay empresa activa en el contexto.');
    }
    return user.empresaId;
  }

  async paginate(
    user: RequestUser,
    query: SucursalListQueryDto,
  ): Promise<PaginationResult<Sucursal>> {
    const empresaId = this.empresaId(user);
    const args = buildTypeOrmPaginationArgs<Sucursal>(query, {
      searchableFields: ['nombre', 'codigo'],
      defaultOrderBy: 'fechaCreacion',
    });
    const [items, total] = await this.sucursalRepo.findAndCount({
      where: withEmpresaId(args.where, empresaId),
      skip: args.skip,
      take: args.take,
      order: args.order as { [key: string]: 'ASC' | 'DESC' },
    });
    return createPaginationResult(items, args.page, args.limit, total);
  }

  async crear(user: RequestUser, dto: CrearSucursalDto): Promise<Sucursal> {
    const empresaId = this.empresaId(user);
    const duplicado = await this.sucursalRepo.findOne({
      where: { empresaId, codigo: dto.codigo.trim() },
    });
    if (duplicado) {
      throw new ConflictException(
        'Ya existe una sucursal con ese código en la empresa.',
      );
    }
    return this.sucursalRepo.save(
      this.sucursalRepo.create({
        empresaId,
        codigo: dto.codigo.trim(),
        nombre: dto.nombre.trim(),
        direccion: dto.direccion?.trim() ?? null,
        telefono: dto.telefono?.trim() ?? null,
        esPrincipal: dto.esPrincipal ?? false,
      }),
    );
  }

  async obtener(user: RequestUser, id: string): Promise<Sucursal> {
    const sucursal = await this.sucursalRepo.findOne({
      where: { id, empresaId: this.empresaId(user) },
    });
    if (!sucursal) {
      throw new NotFoundException('Sucursal no encontrada');
    }
    return sucursal;
  }

  async actualizar(
    user: RequestUser,
    id: string,
    dto: Partial<CrearSucursalDto>,
  ): Promise<Sucursal> {
    const sucursal = await this.obtener(user, id);
    await this.sucursalRepo.update(id, {
      codigo: dto.codigo?.trim() ?? sucursal.codigo,
      nombre: dto.nombre?.trim() ?? sucursal.nombre,
      direccion: dto.direccion?.trim() ?? sucursal.direccion,
      telefono: dto.telefono?.trim() ?? sucursal.telefono,
      esPrincipal: dto.esPrincipal ?? sucursal.esPrincipal,
    });
    return this.obtener(user, id);
  }
}
