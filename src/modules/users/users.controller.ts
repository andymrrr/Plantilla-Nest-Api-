import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { UserListQueryDto } from './dto/user-list-query.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  async list(@Query() query: UserListQueryDto) {
    const result = await this.usersService.paginate(query);
    return ResponseHelper.ok(result, 'Usuarios obtenidos correctamente');
  }
}
