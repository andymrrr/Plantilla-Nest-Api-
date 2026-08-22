import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { TransactionalMailService } from '../mail/transactional-mail.service';
import { generateSixDigitNumericOtp, hashOtpCode } from '../otp/otp-code.util';
import { DesafioVerificacionRegistro } from '../database/entities/desafio-verificacion-registro.entity';
import { Usuario } from '../database/entities/usuario.entity';

@Injectable()
export class RegisterEmailVerificationService {
  private readonly logger = new Logger(RegisterEmailVerificationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly transactionalMail: TransactionalMailService,
    @InjectRepository(DesafioVerificacionRegistro)
    private readonly challengeRepository: Repository<DesafioVerificacionRegistro>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  private getTtlMs(): number {
    const raw = Number(
      this.config.get<string>('AUTH_REGISTER_EMAIL_OTP_TTL_SECONDS'),
    );
    const seconds = Number.isFinite(raw) && raw > 0 ? raw : 600;
    return seconds * 1000;
  }

  private getResendMs(): number {
    const raw = Number(
      this.config.get<string>('AUTH_REGISTER_EMAIL_OTP_RESEND_SECONDS'),
    );
    const seconds = Number.isFinite(raw) && raw > 0 ? raw : 60;
    return seconds * 1000;
  }

  private getMaxAttempts(): number {
    const raw = Number(
      this.config.get<string>('AUTH_REGISTER_EMAIL_OTP_MAX_ATTEMPTS'),
    );
    return Number.isFinite(raw) && raw > 0 ? raw : 5;
  }

  private hashOtp(token: string, otpCode: string): string {
    const pepper =
      this.config.get<string>('AUTH_REGISTER_EMAIL_OTP_PEPPER') ?? '';
    return hashOtpCode(token, otpCode, pepper);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) {
      return email;
    }
    if (local.length <= 2) {
      return `${local[0] ?? '*'}***@${domain}`;
    }
    return `${local.slice(0, 2)}***@${domain}`;
  }

  private buildVerificationUrl(verificationToken: string): string {
    const base = (
      this.config.get<string>('APP_PUBLIC_URL') ?? 'http://localhost:3001'
    ).replace(/\/+$/, '');
    const query = new URLSearchParams({ token: verificationToken });
    return `${base}/register/verificar-email?${query.toString()}`;
  }

  async issueForUser(user: Pick<Usuario, 'id' | 'correo'>): Promise<{
    verificationRequired: true;
    verificationToken: string;
    expiresInSeconds: number;
    emailMasked: string;
  }> {
    const email = user.correo?.trim();
    if (!email) {
      throw new BadRequestException(
        'No se puede verificar una cuenta sin correo registrado.',
      );
    }

    await this.challengeRepository.delete({ usuarioId: user.id });
    const token = randomBytes(24).toString('hex');
    const code = generateSixDigitNumericOtp();
    const ttlMs = this.getTtlMs();
    const now = Date.now();

    const challenge = this.challengeRepository.create({
      usuarioId: user.id,
      token,
      hashOtp: this.hashOtp(token, code),
      fechaExpiracion: new Date(now + ttlMs),
      fechaUltimoEnvio: new Date(now),
      cantidadIntentos: 0,
      maxIntentos: this.getMaxAttempts(),
    });
    await this.challengeRepository.save(challenge);

    try {
      await this.transactionalMail.sendRegisterVerificationEmail(email, {
        code,
        expiresMinutes: Math.max(1, Math.ceil(ttlMs / 60000)),
        verificationUrl: this.buildVerificationUrl(token),
      });
    } catch (error) {
      await this.challengeRepository.delete({ id: challenge.id });
      const reason =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(
        `Fallo envío de correo de verificación para usuario ${user.id}: ${reason}`,
      );
      throw new ServiceUnavailableException(
        `No se pudo enviar el correo de verificación. Revisa SMTP e intenta nuevamente. Detalle: ${reason}`,
      );
    }

    return {
      verificationRequired: true,
      verificationToken: token,
      expiresInSeconds: Math.ceil(ttlMs / 1000),
      emailMasked: this.maskEmail(email),
    };
  }

