// index.ts (TypeScript) => contratos de datos compartidos entre backend (Express) y frontends (Next, Nuxt).
// Paradigma: tipado estático estructural. Patrón: Shared Kernel (DDD) — una sola definición del contrato HTTP (DRY),
// si el backend cambia la forma de la respuesta, el frontend deja de compilar en vez de fallar en producción.
// Solo exporta "type"/"interface": se borran al compilar, por eso no hace falta build (Just-in-Time package de Turborepo).

// "export" => hace visible el tipo fuera del módulo | "interface" => contrato estructural extensible (OCP)
// "<T>" => genérico: el mismo sobre sirve para cualquier payload (User, Product, Order...)
export interface ApiSuccess<T> {
  // "readonly" => la propiedad no se puede reasignar tras crearse (inmutabilidad de DTOs)
  readonly success: true; // Tipo literal "true": discriminante de la unión ApiResponse (narrowing seguro)
  readonly data: T; // Payload tipado de la respuesta
  readonly message?: string; // "?" => propiedad opcional (mensaje informativo para la UI)
}

// Forma estándar de un error devuelto por la API (lo produce el error.middleware de Express)
export interface ApiError {
  readonly success: false; // Discriminante: "false" permite a TS saber que existe "error" y no "data"
  readonly error: {
    readonly code: string; // Código estable legible por máquina (ej. "AUTH_INVALID_CREDENTIALS")
    readonly message: string; // Mensaje legible por humanos
    readonly details?: unknown; // "unknown" (no "any") => obliga a validar antes de usar (tipado seguro)
  };
}

// "type" => alias de tipo | "|" => unión discriminada por "success" (patrón Result/Either de programación funcional)
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Metadatos de paginación comunes a todos los listados (productos, órdenes, usuarios)
export interface PaginationMeta {
  readonly page: number; // Página actual (base 1)
  readonly limit: number; // Elementos por página
  readonly total: number; // Total de registros en la fuente
  readonly totalPages: number; // Math.ceil(total / limit), calculado en el backend
}

// Respuesta paginada = respuesta exitosa cuyo payload es un arreglo + metadatos (composición de tipos, no herencia)
export interface PaginatedResponse<T> extends ApiSuccess<readonly T[]> {
  // "extends" => reutiliza ApiSuccess y solo añade "meta" (DRY + OCP)
  readonly meta: PaginationMeta;
}
