import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginCompleteTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  twoFactorToken!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'El código debe ser de 6 dígitos' })
  otpCode!: string;
}
