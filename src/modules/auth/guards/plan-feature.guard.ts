import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { REQUIRE_PLAN_FEATURE_KEY } from '../../../common/decorators/require-plan-feature.decorator';
import type { PlanFeatureKey } from '../../../common/types/plan-caracteristicas.types';
import type { RequestUser } from '../../../common/types/request-user.types';
import { PlanFeaturesService } from '../../payments/plan-features.service';

type RequestWithUser = {
  user?: RequestUser;
};

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planFeatures: PlanFeaturesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const feature = this.reflector.getAllAndOverride<PlanFeatureKey>(
      REQUIRE_PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const empresaId = request.user?.empresaId;
    if (!empresaId) {
      return true;
    }

    await this.planFeatures.assertFeature(empresaId, feature);
    return true;
  }
}
