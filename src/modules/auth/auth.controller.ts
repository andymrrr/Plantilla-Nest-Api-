import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterEmailVerificationDto } from './dto/register-email-verification.dto';
import { RegisterEmailResendDto } from './dto/register-email-resend.dto';
import { LoginCompleteTwoFactorDto } from './dto/login-complete-2fa.dto';
import { PatchTwoFactorDto } from './dto/patch-two-factor.dto';
import { AllowIncompleteSubscription } from '../../common/decorators/allow-incomplete-subscription.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipEmpresaContext } from '../../common/decorators/skip-empresa-context.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import type { RequestUser } from '../../common/types/request-user.types';

@Controller('auth')
@SkipEmpresaContext()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @AllowIncompleteSubscription()
  async me(@CurrentUser() user: RequestUser) {
    const data = await this.authService.me(user);
    return ResponseHelper.ok(data, 'Perfil obtenido correctamente');
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return ResponseHelper.ok(
      result,
      'Cuenta creada. Revisa tu correo para verificarla.',
    );
  }

  @Public()
  @Post('register/verify-email')
  async verifyRegisterEmail(@Body() dto: RegisterEmailVerificationDto) {
    const result = await this.authService.verifyRegisterEmail(
      dto.verificationToken,
      dto.otpCode,
    );
    return ResponseHelper.ok(result, 'Correo verificado. Cuenta activada.');
  }

  @Public()
  @Post('register/resend-email-code')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async resendRegisterEmailCode(@Body() dto: RegisterEmailResendDto) {
    const result = await this.authService.resendRegisterEmailCode(
      dto.verificationToken,
    );
    return ResponseHelper.ok(result, 'Código reenviado al correo.');
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    const msg =
      'twoFactorRequired' in result && result.twoFactorRequired
        ? 'Contraseña correcta. Revisa tu correo para el código de verificación.'
        : 'verificationRequired' in result && result.verificationRequired
          ? 'Tu cuenta aún no está verificada. Te enviamos un nuevo código al correo.'
          : 'Login correcto';
    return ResponseHelper.ok(result, msg);
  }

  @Public()
  @Post('login/complete-2fa')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async completeLoginTwoFactor(@Body() dto: LoginCompleteTwoFactorDto) {
    const result = await this.authService.completeLoginTwoFactor(dto);
    return ResponseHelper.ok(result, 'Login correcto');
  }

  @Patch('me/two-factor')
  @AllowIncompleteSubscription()
  async patchTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body() dto: PatchTwoFactorDto,
  ) {
    const data = await this.authService.updateTwoFactorPreference(user.id, dto);
    return ResponseHelper.ok(data, 'Preferencia de segundo factor actualizada');
  }
}
