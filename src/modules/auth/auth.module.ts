import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

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
    PassportModule,
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
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
