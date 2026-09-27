/**
 * Features de plan. El producto derivado añade claves aquí
 * (ej. `'permiteReportes'`). Vacío = `@RequirePlanFeature` no bloquea
 * hasta que el derivado declare keys y las escriba en `planes.caracteristicas`.
 */
export const PLAN_FEATURE_KEYS = [] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];

export type PlanCaracteristicas = Record<PlanFeatureKey, boolean> &
  Record<string, boolean>;

export const CARACTERISTICAS_POR_DEFECTO: PlanCaracteristicas = {};

export function caracteristicasPorDefecto(
  _codigoPlan?: string | null,
): PlanCaracteristicas {
  return { ...CARACTERISTICAS_POR_DEFECTO };
}

export function normalizarCaracteristicas(
  value: unknown,
  codigoPlan?: string | null,
): PlanCaracteristicas {
  const base: Record<string, boolean> = { ...caracteristicasPorDefecto(codigoPlan) };
  if (!value || typeof value !== 'object') {
    return base;
  }
  const raw = value as Record<string, unknown>;
  for (const [clave, item] of Object.entries(raw)) {
    if (typeof item === 'boolean') {
      base[clave] = item;
    }
  }
  return base;
}
