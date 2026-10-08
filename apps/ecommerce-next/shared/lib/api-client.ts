// api-client.ts (Axios) => ÚNICO cliente REST hacia el backend Express (patrón Gateway/Facade).
// Funciona en Server Components (con cache/ISR de Next.js) y en el navegador (con el token de la sesión).
// Centraliza: URL base, headers, query string, parseo del sobre { success, data, meta } y errores tipados (DRY).
// "adapter: 'fetch'" => Axios usa el fetch de la plataforma; en el servidor Next.js lo extiende con su Data Cache,
// así "fetchOptions.next" ({ revalidate, tags }) conserva el ISR y la revalidación bajo demanda del catálogo.
import axios, { type AxiosRequestConfig } from "axios";
import { config } from "../constants/config";
import type { ApiErrorBody, PaginationMeta } from "../types/api.types";

// ApiError => error tipado con status HTTP y código estable del backend (la UI decide mensajes por código)
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

// Valores aceptados en la query string (arreglos => parámetro repetido ?attr=a&attr=b)
type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | undefined; // Access token del backend (sesión next-auth)
  query?: Record<string, QueryValue>;
  // Opciones de cache de Next.js (solo en servidor): revalidate => ISR; tags => revalidación bajo demanda
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
  signal?: AbortSignal; // Cancelación (búsquedas con debounce)
  baseUrl?: string; // Otro backend con el mismo contrato (FastAPI: config.mlApiUrl); por defecto Express
  locale?: string; // Idioma explícito para llamadas desde el servidor (en el navegador se toma de <html lang>)
}

// Sobre de éxito del backend (contrato @ecommerce/shared-types)
type SuccessEnvelope<T> = { success: true; data: T; meta?: PaginationMeta };

// http => instancia única de Axios (Singleton): configuración común para todas las peticiones REST
const http = axios.create({ adapter: "fetch", headers: { Accept: "application/json" } });

// buildUrl => URL absoluta + query string omitiendo valores vacíos (los arreglos se repiten: ?attr=a&attr=b)
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

// localeHeader => en el navegador envía el idioma de la INTERFAZ (<html lang>) para que el backend redacte en ese
// idioma los textos que genera (notificaciones, conceptos de puntos). El navegador enviaría el del sistema operativo.
export function localeHeader(locale?: string): Record<string, string> {
  const lang = locale ?? (typeof document === "undefined" ? "" : document.documentElement.lang);
  return lang ? { "Accept-Language": lang } : {};
}

// toRequestConfig => traduce RequestOptions a la configuración de Axios (función pura separada: SRP y menor complejidad)
function toRequestConfig(path: string, options: RequestOptions): AxiosRequestConfig {
  return {
    url: buildUrl(path, options.query, options.baseUrl),
    method: options.method ?? "GET",
    // Axios serializa objetos a JSON y deja que FormData fije su propio Content-Type con boundary
    data: options.body,
    headers: {
      ...localeHeader(options.locale),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    // Spread condicional: solo se envían las opciones que se pidieron
    ...(options.signal ? { signal: options.signal } : {}),
    fetchOptions: {
      ...(options.next ? { next: options.next } : {}),
      ...(options.cache ? { cache: options.cache } : {}),
    },
  };
}

// toThrowable => cualquier fallo de Axios -> ApiError (las cancelaciones por debounce se propagan tal cual)
function toThrowable(error: unknown): unknown {
  if (error instanceof ApiError || axios.isCancel(error)) return error;
  // "isAxiosError" => respuesta 4xx/5xx (Axios las rechaza) o fallo de red sin respuesta
  if (axios.isAxiosError<ApiErrorBody>(error))
    return toApiError(error.response?.status ?? 0, error.response?.data ?? null);
  return error;
}

// apiRequest => "<T>" genérico: el llamador declara la forma de "data" (tipado de punta a punta)
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta?: PaginationMeta }> {
  const response = await http
    .request<SuccessEnvelope<T> | ApiErrorBody | "">(toRequestConfig(path, options))
    .catch((error: unknown) => {
      throw toThrowable(error);
    });
  if (response.status === 204) return { data: undefined as T }; // DELETE sin cuerpo
  const payload = response.data;
  // Un 2xx con cuerpo inesperado (ej. HTML de un proxy) se trata como error de red
  if (typeof payload !== "object" || payload.success !== true)
    throw toApiError(response.status, null);
  return payload.meta ? { data: payload.data, meta: payload.meta } : { data: payload.data };
}

// toApiError => sobre de error del backend (o respuesta ilegible) -> ApiError tipado
function toApiError(status: number, payload: ApiErrorBody | null): ApiError {
  if (!payload || payload.success !== false)
    return new ApiError(status, "NETWORK_ERROR", "No se pudo completar la solicitud");
  return new ApiError(status, payload.code, payload.message, payload.details, payload.errors);
}

// apiGet => atajo para lecturas que solo necesitan "data"
export async function apiGet<T>(
  path: string,
  options: Omit<RequestOptions, "method" | "body"> = {}
): Promise<T> {
  return (await apiRequest<T>(path, options)).data;
}

// (Los mensajes para la UI se obtienen con shared/hook/useErrorMessage: traduce el "code" al idioma actual)
