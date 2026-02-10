import { IsIn, IsOptional } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto';

export class UserListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['email', 'firstName', 'lastName', 'createdAt'])
  declare orderBy?: 'email' | 'firstName' | 'lastName' | 'createdAt';
}
