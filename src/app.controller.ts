import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { ResponseHelper } from './common/helpers/response.helper';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello() {
    return ResponseHelper.ok(this.appService.getHello(), 'Servicio activo');
  }
}
