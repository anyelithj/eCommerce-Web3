import axios, { type AxiosRequestConfig } from "axios";
import { config } from "../constants/config";
import type { ApiErrorBody, PaginationMeta } from "../types/api.types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly fieldErrors?: ApiErrorBody["errors"]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | undefined;
  query?: Record<string, QueryValue>;
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
  signal?: AbortSignal;
  baseUrl?: string;
  locale?: string;
}

type SuccessEnvelope<T> = { success: true; data: T; meta?: PaginationMeta };

const http = axios.create({ adapter: "fetch", headers: { Accept: "application/json" } });

function buildUrl(
  path: string,
  query?: Record<string, QueryValue>,
  baseUrl = config.apiUrl
): string {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
    else url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function localeHeader(locale?: string): Record<string, string> {
  const lang = locale ?? (typeof document === "undefined" ? "" : document.documentElement.lang);
  return lang ? { "Accept-Language": lang } : {};
}

function toRequestConfig(path: string, options: RequestOptions): AxiosRequestConfig {
  return {
    url: buildUrl(path, options.query, options.baseUrl),
    method: options.method ?? "GET",
    data: options.body,
    headers: {
      ...localeHeader(options.locale),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.signal ? { signal: options.signal } : {}),
    fetchOptions: {
      ...(options.next ? { next: options.next } : {}),
      ...(options.cache ? { cache: options.cache } : {}),
    },
  };
}

function toThrowable(error: unknown): unknown {
  if (error instanceof ApiError || axios.isCancel(error)) return error;
  if (axios.isAxiosError<ApiErrorBody>(error))
    return toApiError(error.response?.status ?? 0, error.response?.data ?? null);
  return error;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta?: PaginationMeta }> {
  const response = await http
    .request<SuccessEnvelope<T> | ApiErrorBody | "">(toRequestConfig(path, options))
    .catch((error: unknown) => {
      throw toThrowable(error);
    });
  if (response.status === 204) return { data: undefined as T };
  const payload = response.data;
  if (typeof payload !== "object" || payload.success !== true)
    throw toApiError(response.status, null);
  return payload.meta ? { data: payload.data, meta: payload.meta } : { data: payload.data };
}

function toApiError(status: number, payload: ApiErrorBody | null): ApiError {
  if (!payload || payload.success !== false)
    return new ApiError(status, "NETWORK_ERROR", "No se pudo completar la solicitud");
  return new ApiError(status, payload.code, payload.message, payload.details, payload.errors);
}

export async function apiGet<T>(
  path: string,
  options: Omit<RequestOptions, "method" | "body"> = {}
): Promise<T> {
  return (await apiRequest<T>(path, options)).data;
}
