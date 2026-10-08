export type {
  ApiError,
  ApiResponse,
  ApiSuccess,
  PaginatedResponse,
  PaginationMeta,
} from "@ecommerce/shared-types";

export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
  details?: unknown;
  errors?: Array<{ path: string; message: string }>;
}
