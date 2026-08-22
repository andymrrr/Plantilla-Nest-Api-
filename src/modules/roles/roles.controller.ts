import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import type { RequestUser } from '../../common/types/request-user.types';
import { AsignarRolUsuarioDto } from './dto/asignar-rol-usuario.dto';
import { CrearRolDto } from './dto/crear-rol.dto';
import { ModuloListQueryDto } from './dto/modulo-list-query.dto';
import { RolListQueryDto } from './dto/rol-list-query.dto';
import { RolesService } from './roles.service';

@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('aplicaciones')
  @RequirePermission('roles', 'lectura')
  async aplicaciones() {
    const data = await this.rolesService.listarAplicaciones();
    return ResponseHelper.ok(data, 'Aplicaciones obtenidas correctamente');
  }

  @Get('modulos')
  @RequirePermission('roles', 'lectura')
  async modulos(@Query() query: ModuloListQueryDto) {
    const data = await this.rolesService.paginarModulos(query);
    return ResponseHelper.ok(data, 'Módulos obtenidos correctamente');
  }

  @Get('roles')
  @RequirePermission('roles', 'lectura')
  async listar(
    @CurrentUser() user: RequestUser,
    @Query() query: RolListQueryDto,
  ) {
    const data = await this.rolesService.paginate(user, query);
    return ResponseHelper.ok(data, 'Roles obtenidos correctamente');
  }

  @Post('roles')
  @RequirePermission('roles', 'escritura')
  async crear(@CurrentUser() user: RequestUser, @Body() dto: CrearRolDto) {
    const data = await this.rolesService.crear(user, dto);
    return ResponseHelper.ok(data, 'Rol creado correctamente');
  }

  @Get('roles/:id')
  @RequirePermission('roles', 'lectura')
  async obtener(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.rolesService.obtener(user, id);
    return ResponseHelper.ok(data, 'Rol obtenido correctamente');
  }

  @Patch('roles/:id')
  @RequirePermission('roles', 'modificar')
  async actualizar(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrearRolDto,
  ) {
    const data = await this.rolesService.actualizar(user, id, dto);
    return ResponseHelper.ok(data, 'Rol actualizado correctamente');
  }

  @Post('roles/asignaciones')
  @RequirePermission('roles', 'especial')
  async asignar(
    @CurrentUser() user: RequestUser,
    @Body() dto: AsignarRolUsuarioDto,
  ) {
    const result = await this.rolesService.asignarUsuario(user, dto);
    return ResponseHelper.ok(
      result.asignacion,
      result.actualizado ? 'Rol actualizado' : 'Rol asignado al usuario',
    );
  }
}
