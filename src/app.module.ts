import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ContextoEmpresaGuard } from './modules/auth/guards/contexto-empresa.guard';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermisosGuard } from './modules/auth/guards/permisos.guard';
import { PlanFeatureGuard } from './modules/auth/guards/plan-feature.guard';
import { SubscriptionActiveGuard } from './modules/auth/guards/subscription-active.guard';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { MailModule } from './modules/mail/mail.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RolesModule } from './modules/roles/roles.module';
import { SeedModule } from './modules/seed/seed.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    MailModule,
    PaymentsModule,
    SeedModule,
    AuthModule,
    UsersModule,
    EmpresasModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ContextoEmpresaGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermisosGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionActiveGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PlanFeatureGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
