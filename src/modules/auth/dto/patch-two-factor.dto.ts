import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class PatchTwoFactorDto {
  @IsBoolean()
  @IsDefined({ message: 'El campo enabled es obligatorio' })
  enabled!: boolean;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  currentPassword!: string;
}
