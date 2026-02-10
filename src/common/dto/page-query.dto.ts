import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { SortOrder } from '../types/pagination.types';

/**
 * DTO base para listados paginados.
 * Extiéndelo en cada módulo añadiendo orderBy permitidos y filtros.
 */
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  orderBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: SortOrder = 'asc';

  @IsOptional()
  @IsString()
  search?: string;
}
