export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly message?: string;
}

export interface ApiError {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface PaginatedResponse<T> extends ApiSuccess<readonly T[]> {
  readonly meta: PaginationMeta;
}
