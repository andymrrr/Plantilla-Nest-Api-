/**
 * Sistema de paginación de la plantilla.
 * Respuesta estándar: items, page, limit, total, pages.
 */

export type SortOrder = 'asc' | 'desc';

export interface PageQueryBase {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: SortOrder;
  search?: string;
}

export interface PaginationResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function createPaginationResult<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginationResult<T> {
  return {
    items,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
  };
}
