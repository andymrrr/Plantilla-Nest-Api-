import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesafioLoginDosFactores } from '../database/entities/desafio-login-dos-factores.entity';
import { MailModule } from '../mail/mail.module';
import { EmailOtpDeliveryService } from './email-otp-delivery.service';
import { LoginTwoFactorService } from './login-two-factor.service';

@Module({
  imports: [
    MailModule,
    TypeOrmModule.forFeature([DesafioLoginDosFactores]),
  ],
  providers: [EmailOtpDeliveryService, LoginTwoFactorService],
  exports: [LoginTwoFactorService],
})
export class OtpModule {}
