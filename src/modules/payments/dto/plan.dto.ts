import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PageQueryDto } from '../../../common/dto/page-query.dto';

export class CrearPlanDto {
  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @MaxLength(30)
  codigo!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'El precio no es válido' })
  precio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  paypalPlanId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordenVisualizacion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  precioMensualCentavos?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maximoRecursos?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /** Flags de plan. El producto derivado define las claves. */
  @IsOptional()
  @IsObject()
  caracteristicas?: Record<string, boolean>;
}

export class ActualizarPlanDto extends PartialType(CrearPlanDto) {}

export class PlanListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['nombre', 'codigo', 'ordenVisualizacion', 'fechaCreacion'])
  declare orderBy?: 'nombre' | 'codigo' | 'ordenVisualizacion' | 'fechaCreacion';
}
