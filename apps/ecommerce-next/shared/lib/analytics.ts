import { config } from "../constants/config";

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

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

interface QueuedEvent {
  type: AnalyticsEvent;
  path: string;
  productId?: string;
  value?: number;
  referrer?: string;
  metadata: Record<string, unknown>;
}

const MAX_BATCH = 50;
const queue: QueuedEvent[] = [];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optedOut = () => navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;

function sessionId(): string {
  try {
    const saved = sessionStorage.getItem("ecommerce-analytics-session");
    if (saved) return saved;
    const created = crypto.randomUUID();
    sessionStorage.setItem("ecommerce-analytics-session", created);
    return created;
  } catch {
    return "anonymous-session";
  }
}

export function enqueue(type: AnalyticsEvent, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || optedOut() || queue.length >= MAX_BATCH * 2) return;
  const productId =
    typeof params["item_id"] === "string" && UUID.test(params["item_id"])
      ? params["item_id"]
      : undefined;
  const value = typeof params["value"] === "number" ? Math.round(params["value"] * 100) : undefined;
  const referrer =
    typeof params["referrer"] === "string" && params["referrer"]
      ? params["referrer"].slice(0, 300)
      : undefined;
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
  if (typeof window === "undefined") return;
  window.dataLayer?.push({ event, ...params });
  enqueue(event, params);
}

export function flushEvents(token?: string): void {
  if (queue.length === 0) return;
  const session = sessionId();
  const events = queue.splice(0, MAX_BATCH).map((event) => ({ ...event, sessionId: session }));
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
