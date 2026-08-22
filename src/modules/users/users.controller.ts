import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import type { RequestUser } from '../../common/types/request-user.types';
import { CrearUsuarioEmpresaDto } from './dto/crear-usuario-empresa.dto';
import { UsersService } from './users.service';
import { UsuarioListQueryDto } from './dto/usuario-list-query.dto';

@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('usuarios', 'lectura')
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: UsuarioListQueryDto,
  ) {
    const result = await this.usersService.paginate(user, query);
    return ResponseHelper.ok(result, 'Usuarios obtenidos correctamente');
  }

  @Post()
  @RequirePermission('usuarios', 'escritura')
  async crear(
    @CurrentUser() user: RequestUser,
    @Body() dto: CrearUsuarioEmpresaDto,
  ) {
    const data = await this.usersService.crearEnEmpresa(user, dto);
    return ResponseHelper.ok(data, 'Usuario creado y asociado a la empresa');
  }

  @Get(':id/asignacion-rol')
  @RequirePermission('roles', 'especial')
  async asignacionRol(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.usersService.obtenerAsignacionRol(user, id);
    return ResponseHelper.ok(
      data,
      data ? 'Asignación obtenida' : 'El usuario no tiene rol asignado',
    );
  }
}
