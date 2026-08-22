import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PaypalSubscriptionRequest {
  planId: string;
  returnUrl: string;
  cancelUrl: string;
  customId: string;
}

interface PaypalWebhookHeaders {
  transmissionId?: string;
  transmissionTime?: string;
  transmissionSignature?: string;
  certUrl?: string;
  authAlgo?: string;
}

interface PaypalLink {
  href?: string;
  rel?: string;
}

interface PaypalCreateSubscriptionResponse {
  id?: string;
  links?: PaypalLink[];
}

interface PaypalSubscriptionActionRequest {
  reason?: string | null;
}

interface PaypalSubscriptionTransaction {
  id?: string;
  status?: string;
  amount_with_breakdown?: {
    gross_amount?: {
      currency_code?: string;
      value?: string;
    };
  };
  time?: string;
}

interface PaypalSubscriptionTransactionsResponse {
  transactions?: PaypalSubscriptionTransaction[];
}

export interface PaypalSubscriptionDetails {
  id: string;
  status: string;
  plan_id: string | null;
  billing_info: Record<string, unknown> | null;
}

@Injectable()
export class PaypalBillingService {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    const raw = this.config.get<string>('PAYPAL_BASE_URL')?.trim();
    if (raw) {
      return raw.replace(/\/+$/, '');
    }
    return 'https://api-m.paypal.com';
  }

  private get brandName(): string {
    return this.config.get<string>('APP_NAME')?.trim() || 'Mi Aplicación';
  }

  private get webhookId(): string {
    const value = this.config.get<string>('PAYPAL_WEBHOOK_ID')?.trim();
    if (!value) {
      throw new BadRequestException(
        'PAYPAL_WEBHOOK_ID no está configurado en el backend.',
      );
    }
    return value;
  }

  private assertCredentials(): { clientId: string; clientSecret: string } {
    const clientId = this.config.get<string>('PAYPAL_CLIENT_ID')?.trim();
    const clientSecret = this.config.get<string>('PAYPAL_CLIENT_SECRET')?.trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Configura PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET para usar suscripciones.',
      );
    }
    return { clientId, clientSecret };
  }

  async createSubscriptionApproval(params: PaypalSubscriptionRequest): Promise<{
    providerSubscriptionId: string;
    approvalUrl: string;
  }> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        plan_id: params.planId,
        custom_id: params.customId,
        application_context: {
          user_action: 'SUBSCRIBE_NOW',
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
          brand_name: this.brandName,
        },
      }),
    });

    const data =
      (await this.parseJson<PaypalCreateSubscriptionResponse>(response)) ?? {};
    const approvalLink =
      data.links?.find((link) => link.rel === 'approve')?.href ?? null;

    if (!response.ok || !data.id || !approvalLink) {
      throw new BadRequestException(
        'PayPal no devolvió una sesión de suscripción válida. Verifica el plan y las credenciales.',
      );
    }

    return {
      providerSubscriptionId: data.id,
      approvalUrl: approvalLink,
    };
  }

  async cancelSubscription(
    subscriptionId: string,
    params?: PaypalSubscriptionActionRequest,
  ): Promise<void> {
    await this.executeSubscriptionAction(subscriptionId, 'cancel', params);
  }

  async suspendSubscription(
    subscriptionId: string,
    params?: PaypalSubscriptionActionRequest,
  ): Promise<void> {
    await this.executeSubscriptionAction(subscriptionId, 'suspend', params);
  }

  async activateSubscription(
    subscriptionId: string,
    params?: PaypalSubscriptionActionRequest,
  ): Promise<void> {
    await this.executeSubscriptionAction(subscriptionId, 'activate', params);
  }

  async getSubscriptionDetails(
    subscriptionId: string,
  ): Promise<PaypalSubscriptionDetails> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );
    const data =
      (await this.parseJson<Record<string, unknown>>(response)) ?? {};
    if (!response.ok) {
      throw new BadRequestException(
        'No se pudo consultar el estado de la suscripción en PayPal.',
      );
    }
    return {
      id: typeof data.id === 'string' ? data.id : subscriptionId,
      status: typeof data.status === 'string' ? data.status : 'UNKNOWN',
      plan_id: typeof data.plan_id === 'string' ? data.plan_id : null,
      billing_info:
        typeof data.billing_info === 'object' && data.billing_info !== null
          ? (data.billing_info as Record<string, unknown>)
          : null,
    };
  }

  async listSubscriptionTransactions(
    subscriptionId: string,
    startTimeIso: string,
    endTimeIso: string,
  ): Promise<
    Array<{
      id: string | null;
      status: string;
      currency: string;
      amount: string;
      time: string | null;
    }>
  > {
    const token = await this.getAccessToken();
    const url = new URL(
      `${this.baseUrl}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/transactions`,
    );
    url.searchParams.set('start_time', startTimeIso);
    url.searchParams.set('end_time', endTimeIso);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const data =
      (await this.parseJson<PaypalSubscriptionTransactionsResponse>(response)) ??
      {};
    if (!response.ok) {
      throw new BadRequestException(
        'No se pudieron consultar las transacciones de suscripción en PayPal.',
      );
    }
    return (data.transactions ?? []).map((row) => ({
      id: row.id ?? null,
      status: row.status?.toLowerCase() ?? 'unknown',
      currency:
        row.amount_with_breakdown?.gross_amount?.currency_code?.toUpperCase() ??
        'USD',
      amount: row.amount_with_breakdown?.gross_amount?.value ?? '0.00',
      time: row.time ?? null,
    }));
  }

  async verifyWebhookSignature(
    headers: PaypalWebhookHeaders,
    rawBody: Buffer,
  ): Promise<boolean> {
    const transmissionId = headers.transmissionId?.trim();
    const transmissionTime = headers.transmissionTime?.trim();
    const transmissionSignature = headers.transmissionSignature?.trim();
    const certUrl = headers.certUrl?.trim();
    const authAlgo = headers.authAlgo?.trim();

    if (
      !transmissionId ||
      !transmissionTime ||
      !transmissionSignature ||
      !certUrl ||
      !authAlgo
    ) {
      return false;
    }

    const webhookEvent = this.tryParseRawJson(rawBody);
    if (!webhookEvent) {
      return false;
    }

    const token = await this.getAccessToken();
    const response = await fetch(
      `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSignature,
          transmission_time: transmissionTime,
          webhook_id: this.webhookId,
          webhook_event: webhookEvent,
        }),
      },
    );

    const data = await this.parseJson<{ verification_status?: string }>(
      response,
    );
    return (
      response.ok &&
      typeof data?.verification_status === 'string' &&
      data.verification_status.toUpperCase() === 'SUCCESS'
    );
  }

  private async getAccessToken(): Promise<string> {
    const credentials = this.assertCredentials();
    const basicAuth = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
      'utf-8',
    ).toString('base64');

    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const data = await this.parseJson<{ access_token?: string }>(response);
    if (!response.ok || !data?.access_token) {
      throw new BadRequestException(
        'No se pudo autenticar contra PayPal. Revisa credenciales y entorno.',
      );
    }

    return data.access_token;
  }

  private async executeSubscriptionAction(
    subscriptionId: string,
    action: 'cancel' | 'suspend' | 'activate',
    params?: PaypalSubscriptionActionRequest,
  ): Promise<void> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/${action}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          reason:
            params?.reason?.trim() ||
            (action === 'activate'
              ? 'Reactivación solicitada por el cliente'
              : action === 'suspend'
                ? 'Pausa temporal solicitada por el cliente'
                : 'Cancelación solicitada por el cliente'),
        }),
      },
    );
    if (!response.ok) {
      throw new BadRequestException(
        `PayPal no permitió ${this.actionLabel(action)} la suscripción.`,
      );
    }
  }

  private actionLabel(action: 'cancel' | 'suspend' | 'activate'): string {
    if (action === 'cancel') return 'cancelar';
    if (action === 'suspend') return 'pausar';
    return 'reactivar';
  }

  private async parseJson<T>(response: Response): Promise<T | null> {
    const raw = await response.text();
    if (!raw.trim()) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  private tryParseRawJson(raw: Buffer): Record<string, unknown> | null {
    try {
      return JSON.parse(raw.toString('utf-8')) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
