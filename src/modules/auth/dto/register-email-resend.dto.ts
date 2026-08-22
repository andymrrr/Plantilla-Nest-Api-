import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterEmailResendDto {
  @IsString()
  @IsNotEmpty()
  verificationToken!: string;
}