  async verifyAndActivate(
    verificationTokenRaw: string,
    otpCodeRaw: string,
  ): Promise<string> {
    const token = verificationTokenRaw.trim();
    const otpCode = otpCodeRaw.trim();
    if (!token || !/^\d{6}$/.test(otpCode)) {
      throw new BadRequestException('Token o código inválido.');
    }

    const challenge = await this.challengeRepository.findOne({
      where: { token },
    });
    if (!challenge) {
      throw new UnauthorizedException(
        'Sesión de verificación inválida o expirada.',
      );
    }

    const now = Date.now();
    if (now > challenge.fechaExpiracion.getTime()) {
      await this.challengeRepository.delete({ id: challenge.id });
      throw new UnauthorizedException(
        'El código expiró. Solicita uno nuevo para continuar.',
      );
    }
    if (challenge.cantidadIntentos >= challenge.maxIntentos) {
      await this.challengeRepository.delete({ id: challenge.id });
      throw new UnauthorizedException(
        'Superaste los intentos permitidos. Solicita un nuevo código.',
      );
    }
    if (challenge.hashOtp !== this.hashOtp(token, otpCode)) {
      await this.challengeRepository.update(
        { id: challenge.id },
        { cantidadIntentos: challenge.cantidadIntentos + 1 },
      );
      throw new UnauthorizedException('Código incorrecto.');
    }

    await this.usuarioRepository.update(
      { id: challenge.usuarioId },
      { correoVerificado: true },
    );
    await this.challengeRepository.delete({ id: challenge.id });
    return challenge.usuarioId;
  }

  async resend(verificationTokenRaw: string): Promise<{
    verificationToken: string;
    expiresInSeconds: number;
  }> {
    const token = verificationTokenRaw.trim();
    if (!token) {
      throw new BadRequestException('Token de verificación inválido.');
    }

    const challenge = await this.challengeRepository.findOne({
      where: { token },
    });
    if (!challenge) {
      throw new UnauthorizedException(
        'Sesión de verificación inválida o expirada.',
      );
    }

    const user = await this.usuarioRepository.findOne({
      where: { id: challenge.usuarioId },
      select: { id: true, correo: true, correoVerificado: true },
    });
    if (!user?.correo?.trim()) {
      throw new BadRequestException(
        'No hay correo disponible para reenviar el código.',
      );
    }
    if (user.correoVerificado) {
      throw new BadRequestException('La cuenta ya fue verificada.');
    }

    const now = Date.now();
    const resendMs = this.getResendMs();
    const waitMs = resendMs - (now - challenge.fechaUltimoEnvio.getTime());
    if (waitMs > 0) {
      throw new BadRequestException(
        `Espera ${Math.ceil(waitMs / 1000)}s para reenviar el código.`,
      );
    }

    const nextCode = generateSixDigitNumericOtp();
    const ttlMs = this.getTtlMs();
    challenge.hashOtp = this.hashOtp(challenge.token, nextCode);
    challenge.fechaExpiracion = new Date(now + ttlMs);
    challenge.fechaUltimoEnvio = new Date(now);
    challenge.cantidadIntentos = 0;
    challenge.maxIntentos = this.getMaxAttempts();
    await this.challengeRepository.save(challenge);

    await this.transactionalMail.sendRegisterVerificationEmail(user.correo, {
      code: nextCode,
      expiresMinutes: Math.max(1, Math.ceil(ttlMs / 60000)),
      verificationUrl: this.buildVerificationUrl(challenge.token),
    });

    return {
      verificationToken: challenge.token,
      expiresInSeconds: Math.ceil(ttlMs / 1000),
    };
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async purgeExpiredChallenges(): Promise<void> {
    await this.challengeRepository.delete({
      fechaExpiracion: LessThan(new Date()),
    });
  }
}
