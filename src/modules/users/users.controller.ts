import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { PaginacionDto } from '../../common/paginacion/paginacion.dto';
import { PaginacionVm } from '../../common/paginacion/paginacion.vm';
import { User } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  async list(@Query() query: PaginacionDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const result = await this.usersService.findPaginated(page, pageSize);
    const vm: PaginacionVm<User> = result;
    return ResponseHelper.ok(vm, 'Usuarios obtenidos correctamente');
  }
}
