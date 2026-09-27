import { SetMetadata } from '@nestjs/common';
import type { PlanFeatureKey } from '../types/plan-caracteristicas.types';

export const REQUIRE_PLAN_FEATURE_KEY = 'requirePlanFeature';

export const RequirePlanFeature = (
  feature: PlanFeatureKey,
): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRE_PLAN_FEATURE_KEY, feature);
