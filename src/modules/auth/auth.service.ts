import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginCompleteTwoFactorDto } from './dto/login-complete-2fa.dto';
import { PatchTwoFactorDto } from './dto/patch-two-factor.dto';
import { LoginTwoFactorService } from '../otp/login-two-factor.service';
import { RegisterEmailVerificationService } from './register-email-verification.service';
import { PermisosService } from './permisos.service';
import { PlatformSubscriptionService } from '../payments/platform-subscription.service';
import type { Usuario } from '../database/entities/usuario.entity';
import type { RequestUser } from '../../common/types/request-user.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly loginTwoFactor: LoginTwoFactorService,
    private readonly registerEmailVerification: RegisterEmailVerificationService,
    private readonly permisosService: PermisosService,
    private readonly platformSubscription: PlatformSubscriptionService,
  ) {}

  async register(dto: RegisterDto) {
    let createdUserId: string | null = null;
    try {
      const emailTrim = dto.email.trim();
      const existingUser = await this.usersService.findByEmail(emailTrim);
      if (existingUser) {
        throw new ConflictException('Ya existe un usuario con ese correo.');
      }

      const planCode = dto.planCode?.trim().toLowerCase() || null;
      if (planCode) {
        await this.platformSubscription.assertActivePlanExists(planCode);
      }

      const user = await this.usersService.create(
        emailTrim,
        dto.password,
        dto.nombre,
        dto.apellido,
        {
          correoVerificado: false,
          dosFactoresActivo: false,
          planCodigoElegido: planCode,
        },
      );
      createdUserId = user.id;

      const verification = await this.registerEmailVerification.issueForUser(user);
      return { ...verification, planCodigoElegido: planCode };
    } catch (error) {
      if (createdUserId !== null) {
        try {
          await this.usersService.deleteUserForRollback(createdUserId);
        } catch (rollbackError) {
          const reason =
            rollbackError instanceof Error
              ? rollbackError.message
              : 'Error desconocido';
          this.logger.error(
            `Registro falló y rollback falló para usuario ${createdUserId}: ${reason}`,
          );
          throw new InternalServerErrorException(
            'El registro falló y no se pudo completar la reversión automática.',
          );
        }
      }
      throw error;
    }
  }

  async verifyRegisterEmail(verificationToken: string, otpCode: string) {
    const userId = await this.registerEmailVerification.verifyAndActivate(
      verificationToken,
      otpCode,
    );
    const user = await this.usersService.findById(userId);
    return this.buildSessionResponse(user);
  }

  async resendRegisterEmailCode(verificationToken: string) {
    return this.registerEmailVerification.resend(verificationToken);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      dto.password,
      user.claveHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.correoVerificado === false) {
      return this.registerEmailVerification.issueForUser(user);
    }

    if (user.dosFactoresActivo) {
      return this.loginTwoFactor.issueEmailChallenge(user);
    }

    return this.buildSessionResponse(user);
  }

  async completeLoginTwoFactor(dto: LoginCompleteTwoFactorDto) {
    const userId = await this.loginTwoFactor.verifyAndConsumeChallenge(
      dto.twoFactorToken,
      dto.otpCode,
    );
    const user = await this.usersService.findById(userId);
    return this.buildSessionResponse(user);
  }

  async updateTwoFactorPreference(userId: string, dto: PatchTwoFactorDto) {
    const user = await this.usersService.findById(userId);
    const ok = await this.usersService.validatePassword(
      dto.currentPassword,
      user.claveHash,
    );
    if (!ok) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }
    if (dto.enabled && !user.correo?.trim()) {
      throw new BadRequestException(
        'Añade un correo electrónico a tu cuenta antes de activar el segundo factor.',
      );
    }
    await this.usersService.setTwoFactorEnabled(userId, dto.enabled);
    return { dosFactoresActivo: dto.enabled };
  }

  async me(user: RequestUser) {
    const dbUser = await this.usersService.findById(user.id);
    const membresias = await this.permisosService.listarMembresias(user.id);
    const suscripcion = user.empresaId
      ? await this.platformSubscription.getStatusForEmpresa(user.empresaId)
      : null;
    return {
      id: dbUser.id,
      email: dbUser.correo,
      nombre: dbUser.nombre,
      apellido: dbUser.apellido,
      correoVerificado: dbUser.correoVerificado,
      dosFactoresActivo: dbUser.dosFactoresActivo,
      planCodigoElegido: dbUser.planCodigoElegido,
      empresaId: user.empresaId,
      sucursalId: user.sucursalId,
      esPropietario: user.esPropietario,
      permisos: user.permisos,
      suscripcion,
      empresas: membresias.map((item) => ({
        id: item.empresa.id,
        nombre: item.empresa.nombre,
        nombreComercial: item.empresa.nombreComercial,
        esPropietario: item.esPropietario,
      })),
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  private buildSessionResponse(user: Usuario) {
    const payload = { sub: user.id, email: user.correo };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.correo,
        nombre: user.nombre,
        apellido: user.apellido,
        correoVerificado: user.correoVerificado,
        dosFactoresActivo: user.dosFactoresActivo,
        planCodigoElegido: user.planCodigoElegido,
      },
    };
  }
}
