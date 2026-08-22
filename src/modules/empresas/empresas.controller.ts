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
import { AllowIncompleteSubscription } from '../../common/decorators/allow-incomplete-subscription.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SkipEmpresaContext } from '../../common/decorators/skip-empresa-context.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import type { RequestUser } from '../../common/types/request-user.types';
import { ActualizarEmpresaDto } from './dto/actualizar-empresa.dto';
import { CrearEmpresaDto } from './dto/crear-empresa.dto';
import { EmpresaListQueryDto } from './dto/empresa-list-query.dto';
import { EmpresasService } from './empresas.service';

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get()
  @SkipEmpresaContext()
  @AllowIncompleteSubscription()
  async listar(
    @CurrentUser() user: RequestUser,
    @Query() query: EmpresaListQueryDto,
  ) {
    const data = await this.empresasService.paginate(user, query);
    return ResponseHelper.ok(data, 'Empresas obtenidas correctamente');
  }

  @Post()
  @SkipEmpresaContext()
  @AllowIncompleteSubscription()
  async crear(
    @CurrentUser() user: RequestUser,
    @Body() dto: CrearEmpresaDto,
  ) {
    const data = await this.empresasService.crear(user, dto);
    return ResponseHelper.ok(data, 'Empresa creada correctamente');
  }

  @Get(':id')
  @SkipEmpresaContext()
  @AllowIncompleteSubscription()
  async obtener(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.empresasService.obtener(user, id);
    return ResponseHelper.ok(data, 'Empresa obtenida correctamente');
  }

  @Patch(':id')
  @RequirePermission('empresas', 'modificar')
  async actualizar(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEmpresaDto,
  ) {
    const data = await this.empresasService.actualizar(user, id, dto);
    return ResponseHelper.ok(data, 'Empresa actualizada correctamente');
  }
}
