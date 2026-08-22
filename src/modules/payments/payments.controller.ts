import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowIncompleteSubscription } from '../../common/decorators/allow-incomplete-subscription.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import type { RequestUser } from '../../common/types/request-user.types';
import { PlatformSubscriptionActionDto } from './dto/platform-subscription-action.dto';
import { PlatformSubscriptionCheckoutDto } from './dto/platform-subscription-checkout.dto';
import { PlatformSubscriptionInvoicesQueryDto } from './dto/platform-subscription-invoices-query.dto';
import { PlatformSubscriptionService } from './platform-subscription.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly platformSubscription: PlatformSubscriptionService,
  ) {}

  private empresaId(user: RequestUser): string {
    if (!user.empresaId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    return user.empresaId;
  }

  @Get('platform-subscription/plans')
  @Public()
  @HttpCode(200)
  async platformSubscriptionPlans(@CurrentUser() user?: RequestUser) {
    const includeProviderRefs = user?.permisos.planes?.lectura === true;
    const data =
      await this.platformSubscription.listActivePlans(includeProviderRefs);
    return ResponseHelper.ok(data, 'Planes obtenidos correctamente');
  }

  @Get('platform-subscription')
  @AllowIncompleteSubscription()
  @RequirePermission('empresas', 'lectura')
  @HttpCode(200)
  async platformSubscriptionStatus(@CurrentUser() user: RequestUser) {
    const data = await this.platformSubscription.getStatusForEmpresa(
      this.empresaId(user),
    );
    return ResponseHelper.ok(data, 'Estado de suscripción obtenido');
  }

  @Post('platform-subscription/sync-provider')
  @AllowIncompleteSubscription()
  @RequirePermission('empresas', 'especial')
  @HttpCode(200)
  async platformSubscriptionSyncProvider(@CurrentUser() user: RequestUser) {
    const data =
      await this.platformSubscription.syncEmpresaSubscriptionFromProviderOnce(
        this.empresaId(user),
      );
    const message = data.actualizado
      ? 'Suscripción sincronizada con PayPal'
      : data.proveedorConsultado
        ? 'Consulta a PayPal realizada; el estado local no cambió'
        : 'Estado de suscripción sin cambios';
    return ResponseHelper.ok(data, message);
  }

  @Post('platform-subscription/checkout-session')
  @AllowIncompleteSubscription()
  @RequirePermission('empresas', 'escritura')
  @HttpCode(200)
  async platformSubscriptionCheckout(
    @Body() dto: PlatformSubscriptionCheckoutDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.platformSubscription.createCheckoutSession(
      this.empresaId(user),
      dto.planCode,
      dto.returnUrl,
      dto.cancelUrl,
    );
    return ResponseHelper.ok(data, 'Sesión de suscripción creada');
  }

  @Post('platform-subscription/pause')
  @AllowIncompleteSubscription()
  @RequirePermission('empresas', 'especial')
  @HttpCode(200)
  async platformSubscriptionPause(
    @Body() dto: PlatformSubscriptionActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    await this.platformSubscription.pauseSubscriptionForEmpresa(
      this.empresaId(user),
      dto.reason,
    );
    return ResponseHelper.ok(
      { actualizado: true },
      'Suscripción pausada. El estado final se confirmará por webhook.',
    );
  }

  @Post('platform-subscription/resume')
  @AllowIncompleteSubscription()
  @RequirePermission('empresas', 'especial')
  @HttpCode(200)
  async platformSubscriptionResume(
    @Body() dto: PlatformSubscriptionActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    await this.platformSubscription.resumeSubscriptionForEmpresa(
      this.empresaId(user),
      dto.reason,
    );
    return ResponseHelper.ok(
      { actualizado: true },
      'Reactivación solicitada. Esperando confirmación de PayPal.',
    );
  }

  @Post('platform-subscription/cancel')
  @AllowIncompleteSubscription()
  @RequirePermission('empresas', 'especial')
  @HttpCode(200)
  async platformSubscriptionCancel(
    @Body() dto: PlatformSubscriptionActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    await this.platformSubscription.cancelSubscriptionForEmpresa(
      this.empresaId(user),
      dto.reason,
    );
    return ResponseHelper.ok(
      { actualizado: true },
      'Cancelación solicitada. El estado final se confirmará por webhook.',
    );
  }

  @Get('platform-subscription/invoices')
  @AllowIncompleteSubscription()
  @RequirePermission('empresas', 'reporte')
  @HttpCode(200)
  async platformSubscriptionInvoices(
    @CurrentUser() user: RequestUser,
    @Query() query: PlatformSubscriptionInvoicesQueryDto,
  ) {
    const data = await this.platformSubscription.listInvoicesForEmpresa(
      this.empresaId(user),
      query.months ?? 6,
    );
    return ResponseHelper.ok(data, 'Facturas obtenidas correctamente');
  }
}
