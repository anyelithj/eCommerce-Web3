// api.types.ts => contratos HTTP compartidos con el backend (paquete del monorepo @ecommerce/shared-types).
// Si Express cambia la forma de la respuesta, este frontend deja de compilar (tipado seguro end-to-end).
export type {
  ApiError,
  ApiResponse,
  ApiSuccess,
  PaginatedResponse,
  PaginationMeta,
} from "@ecommerce/shared-types";

// Forma de error que devuelve el error.middleware de Express ({ success:false, message, code, details?, errors? })
export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
  details?: unknown;
  errors?: Array<{ path: string; message: string }>; // Errores de validación Zod por campo
}
