import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OtpModule } from '../otp/otp.module';
import { MailModule } from '../mail/mail.module';
import { PaymentsModule } from '../payments/payments.module';
import { RegisterEmailVerificationService } from './register-email-verification.service';
import { PermisosService } from './permisos.service';
import { ContextoEmpresaGuard } from './guards/contexto-empresa.guard';
import { PermisosGuard } from './guards/permisos.guard';
import { SubscriptionActiveGuard } from './guards/subscription-active.guard';
import { DesafioVerificacionRegistro } from '../database/entities/desafio-verificacion-registro.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { UsuarioEmpresa } from '../database/entities/usuario-empresa.entity';
import { UsuarioSucursalRol } from '../database/entities/usuario-sucursal-rol.entity';
import { Suscripcion } from '../database/entities/suscripcion.entity';

type JwtExpiresIn = number | `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

const parseJwtExpiresIn = (value?: string): JwtExpiresIn | undefined => {
  if (!value) {
    return undefined;
  }
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  if (/^\d+(ms|s|m|h|d|w|y)$/.test(value)) {
    return value as JwtExpiresIn;
  }
  return undefined;
};

@Module({
  imports: [
    UsersModule,
    OtpModule,
    MailModule,
    PaymentsModule,
    PassportModule,
    TypeOrmModule.forFeature([
      DesafioVerificacionRegistro,
      Usuario,
      UsuarioEmpresa,
      UsuarioSucursalRol,
      Suscripcion,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET') ?? 'secret';
        const expiresIn = parseJwtExpiresIn(
          config.get<string>('JWT_EXPIRES_IN'),
        );
        return {
          secret,
          signOptions: expiresIn ? { expiresIn } : undefined,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RegisterEmailVerificationService,
    SubscriptionActiveGuard,
    PermisosService,
    ContextoEmpresaGuard,
    PermisosGuard,
  ],
  exports: [
    AuthService,
    SubscriptionActiveGuard,
    PermisosService,
    ContextoEmpresaGuard,
    PermisosGuard,
  ],
})
export class AuthModule {}
