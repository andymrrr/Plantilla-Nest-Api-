export interface PaginacionVm<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
