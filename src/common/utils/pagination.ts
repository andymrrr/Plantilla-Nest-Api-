import { FindOptionsOrder, FindOptionsWhere, ILike } from 'typeorm';
import type { PageQueryBase } from '../types/pagination.types';

export interface BuildTypeOrmPaginationOptions<T> {
  /** Campos sobre los que se aplica la búsqueda (search) con ILike */
  searchableFields?: (keyof T)[];
  /** Campos que se pueden filtrar por igualdad/contains desde el query */
  filterKeys?: (keyof T)[];
  /** Campo por defecto para ordenar */
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
 * Construye opciones de paginación y filtros para TypeORM (findAndCount).
 */
export function buildTypeOrmPaginationArgs<T extends object>(
  query: PageQueryBase & object,
  opts: BuildTypeOrmPaginationOptions<T>,
): TypeOrmPaginationArgs<T> {
  const q = query as Record<string, unknown>;
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.max(1, Number(query.limit ?? 10));
  const skip = (page - 1) * limit;
  const take = limit;

  const orderByKey = (query.orderBy as keyof T) ?? opts.defaultOrderBy;
  const orderDir = (query.order ?? 'asc') as 'asc' | 'desc';

  const order: FindOptionsOrder<T> = orderByKey
    ? ({ [orderByKey]: orderDir } as FindOptionsOrder<T>)
    : ({} as FindOptionsOrder<T>);

  const search = query.search?.toString().trim();
  const searchable = opts.searchableFields ?? [];
  const filterKeys = opts.filterKeys ?? [];

  const filterObj: Record<string, unknown> = {};
  for (const key of filterKeys) {
    const v = q[key as string];
    if (v === undefined || v === null || v === '') continue;
    const str = typeof v === 'string' ? v.trim() : String(v);
    if (str === '') continue;
    if (typeof v === 'boolean' || (typeof v === 'number' && !Number.isNaN(v))) {
      filterObj[key as string] = v;
    } else {
      filterObj[key as string] = ILike(`%${str}%`);
    }
  }

  let where: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  if (search && searchable.length > 0) {
    const filterWhere = filterObj as FindOptionsWhere<T>;
    where = searchable.map((k) => ({
      ...filterWhere,
      [k]: ILike(`%${search}%`),
    })) as FindOptionsWhere<T>[];
  } else if (Object.keys(filterObj).length > 0) {
    where = filterObj as FindOptionsWhere<T>;
  } else {
    where = {} as FindOptionsWhere<T>;
  }

  return { skip, take, order, where, page, limit };
}
