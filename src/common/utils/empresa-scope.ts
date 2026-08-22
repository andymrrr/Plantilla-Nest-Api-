import type { FindOptionsWhere } from 'typeorm';

export function withEmpresaId<T extends object>(
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  empresaId: string,
): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
  if (Array.isArray(where)) {
    if (where.length === 0) {
      return { empresaId } as unknown as FindOptionsWhere<T>;
    }
    return where.map((clause) => ({ ...clause, empresaId }));
  }
  return { ...where, empresaId };
}

export function withWhereExtras<T extends object>(
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  extra: FindOptionsWhere<T>,
): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
  if (Object.keys(extra).length === 0) {
    return where;
  }
  if (Array.isArray(where)) {
    return where.map((clause) => ({ ...clause, ...extra }));
  }
  return { ...where, ...extra };
}
