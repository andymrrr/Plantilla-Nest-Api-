import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { DesafioLoginDosFactores } from '../database/entities/desafio-login-dos-factores.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { EmailOtpDeliveryService } from './email-otp-delivery.service';
import { generateSixDigitNumericOtp, hashOtpCode } from './otp-code.util';

@Injectable()
export class LoginTwoFactorService {
  private readonly logger = new Logger(LoginTwoFactorService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly emailOtpDelivery: EmailOtpDeliveryService,
    @InjectRepository(DesafioLoginDosFactores)
    private readonly challengeRepo: Repository<DesafioLoginDosFactores>,
  ) {}

  private getTtlMs(): number {
    const raw = Number(this.config.get<string>('AUTH_LOGIN_2FA_OTP_TTL_SECONDS'));
    const seconds = Number.isFinite(raw) && raw > 0 ? raw : 600;
    return seconds * 1000;
  }

  private getMaxAttempts(): number {
    const raw = Number(this.config.get<string>('AUTH_LOGIN_2FA_MAX_ATTEMPTS'));
    return Number.isFinite(raw) && raw > 0 ? raw : 5;
  }

  private hashOtp(token: string, otpCode: string): string {
    const pepper = this.config.get<string>('AUTH_LOGIN_2FA_OTP_PEPPER') ?? '';
    return hashOtpCode(token, otpCode, pepper);
  }

  async issueEmailChallenge(user: Pick<Usuario, 'id' | 'correo'>): Promise<{
    twoFactorRequired: true;
    twoFactorToken: string;
    expiresInSeconds: number;
  }> {
    if (!user.correo?.trim()) {
      throw new BadRequestException(
        'Tu cuenta no tiene correo registrado. No se puede usar el segundo factor por email.',
      );
    }
    await this.challengeRepo.delete({ usuarioId: user.id });

    const token = randomBytes(24).toString('hex');
    const code = generateSixDigitNumericOtp();
    const ttlMs = this.getTtlMs();
    const now = Date.now();
    const row = this.challengeRepo.create({
      usuarioId: user.id,
      token,
      hashOtp: this.hashOtp(token, code),
      fechaExpiracion: new Date(now + ttlMs),
      cantidadIntentos: 0,
      maxIntentos: this.getMaxAttempts(),
    });
    await this.challengeRepo.save(row);

    try {
      await this.emailOtpDelivery.sendLoginTwoFactorCode(
        user.correo,
        code,
        Math.ceil(ttlMs / 60000),
      );
    } catch (e) {
      await this.challengeRepo.delete({ id: row.id });
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`No se pudo enviar OTP 2FA: ${msg}`);
      throw e;
    }

    return {
      twoFactorRequired: true,
      twoFactorToken: token,
      expiresInSeconds: Math.ceil(ttlMs / 1000),
    };
  }

  async verifyAndConsumeChallenge(
    twoFactorTokenRaw: string,
    otpCodeRaw: string,
  ): Promise<string> {
    const token = twoFactorTokenRaw.trim();
    const otpCode = otpCodeRaw.trim();
    if (!token || !/^\d{6}$/.test(otpCode)) {
      throw new BadRequestException('Token o código inválido');
    }
    const row = await this.challengeRepo.findOne({ where: { token } });
    if (!row) {
      throw new UnauthorizedException('Sesión de verificación inválida o expirada');
    }
    const now = Date.now();
    if (now > row.fechaExpiracion.getTime()) {
      await this.challengeRepo.delete({ id: row.id });
      throw new UnauthorizedException('El código expiró. Inicia sesión de nuevo.');
    }
    if (row.cantidadIntentos >= row.maxIntentos) {
      await this.challengeRepo.delete({ id: row.id });
      throw new UnauthorizedException(
        'Demasiados intentos fallidos. Inicia sesión de nuevo.',
      );
    }
    if (row.hashOtp !== this.hashOtp(token, otpCode)) {
      await this.challengeRepo.update(
        { id: row.id },
        { cantidadIntentos: row.cantidadIntentos + 1 },
      );
      throw new UnauthorizedException('Código incorrecto');
    }
    const usuarioId = row.usuarioId;
    await this.challengeRepo.delete({ id: row.id });
    return usuarioId;
  }
}
