import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionalMailService } from '../mail/transactional-mail.service';
import { Empresa } from '../database/entities/empresa.entity';
import { EstadoSuscripcionPlataforma } from '../database/entities/estado-suscripcion-plataforma.enum';
import { EstadoSuscripcionProveedor } from '../database/entities/estado-suscripcion-proveedor.enum';
import { Plan } from '../database/entities/plan.entity';
import { Suscripcion } from '../database/entities/suscripcion.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { PaypalBillingService } from './paypal-billing.service';
import type {
  EstadoSuscripcionDto,
  FilaFacturaSuscripcion,
  ItemPlanSuscripcion,
  ResultadoSincronizacionProveedor,
} from './platform-subscription.types';

@Injectable()
export class PlatformSubscriptionService {
  private readonly logger = new Logger(PlatformSubscriptionService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Suscripcion)
    private readonly suscripcionRepo: Repository<Suscripcion>,
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly paypalBillingService: PaypalBillingService,
    private readonly transactionalMail: TransactionalMailService,
  ) {}

  async assertActivePlanExists(planCode: string): Promise<void> {
    await this.requirePlanByCodeOrDefault(planCode);
  }

  async listActivePlans(incluirRefsProveedor = false): Promise<ItemPlanSuscripcion[]> {
    const plans = await this.planRepository.find({
      where: { activo: true },
      order: { ordenVisualizacion: 'ASC', fechaCreacion: 'ASC' },
    });
    return plans.map((plan) => ({
      id: plan.id,
      codigo: plan.codigo,
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      ordenVisualizacion: plan.ordenVisualizacion,
      precioMensualCentavos: plan.precioMensualCentavos,
      maximoRecursos: plan.maximoRecursos,
      ...(incluirRefsProveedor ? { paypalPlanId: plan.paypalPlanId } : {}),
    }));
  }

  async getStatusForEmpresa(empresaId: string): Promise<EstadoSuscripcionDto> {
    const suscripcion = await this.suscripcionRepo.findOne({
      where: { empresaId },
      relations: { plan: true },
      order: { fechaCreacion: 'DESC' },
    });
    return this.toStatusDto(suscripcion);
  }

  async bootstrapEmpresaSubscription(
    empresaId: string,
    planCode?: string | null,
  ): Promise<void> {
    const empresa = await this.empresaRepo.findOne({ where: { id: empresaId } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }
    const plan = await this.requirePlanByCodeOrDefault(planCode?.trim() || '');
    const existente = await this.suscripcionRepo.findOne({
      where: { empresaId },
      order: { fechaCreacion: 'DESC' },
    });
    if (existente) {
      await this.suscripcionRepo.update(existente.id, {
        planId: plan.id,
        estadoPlataforma: EstadoSuscripcionPlataforma.INCOMPLETA,
        estadoProveedor: EstadoSuscripcionProveedor.PENDIENTE,
      });
      return;
    }
    await this.suscripcionRepo.save(
      this.suscripcionRepo.create({
        empresaId,
        planId: plan.id,
        fechaInicio: new Date(),
        estadoPlataforma: EstadoSuscripcionPlataforma.INCOMPLETA,
        estadoProveedor: EstadoSuscripcionProveedor.PENDIENTE,
        moneda: 'USD',
        metadatos: { etapa: 'alta_empresa' },
      }),
    );
  }

  async createCheckoutSession(
    empresaId: string,
    planCode?: string | null,
    returnUrl?: string | null,
    cancelUrl?: string | null,
  ): Promise<{ url: string }> {
    const plan = await this.resolveCheckoutPlan(empresaId, planCode);
    if (!plan.paypalPlanId) {
      throw new BadRequestException(
        `El plan ${plan.codigo} no tiene paypalPlanId configurado.`,
      );
    }
    const paypalCheckout =
      await this.paypalBillingService.createSubscriptionApproval({
        planId: plan.paypalPlanId,
        returnUrl: this.resolveAbsoluteFrontendUrl(returnUrl, '/dashboard/suscripcion'),
        cancelUrl: this.resolveAbsoluteFrontendUrl(cancelUrl, '/dashboard/suscripcion'),
        customId: empresaId,
      });

    const existente = await this.suscripcionRepo.findOne({
      where: { empresaId },
      order: { fechaCreacion: 'DESC' },
    });
    const metadatos = {
      ...(existente?.metadatos ?? {}),
      etapa: 'checkout_creado',
    };
    if (existente) {
      await this.suscripcionRepo.update(existente.id, {
        planId: plan.id,
        paypalSubscriptionId: paypalCheckout.providerSubscriptionId,
        estadoProveedor: EstadoSuscripcionProveedor.PENDIENTE,
        estadoPlataforma: EstadoSuscripcionPlataforma.INCOMPLETA,
        metadatos,
      });
      return { url: paypalCheckout.approvalUrl };
    }
    await this.suscripcionRepo.save(
      this.suscripcionRepo.create({
        empresaId,
        planId: plan.id,
        paypalSubscriptionId: paypalCheckout.providerSubscriptionId,
        fechaInicio: new Date(),
        estadoProveedor: EstadoSuscripcionProveedor.PENDIENTE,
        estadoPlataforma: EstadoSuscripcionPlataforma.INCOMPLETA,
        moneda: 'USD',
        metadatos,
      }),
    );
    return { url: paypalCheckout.approvalUrl };
  }

  async syncEmpresaSubscriptionFromProviderOnce(
    empresaId: string,
  ): Promise<ResultadoSincronizacionProveedor> {
    const suscripcion = await this.requireEmpresaLatest(empresaId);
    const dto = this.toStatusDto(suscripcion);
    if (this.esOperativa(suscripcion)) {
      return { ...dto, proveedorConsultado: false, actualizado: false };
    }
    if (!suscripcion.paypalSubscriptionId) {
      return { ...dto, proveedorConsultado: false, actualizado: false };
    }
    const previous = suscripcion.metadatos ?? {};
    if (
      typeof previous.intentoSincronizacionProveedorEn === 'string' &&
      previous.intentoSincronizacionProveedorEn.trim().length > 0
    ) {
      return { ...dto, proveedorConsultado: false, actualizado: false };
    }
    await this.suscripcionRepo.update(suscripcion.id, {
      metadatos: {
        ...previous,
        intentoSincronizacionProveedorEn: new Date().toISOString(),
      },
    });
    const paypalDetails = await this.paypalBillingService.getSubscriptionDetails(
      suscripcion.paypalSubscriptionId,
    );
    const mapped = this.mapPaypalProviderStatus(paypalDetails.status);
    if (!mapped) {
      return {
        ...this.toStatusDto(await this.requireEmpresaLatest(empresaId)),
        proveedorConsultado: true,
        actualizado: false,
      };
    }
    const wasOperational = this.esOperativa(suscripcion);
    await this.applyPaypalUpdate(suscripcion.id, {
      id: paypalDetails.id,
      status: paypalDetails.status,
      plan_id: paypalDetails.plan_id,
      billing_info: paypalDetails.billing_info,
    }, mapped, {
      ultimaSincronizacionProveedorEn: new Date().toISOString(),
    });
    const refreshed = await this.requireEmpresaLatest(empresaId);
    return {
      ...this.toStatusDto(refreshed),
      proveedorConsultado: true,
      actualizado: !wasOperational && this.esOperativa(refreshed),
    };
  }

  async pauseSubscriptionForEmpresa(empresaId: string, reason?: string | null) {
    const suscripcion = await this.requireEmpresaLatest(empresaId);
    if (!suscripcion.paypalSubscriptionId) {
      throw new BadRequestException(
        'No se encontró un identificador de suscripción en el proveedor.',
      );
    }
    await this.paypalBillingService.suspendSubscription(
      suscripcion.paypalSubscriptionId,
      { reason: reason?.trim() || undefined },
    );
    await this.suscripcionRepo.update(suscripcion.id, {
      metadatos: {
        ...(suscripcion.metadatos ?? {}),
        ultimaAccionManual: 'suspender',
        ultimaAccionManualEn: new Date().toISOString(),
      },
    });
  }

  async resumeSubscriptionForEmpresa(empresaId: string, reason?: string | null) {
    const suscripcion = await this.requireEmpresaLatest(empresaId);
    if (!suscripcion.paypalSubscriptionId) {
      throw new BadRequestException(
        'No se encontró un identificador de suscripción en el proveedor.',
      );
    }
    await this.paypalBillingService.activateSubscription(
      suscripcion.paypalSubscriptionId,
      { reason: reason?.trim() || undefined },
    );
    await this.suscripcionRepo.update(suscripcion.id, {
      metadatos: {
        ...(suscripcion.metadatos ?? {}),
        ultimaAccionManual: 'reactivar',
        ultimaAccionManualEn: new Date().toISOString(),
      },
    });
  }

  async cancelSubscriptionForEmpresa(empresaId: string, reason?: string | null) {
    const suscripcion = await this.requireEmpresaLatest(empresaId);
    if (!suscripcion.paypalSubscriptionId) {
      throw new BadRequestException(
        'No se encontró un identificador de suscripción en el proveedor.',
      );
    }
    await this.paypalBillingService.cancelSubscription(
      suscripcion.paypalSubscriptionId,
      { reason: reason?.trim() || undefined },
    );
    await this.suscripcionRepo.update(suscripcion.id, {
      metadatos: {
        ...(suscripcion.metadatos ?? {}),
        ultimaAccionManual: 'cancelar',
        ultimaAccionManualEn: new Date().toISOString(),
      },
    });
  }

  async listInvoicesForEmpresa(
    empresaId: string,
    months = 6,
  ): Promise<FilaFacturaSuscripcion[]> {
    const suscripcion = await this.requireEmpresaLatest(empresaId);
    if (!suscripcion.paypalSubscriptionId) {
      return [];
    }
    const safeMonths = Math.min(24, Math.max(1, Math.round(months)));
    const end = new Date();
    const start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - safeMonths);
    const rows = await this.paypalBillingService.listSubscriptionTransactions(
      suscripcion.paypalSubscriptionId,
      start.toISOString(),
      end.toISOString(),
    );
    return rows.map((row) => ({
      id: row.id,
      estado: row.status,
      moneda: row.currency,
      monto: row.amount,
      pagadoEn: row.time,
    }));
  }

  async processPaypalWebhookEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const resource = this.asRecord(payload.resource);
    if (!resource) {
      return;
    }
    const providerSubscriptionId = this.asString(resource.id);
    if (!providerSubscriptionId) {
      return;
    }
    const suscripcion = await this.suscripcionRepo.findOne({
      where: { paypalSubscriptionId: providerSubscriptionId },
      order: { fechaCreacion: 'DESC' },
    });
    if (!suscripcion) {
      return;
    }
    const mapped = this.mapPaypalEvent(eventType, resource);
    if (!mapped) {
      return;
    }
    await this.applyPaypalUpdate(suscripcion.id, resource, mapped, {
      ultimoWebhook: eventType,
      ultimoWebhookEn: new Date().toISOString(),
    });
  }

  esOperativa(suscripcion: Suscripcion): boolean {
    if (
      suscripcion.estadoPlataforma !== EstadoSuscripcionPlataforma.ACTIVA &&
      suscripcion.estadoPlataforma !== EstadoSuscripcionPlataforma.EN_PRUEBA
    ) {
      return false;
    }
    if (!suscripcion.fechaProximoPago) {
      return false;
    }
    return suscripcion.fechaProximoPago.getTime() > Date.now();
  }

  private async applyPaypalUpdate(
    suscripcionId: string,
    resource: Record<string, unknown>,
    mappedStatus: EstadoSuscripcionProveedor,
    audit: Record<string, unknown>,
  ): Promise<void> {
    const suscripcion = await this.suscripcionRepo.findOne({
      where: { id: suscripcionId },
      relations: { plan: true, empresa: true },
    });
    if (!suscripcion) {
      return;
    }
    let nextBillingTime = this.extractNextBillingTime(resource);
    if (!nextBillingTime && mappedStatus === EstadoSuscripcionProveedor.ACTIVA) {
      nextBillingTime = this.buildNextPeriodEnd(suscripcion.fechaProximoPago);
    }
    const cancelarAlFinPeriodo =
      mappedStatus === EstadoSuscripcionProveedor.CANCELADA;
    const estadoPlataforma = this.mapProveedorAPlataforma(mappedStatus);
    const previous = suscripcion.metadatos ?? {};
    suscripcion.estadoProveedor = mappedStatus;
    suscripcion.estadoPlataforma = estadoPlataforma;
    suscripcion.fechaProximoPago = nextBillingTime;
    suscripcion.cancelarAlFinPeriodo = cancelarAlFinPeriodo;
    suscripcion.fechaCancelacion = cancelarAlFinPeriodo ? new Date() : null;
    suscripcion.metadatos = { ...previous, ...audit };
    await this.suscripcionRepo.save(suscripcion);

    const shouldSend =
      mappedStatus === EstadoSuscripcionProveedor.ACTIVA &&
      typeof previous.correosActivacionEnviadosEn !== 'string';
    const propietarioId = suscripcion.empresa?.propietarioUsuarioId;
    if (!shouldSend || !propietarioId) {
      return;
    }
    const owner = await this.usuarioRepo.findOne({
      where: { id: propietarioId },
    });
    if (!owner?.correo) {
      return;
    }
    const plan = await this.planRepository.findOne({
      where: { id: suscripcion.planId },
    });
    const ownerName = `${owner.nombre} ${owner.apellido}`.trim();
    const amountLabel = this.formatCurrencyFromCents(
      plan?.precioMensualCentavos ?? 0,
      suscripcion.moneda,
    );
    const nextRenewalLabel = nextBillingTime
      ? nextBillingTime.toLocaleDateString('es-DO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'pendiente de confirmación';
    try {
      await this.transactionalMail.sendSubscriptionPaymentSuccess(owner.correo, {
        ownerName,
        planName: plan?.nombre ?? suscripcion.planId,
        amountLabel,
        nextRenewalLabel,
        subscriptionId: suscripcion.paypalSubscriptionId ?? 'N/D',
      });
      await this.transactionalMail.sendWelcomeAfterActivation(owner.correo, {
        ownerName,
      });
      suscripcion.metadatos = {
        ...suscripcion.metadatos,
        correosActivacionEnviadosEn: new Date().toISOString(),
      };
      await this.suscripcionRepo.save(suscripcion);
    } catch (error: unknown) {
      this.logger.warn(
        `No se pudieron enviar correos de activación: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }

  private toStatusDto(suscripcion: Suscripcion | null): EstadoSuscripcionDto {
    if (!suscripcion) {
      return {
        estado: 'ninguna',
        codigoPlan: null,
        fechaFinPeriodo: null,
        cancelarAlFinPeriodo: false,
      };
    }
    let estado: EstadoSuscripcionDto['estado'] =
      suscripcion.estadoPlataforma ?? 'ninguna';
    if (
      (suscripcion.estadoPlataforma === EstadoSuscripcionPlataforma.ACTIVA ||
        suscripcion.estadoPlataforma ===
          EstadoSuscripcionPlataforma.EN_PRUEBA) &&
      suscripcion.fechaProximoPago &&
      suscripcion.fechaProximoPago.getTime() <= Date.now()
    ) {
      estado = suscripcion.cancelarAlFinPeriodo
        ? EstadoSuscripcionPlataforma.CANCELADA
        : EstadoSuscripcionPlataforma.VENCIDA;
    }
    return {
      estado,
      codigoPlan: suscripcion.plan?.codigo ?? null,
      fechaFinPeriodo: suscripcion.fechaProximoPago?.toISOString() ?? null,
      cancelarAlFinPeriodo: suscripcion.cancelarAlFinPeriodo,
    };
  }

  private async requireEmpresaLatest(empresaId: string): Promise<Suscripcion> {
    const suscripcion = await this.suscripcionRepo.findOne({
      where: { empresaId },
      relations: { plan: true, empresa: true },
      order: { fechaCreacion: 'DESC' },
    });
    if (!suscripcion) {
      throw new BadRequestException(
        'La empresa no tiene una suscripción registrada.',
      );
    }
    return suscripcion;
  }

  private async resolveCheckoutPlan(
    empresaId: string,
    planCode?: string | null,
  ): Promise<Plan> {
    if (planCode?.trim()) {
      return this.requirePlanByCodeOrDefault(planCode);
    }
    const existente = await this.suscripcionRepo.findOne({
      where: { empresaId },
      relations: { plan: true },
      order: { fechaCreacion: 'DESC' },
    });
    if (existente?.plan?.activo) {
      return existente.plan;
    }
    return this.requirePlanByCodeOrDefault('');
  }

  private async requirePlanByCodeOrDefault(planCode: string): Promise<Plan> {
    if (planCode.trim()) {
      const plan = await this.planRepository.findOne({
        where: { codigo: planCode.trim().toLowerCase(), activo: true },
      });
      if (!plan) {
        throw new BadRequestException(
          'El plan solicitado no existe o está inactivo.',
        );
      }
      return plan;
    }
    const defaultPlan = await this.planRepository.findOne({
      where: { activo: true },
      order: { ordenVisualizacion: 'ASC', fechaCreacion: 'ASC' },
    });
    if (!defaultPlan) {
      throw new BadRequestException(
        'No hay planes activos configurados. Crea o activa al menos un plan.',
      );
    }
    return defaultPlan;
  }

  private buildNextPeriodEnd(current: Date | null): Date {
    const now = new Date();
    const base =
      current != null && current.getTime() > now.getTime() ? current : now;
    const next = new Date(base);
    next.setUTCDate(next.getUTCDate() + 30);
    return next;
  }

  private resolveAbsoluteFrontendUrl(
    candidate: string | null | undefined,
    fallbackPath: string,
  ): string {
    const defaultBase =
      this.config.get<string>('APP_PUBLIC_URL')?.trim() ||
      'http://localhost:3001';
    const raw = candidate?.trim();
    if (!raw) {
      return new URL(fallbackPath, defaultBase).toString();
    }
    try {
      return new URL(raw).toString();
    } catch {
      return new URL(raw, defaultBase).toString();
    }
  }

  private formatCurrencyFromCents(cents: number, currency: string): string {
    const amount = Math.max(0, cents) / 100;
    try {
      return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
    }
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private extractNextBillingTime(
    resource: Record<string, unknown>,
  ): Date | null {
    const billingInfo = this.asRecord(resource.billing_info);
    const nextBillingTime = this.asString(billingInfo?.next_billing_time);
    if (!nextBillingTime) {
      return null;
    }
    const parsed = new Date(nextBillingTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private mapPaypalProviderStatus(
    status: string | null | undefined,
  ): EstadoSuscripcionProveedor | null {
    const normalized = status?.trim().toUpperCase();
    if (normalized === 'ACTIVE') return EstadoSuscripcionProveedor.ACTIVA;
    if (normalized === 'APPROVAL_PENDING') {
      return EstadoSuscripcionProveedor.PENDIENTE;
    }
    if (normalized === 'SUSPENDED') return EstadoSuscripcionProveedor.SUSPENDIDA;
    if (normalized === 'CANCELLED') return EstadoSuscripcionProveedor.CANCELADA;
    if (normalized === 'EXPIRED') return EstadoSuscripcionProveedor.EXPIRADA;
    return null;
  }

  private mapPaypalEvent(
    eventType: string,
    resource: Record<string, unknown>,
  ): EstadoSuscripcionProveedor | null {
    const type = eventType.trim().toUpperCase();
    const explicit = this.asString(resource.status)?.toUpperCase();
    if (type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      return EstadoSuscripcionProveedor.ACTIVA;
    }
    if (type === 'BILLING.SUBSCRIPTION.CANCELLED') {
      return EstadoSuscripcionProveedor.CANCELADA;
    }
    if (type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      return EstadoSuscripcionProveedor.SUSPENDIDA;
    }
    if (type === 'BILLING.SUBSCRIPTION.EXPIRED') {
      return EstadoSuscripcionProveedor.EXPIRADA;
    }
    if (type === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      return EstadoSuscripcionProveedor.VENCIDA;
    }
    if (type === 'BILLING.SUBSCRIPTION.CREATED') {
      return EstadoSuscripcionProveedor.PENDIENTE;
    }
    if (type === 'BILLING.SUBSCRIPTION.UPDATED') {
      return this.mapPaypalProviderStatus(explicit);
    }
    return null;
  }

  private mapProveedorAPlataforma(
    status: EstadoSuscripcionProveedor,
  ): EstadoSuscripcionPlataforma {
    if (status === EstadoSuscripcionProveedor.ACTIVA) {
      return EstadoSuscripcionPlataforma.ACTIVA;
    }
    if (status === EstadoSuscripcionProveedor.VENCIDA) {
      return EstadoSuscripcionPlataforma.VENCIDA;
    }
    if (
      status === EstadoSuscripcionProveedor.CANCELADA ||
      status === EstadoSuscripcionProveedor.EXPIRADA
    ) {
      return EstadoSuscripcionPlataforma.CANCELADA;
    }
    if (status === EstadoSuscripcionProveedor.SUSPENDIDA) {
      return EstadoSuscripcionPlataforma.IMPAGA;
    }
    return EstadoSuscripcionPlataforma.INCOMPLETA;
  }
}
