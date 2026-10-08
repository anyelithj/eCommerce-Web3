// api-response.types.ts => sobre estándar de TODAS las respuestas HTTP de la API.
// Re-exporta el contrato del paquete compartido (@ecommerce/shared-types): si cambia la forma de la
// respuesta, backend y frontend dejan de compilar a la vez (Shared Kernel de DDD + tipado seguro end-to-end).
export type { ApiError, ApiResponse, ApiSuccess, PaginatedResponse } from "@ecommerce/shared-types";
