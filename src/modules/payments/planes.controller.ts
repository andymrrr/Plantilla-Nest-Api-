import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AllowIncompleteSubscription } from '../../common/decorators/allow-incomplete-subscription.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import {
  ActualizarPlanDto,
  CrearPlanDto,
  PlanListQueryDto,
} from './dto/plan.dto';
import { PlanesService } from './planes.service';

@Controller('planes')
@AllowIncompleteSubscription()
export class PlanesController {
  constructor(private readonly planesService: PlanesService) {}

  @Get()
  @RequirePermission('planes', 'lectura')
  async listar(@Query() query: PlanListQueryDto) {
    const data = await this.planesService.paginar(query);
    return ResponseHelper.ok(data, 'Planes obtenidos correctamente');
  }

  @Post()
  @RequirePermission('planes', 'escritura')
  async crear(@Body() dto: CrearPlanDto) {
    const data = await this.planesService.crear(dto);
    return ResponseHelper.ok(data, 'Plan creado correctamente');
  }

  @Get(':id')
  @RequirePermission('planes', 'lectura')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.planesService.obtener(id);
    return ResponseHelper.ok(data, 'Plan obtenido correctamente');
  }

  @Patch(':id')
  @RequirePermission('planes', 'modificar')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarPlanDto,
  ) {
    const data = await this.planesService.actualizar(id, dto);
    return ResponseHelper.ok(data, 'Plan actualizado correctamente');
  }

  @Delete(':id')
  @RequirePermission('planes', 'eliminar')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.planesService.eliminar(id);
    return ResponseHelper.ok({ id }, 'Plan eliminado correctamente');
  }
}
