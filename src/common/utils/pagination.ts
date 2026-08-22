import { FindOptionsOrder, FindOptionsWhere, ILike } from 'typeorm';
import type { PageQueryBase } from '../types/pagination.types';

export interface BuildTypeOrmPaginationOptions<T> {
  /** Campos sobre los que se aplica `search` con ILike (OR entre ellos). */
  searchableFields?: (keyof T)[];
  /** Campo por defecto para ordenar si el query no trae orderBy. */
  defaultOrderBy?: keyof T;
}

export interface TypeOrmPaginationArgs<T> {
  skip: number;
  take: number;
  order: FindOptionsOrder<T>;
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  page: number;
  limit: number;
}

/**
 * Construye paginación, orden y búsqueda textual para TypeORM (`findAndCount`).
 *
 * Filtros de negocio (activo, estado, fechas, etc.) van en el servicio,
 * combinados sobre el DTO tipado — no se infieren aquí desde query genérico.
 */
export function buildTypeOrmPaginationArgs<T extends object>(
  query: PageQueryBase,
  opts: BuildTypeOrmPaginationOptions<T>,
): TypeOrmPaginationArgs<T> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.max(1, query.limit ?? 10);
  const skip = (page - 1) * limit;
  const take = limit;

  const orderByKey = (query.orderBy as keyof T | undefined) ?? opts.defaultOrderBy;
  const order: FindOptionsOrder<T> = orderByKey
    ? ({ [orderByKey]: query.order ?? 'asc' } as FindOptionsOrder<T>)
    : ({} as FindOptionsOrder<T>);

  const term = query.search?.trim();
  const searchableFields = opts.searchableFields ?? [];

  let where: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {} as FindOptionsWhere<T>;
  if (term && searchableFields.length > 0) {
    const pattern = ILike(`%${term}%`);
    where = searchableFields.map((field) => ({
      [field]: pattern,
    })) as FindOptionsWhere<T>[];
  }

  return { skip, take, order, where, page, limit };
}
