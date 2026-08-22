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
import { CrearSucursalDto } from './dto/crear-sucursal.dto';
import { SucursalListQueryDto } from './dto/sucursal-list-query.dto';
import { SucursalesService } from './sucursales.service';

@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Get()
  @RequirePermission('sucursales', 'lectura')
  async listar(
    @CurrentUser() user: RequestUser,
    @Query() query: SucursalListQueryDto,
  ) {
    const data = await this.sucursalesService.paginate(user, query);
    return ResponseHelper.ok(data, 'Sucursales obtenidas correctamente');
  }

  @Post()
  @RequirePermission('sucursales', 'escritura')
  async crear(
    @CurrentUser() user: RequestUser,
    @Body() dto: CrearSucursalDto,
  ) {
    const data = await this.sucursalesService.crear(user, dto);
    return ResponseHelper.ok(data, 'Sucursal creada correctamente');
  }

  @Get(':id')
  @RequirePermission('sucursales', 'lectura')
  async obtener(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.sucursalesService.obtener(user, id);
    return ResponseHelper.ok(data, 'Sucursal obtenida correctamente');
  }

  @Patch(':id')
  @RequirePermission('sucursales', 'modificar')
  async actualizar(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrearSucursalDto,
  ) {
    const data = await this.sucursalesService.actualizar(user, id, dto);
    return ResponseHelper.ok(data, 'Sucursal actualizada correctamente');
  }
}
