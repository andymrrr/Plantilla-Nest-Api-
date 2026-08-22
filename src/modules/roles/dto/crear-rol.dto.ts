import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PermisosModuloDto {
  @IsUUID()
  moduloId!: string;

  @IsBoolean()
  lectura!: boolean;

  @IsBoolean()
  escritura!: boolean;

  @IsBoolean()
  modificar!: boolean;

  @IsBoolean()
  eliminar!: boolean;

  @IsBoolean()
  especial!: boolean;

  @IsBoolean()
  reporte!: boolean;
}

export class CrearRolDto {
  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @MaxLength(50)
  codigo!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermisosModuloDto)
  modulos?: PermisosModuloDto[];
}
