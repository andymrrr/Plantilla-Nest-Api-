import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { Empresa } from '../database/entities/empresa.entity';
import { EventoPaypal } from '../database/entities/evento-paypal.entity';
import { Plan } from '../database/entities/plan.entity';
import { Suscripcion } from '../database/entities/suscripcion.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { PaymentsController } from './payments.controller';
import { PaypalBillingService } from './paypal-billing.service';
import { PaypalWebhookController } from './paypal-webhook.controller';
import { PlanesController } from './planes.controller';
import { PlanesService } from './planes.service';
import { PlatformSubscriptionService } from './platform-subscription.service';

@Module({
  imports: [
    MailModule,
    TypeOrmModule.forFeature([
      Plan,
      Suscripcion,
      Empresa,
      Usuario,
      EventoPaypal,
    ]),
  ],
  controllers: [PaymentsController, PaypalWebhookController, PlanesController],
  providers: [PaypalBillingService, PlatformSubscriptionService, PlanesService],
  exports: [PaypalBillingService, PlatformSubscriptionService, PlanesService],
})
export class PaymentsModule {}
