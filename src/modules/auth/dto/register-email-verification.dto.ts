import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RegisterEmailVerificationDto {
  @IsString()
  @IsNotEmpty()
  verificationToken!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código OTP debe tener 6 dígitos.' })
  otpCode!: string;
}
