import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common/interfaces/http/raw-body-request.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { EstadoEventoPaypal } from '../database/entities/estado-evento-paypal.enum';
import { EventoPaypal } from '../database/entities/evento-paypal.entity';
import { PlatformSubscriptionService } from './platform-subscription.service';
import { PaypalBillingService } from './paypal-billing.service';

@SkipThrottle()
@Controller(['integrations/paypal/webhook', 'webhook/paypal'])
export class PaypalWebhookController {
  constructor(
    @InjectRepository(EventoPaypal)
    private readonly eventoRepo: Repository<EventoPaypal>,
    private readonly paypalBillingService: PaypalBillingService,
    private readonly platformSubscriptionService: PlatformSubscriptionService,
  ) {}

  @Post()
  @Public()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('paypal-transmission-id') transmissionId: string | undefined,
    @Headers('paypal-transmission-time') transmissionTime: string | undefined,
    @Headers('paypal-transmission-sig')
    transmissionSignature: string | undefined,
    @Headers('paypal-cert-url') certUrl: string | undefined,
    @Headers('paypal-auth-algo') authAlgo: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!Buffer.isBuffer(raw) || raw.length === 0) {
      throw new BadRequestException(
        'Cuerpo raw no disponible; el servidor debe iniciarse con rawBody (ver main.ts)',
      );
    }

    const isValid = await this.paypalBillingService.verifyWebhookSignature(
      {
        transmissionId,
        transmissionTime,
        transmissionSignature,
        certUrl,
        authAlgo,
      },
      raw,
    );
    if (!isValid) {
      throw new BadRequestException('Firma de webhook PayPal inválida');
    }

    const parsedBody = this.tryParseWebhookPayload(raw);
    const dedupeTransmissionId = transmissionId?.trim() || null;
    if (dedupeTransmissionId) {
      const existing = await this.eventoRepo.findOne({
        where: { idTransmision: dedupeTransmissionId },
      });
      if (existing) {
        return ResponseHelper.ok(
          { recibido: true, duplicado: true },
          'Webhook PayPal ya procesado anteriormente',
        );
      }
    }

    const eventoId =
      this.asString(parsedBody.id) ?? `local-${Date.now().toString()}`;
    const persistedEvent = await this.eventoRepo.save(
      this.eventoRepo.create({
        eventoIdPaypal: eventoId,
        tipoEvento: this.asString(parsedBody.event_type) ?? 'desconocido',
        fechaEvento: new Date(),
        contenido: parsedBody,
        estado: EstadoEventoPaypal.PROCESANDO,
        procesado: false,
        idTransmision: dedupeTransmissionId,
      }),
    );

    try {
      await this.platformSubscriptionService.processPaypalWebhookEvent(
        this.asString(parsedBody.event_type) ?? '',
        parsedBody,
      );
      await this.eventoRepo.update(persistedEvent.id, {
        estado: EstadoEventoPaypal.PROCESADO,
        procesado: true,
        fechaProcesamiento: new Date(),
        mensajeError: null,
      });
    } catch (error: unknown) {
      const detail =
        error instanceof Error
          ? error.message
          : 'Error desconocido procesando webhook';
      await this.eventoRepo.update(persistedEvent.id, {
        estado: EstadoEventoPaypal.FALLIDO,
        fechaProcesamiento: new Date(),
        mensajeError: detail,
      });
      throw error;
    }

    return ResponseHelper.ok(
      { recibido: true, procesado: true },
      'Webhook PayPal procesado correctamente',
    );
  }

  private tryParseWebhookPayload(raw: Buffer): Record<string, unknown> {
    try {
      return JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new BadRequestException(
        'Payload JSON inválido para webhook PayPal',
      );
    }
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }
}
