import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { Observable, from } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { RequestUser } from '../types/request-user.types';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SUCCESS_TTL_MS = 15 * 60 * 1000;

type RequestWithUser = Request & { user?: RequestUser };

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly completed = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const method = request.method.toUpperCase();
    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const explicitKey = this.header(request, 'x-idempotency-key');
    const key = explicitKey
      ? `key:${request.user?.id ?? 'anon'}:${explicitKey}`
      : `fp:${this.fingerprint(request)}`;

    const cached = this.completed.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return from(Promise.resolve(cached.value));
    }
    if (cached) {
      this.completed.delete(key);
    }

    const existing = this.inflight.get(key);
    if (existing) {
      return from(existing);
    }

    const pending = new Promise<unknown>((resolve, reject) => {
      next.handle().subscribe({
        next: (value) => {
          this.inflight.delete(key);
          if (explicitKey) {
            this.completed.set(key, {
              value,
              expiresAt: Date.now() + SUCCESS_TTL_MS,
            });
          }
          resolve(value);
        },
        error: (err: unknown) => {
          this.inflight.delete(key);
          reject(err);
        },
      });
    });
    this.inflight.set(key, pending);
    return from(pending);
  }

  private fingerprint(request: RequestWithUser): string {
    const payload = JSON.stringify({
      method: request.method.toUpperCase(),
      path: request.originalUrl ?? request.url,
      userId: request.user?.id ?? null,
      empresaId: request.user?.empresaId ?? null,
      body: request.body ?? null,
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  private header(request: RequestWithUser, name: string): string | null {
    const raw = request.headers[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }
}
