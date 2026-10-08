// pagination.types.ts => contratos de paginación reutilizados por TODOS los listados (DRY).
// "export type { ... } from" => re-exporta el contrato del paquete compartido del monorepo (@ecommerce/shared-types):
// el backend y el frontend usan EXACTAMENTE la misma forma de "meta" (Shared Kernel).
export type { PaginationMeta } from "@ecommerce/shared-types";

// Resultado paginado que devuelve un repository: los ítems de la página + el total de la consulta
// "<T>" => genérico: sirve para productos, órdenes, usuarios...
export interface Paginated<T> {
  items: T[];
  total: number;
}

// Parámetros ya normalizados que recibe un repository (Prisma usa skip/take)
export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}
