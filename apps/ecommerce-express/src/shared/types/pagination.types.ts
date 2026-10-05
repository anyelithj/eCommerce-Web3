export type { PaginationMeta } from "@ecommerce/shared-types";

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}
