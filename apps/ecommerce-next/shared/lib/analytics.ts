// analytics.ts => eventos de e-commerce estándar de GA4 (view_item, add_to_cart, begin_checkout, purchase) en dos
// destinos: "window.dataLayer" (Google Tag Manager; sin GTM es un no-op) y la analítica propia de Express
// (POST /api/v1/analytic/event, Fase 7). Patrón Observer (los componentes publican, AnalyticsTracker envía) +
// Batch/Buffer: los eventos se acumulan en memoria y viajan en LOTES de hasta 50 (menos peticiones = menos energía).
// Privacidad: con "No rastrear" (DNT) o Global Privacy Control activos no se envía nada al backend.
import { config } from "../constants/config";

// Unión de literales (TypeScript) => mismos nombres que EventTypes de Express (analytics.model.ts)
type EcommerceEvent =
  | "view_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "add_shipping_info"
  | "add_payment_info"
  | "purchase"
  | "search";
export type AnalyticsEvent = EcommerceEvent | "page_view";

// "declare global" => amplía el tipo de window con dataLayer y la señal GPC (tipado seguro, sin "any")
declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

// QueuedEvent => forma de EventSchema en Express (sessionId se agrega al enviar)
interface QueuedEvent {
  type: AnalyticsEvent;
  path: string;
  productId?: string;
  value?: number; // Centavos
  referrer?: string;
  metadata: Record<string, unknown>;
}

const MAX_BATCH = 50; // Igual que MAX_BATCH del backend
const queue: QueuedEvent[] = []; // Buffer en memoria del módulo (Singleton por pestaña)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// optedOut => respeta las señales de privacidad del navegador
const optedOut = () => navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;

// sessionId => identificador anónimo por pestaña (sessionStorage: se borra al cerrarla; sin cookies)
function sessionId(): string {
  try {
    const saved = sessionStorage.getItem("ecommerce-analytics-session");
    if (saved) return saved;
    const created = crypto.randomUUID(); // Web Crypto nativa: sin librerías
    sessionStorage.setItem("ecommerce-analytics-session", created);
    return created;
  } catch {
    return "anonymous-session"; // Modo privado sin sessionStorage: se sigue contando, sin agrupar por sesión
  }
}

// enqueue => normaliza los parámetros GA4 al contrato del backend y los guarda en el buffer
export function enqueue(type: AnalyticsEvent, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || optedOut() || queue.length >= MAX_BATCH * 2) return; // Tope: sin crecer sin límite
  const productId =
    typeof params["item_id"] === "string" && UUID.test(params["item_id"])
      ? params["item_id"]
      : undefined;
  const value = typeof params["value"] === "number" ? Math.round(params["value"] * 100) : undefined; // GA4 usa unidades
  const referrer =
    typeof params["referrer"] === "string" && params["referrer"]
      ? params["referrer"].slice(0, 300)
      : undefined;
  // Spread condicional => no se envían claves vacías (exactOptionalPropertyTypes)
  queue.push({
    type,
    path: window.location.pathname.slice(0, 300),
    ...(productId ? { productId } : {}),
    ...(value !== undefined ? { value } : {}),
    ...(referrer ? { referrer } : {}),
    metadata: {},
  });
}

export function trackEvent(event: EcommerceEvent, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return; // En el servidor no hay dataLayer
  window.dataLayer?.push({ event, ...params });
  enqueue(event, params);
}

// flushEvents => envía un lote. "keepalive" => la petición sobrevive al cierre de la pestaña (reemplaza sendBeacon,
// que no permite el header Authorization). Fallos de red se ignoran: la analítica nunca rompe la tienda.
export function flushEvents(token?: string): void {
  if (queue.length === 0) return;
  const session = sessionId();
  const events = queue.splice(0, MAX_BATCH).map((event) => ({ ...event, sessionId: session })); // "splice" vacía el buffer
  void fetch(`${config.apiUrl}/analytic/event`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ events }),
  }).catch(() => undefined);
}
