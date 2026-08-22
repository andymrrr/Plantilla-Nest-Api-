import { IsOptional, IsUUID } from 'class-validator';

export class AsignarRolUsuarioDto {
  @IsUUID()
  usuarioId!: string;

  @IsUUID()
  rolId!: string;

  @IsOptional()
  @IsUUID()
  sucursalId?: string;
}
