"use client";

import { useEffect, useRef } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-client";
import { useAuth } from "@/shared/hook/useAuth";
import { config } from "@/shared/constants/config";
import type { PaginationMeta } from "@/shared/types/api.types";

export type Query = Record<string, string | number | boolean | undefined | null | string[]>;
export interface Page<T> {
  data: T[];
  meta?: PaginationMeta | undefined;
}

export interface Kpi {
  value: number;
  previous: number;
  change: number;
}
export interface MetricPoint {
  period: string;
  revenueCents: number;
  orders: number;
  aovCents: number;
  sessions: number;
  pageViews: number;
  addToCart: number;
  purchases: number;
  conversionRate: number;
}
export interface ReportRow {
  key: string;
  label: string;
  value: number;
  units?: number;
  views?: number;
  addToCart?: number;
}
export interface KpiResponse {
  from: string;
  to: string;
  generatedAt: string;
  kpis: Record<"revenueCents" | "orders" | "aovCents" | "newCustomers" | "conversionRate", Kpi>;
  operations: { activeOrders: number; pendingRefunds: number; lowStock: number };
  series: MetricPoint[];
  topProducts: ReportRow[];
}
export interface MetricsResponse {
  series: MetricPoint[];
  totals: Omit<MetricPoint, "period">;
  funnel: Array<{ step: string; count: number; rate: number }>;
  cartAbandonmentRate: number;
}
export interface Widget {
  id: string | null;
  type: "KPI" | "SALES_CHART" | "TOP_PRODUCTS" | "LOW_STOCK" | "FUNNEL" | "RECENT_ORDERS";
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}
export interface StockLevel {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  variantName: string;
  stock: number;
  reserved: number;
  available: number;
  low: boolean;
}
export interface Movement {
  id: string;
  type: string;
  delta: number;
  quantity: number;
  warehouse: string;
  reason: string;
  stockAfter: number;
  voidedAt: string | null;
  createdAt: string;
}
export interface InventoryDetail extends StockLevel {
  movements: Movement[];
  forecast: { avgDailySales: number; daysOfCover: number | null; reorderQuantity: number };
}
export interface Supplier {
  id: string;
  name: string;
  taxId: string;
  email: string;
  phone: string | null;
  contactName: string | null;
  paymentTermsDays: number;
  leadTimeDays: number;
  rating: number | null;
  isActive: boolean;
  contractEndsAt: string | null;
  contractAlert: boolean;
}
export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  orders: number;
  ltvCents: number;
  lastOrderAt: string | null;
  segment: "VIP" | "REGULAR" | "NEW" | "INACTIVE";
  score: { value: number; source: "MANUAL" | "RFM" };
  tags: string[];
  archived: boolean;
  createdAt: string;
}
export interface Customer360 extends Customer {
  notes: Array<{ text: string; authorId: string; at: string }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalCents: number;
    currency: string;
    placedAt: string;
  }>;
  favoriteCategories: Array<{ name: string; units: number }>;
  loyalty: { tier: string; pointsBalance: number } | null;
  reviews: number;
  avgOrderCents: number;
  nextPurchaseAt: string | null;
}
export interface Campaign {
  id: string;
  name: string;
  channel: "EMAIL" | "PUSH" | "WHATSAPP";
  audience: string;
  subject: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  metrics: { targeted: number; sent: number; failed: number; opened: number; openRate: number };
  error: string | null;
}
export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: string;
  openCount: number;
  openedAt: string | null;
  createdAt: string;
}
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
  locale: "es" | "en";
}
export interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  usedCount: number;
  usageLimit: number | null;
  endsAt: string | null;
  isActive: boolean;
}
export interface Workflow {
  id: string;
  name: string;
  triggerType: string;
  event: string | null;
  active: boolean;
  lastRunAt: string | null;
  metrics: { runs: number; successRate: number; avgDurationMs: number };
}
export interface Shipment {
  id: string;
  orderNumber: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
}
export interface Invoice {
  id: string;
  number: string;
  status: string;
  currency: string;
  totalCents: number;
  issuedAt: string | null;
}
export interface Refund {
  id: string;
  orderNumber: string;
  reason: string;
  description: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}
export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ id: string; action: string; resource: string }>;
}
export interface Permission {
  id: string;
  action: string;
  resource: string;
}
export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  maxAttempts: number;
  metrics: { deliveries: number; successRate: number; avgDurationMs: number };
  secret?: string;
}
export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  module: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  status: number | null;
  ip: string | null;
  reviewed: boolean;
  createdAt: string;
}
export interface McpTransaction {
  id: string;
  type: string;
  status: string;
  steps: Array<{ name: string; status: string; error: string | null }>;
  log: Array<{ at: string; message: string }>;
  createdAt: string;
}

function useToken() {
  const { accessToken } = useAuth();
  return { token: accessToken, enabled: Boolean(accessToken) };
}

export function useAdminList<T>(
  resource: string,
  path: string,
  query: Query = {},
  baseUrl?: string
) {
  const { token, enabled } = useToken();
  return useQuery({
    queryKey: queryKeys.admin(resource, { path, ...query }),
    queryFn: async (): Promise<Page<T>> => {
      const page = await apiRequest<T[]>(path, {
        token,
        query,
        cache: "no-store",
        ...(baseUrl ? { baseUrl } : {}),
      });
      return { data: page.data, meta: toMeta(page.meta) };
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useAdminGet<T>(
  resource: string,
  path: string | null,
  query: Query = {},
  options: { refetchInterval?: number | false; baseUrl?: string } = {}
) {
  const { token, enabled } = useToken();
  return useQuery({
    queryKey: queryKeys.admin(resource, { path, ...query }),
    queryFn: async () =>
      (
        await apiRequest<T>(path ?? "", {
          token,
          query,
          cache: "no-store",
          ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
        })
      ).data,
    enabled: enabled && Boolean(path),
    refetchInterval: options.refetchInterval ?? false,
  });
}

function toMeta(
  meta: (PaginationMeta & { total_pages?: number }) | undefined
): PaginationMeta | undefined {
  return meta && { ...meta, totalPages: meta.totalPages ?? meta.total_pages ?? 1 };
}

export type MutationRequest = {
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  baseUrl?: string;
};

export function useAdminMutation<Input, Output = unknown>(
  resources: string[],
  toRequest: (input: Input) => MutationRequest
) {
  const { token } = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Input) => {
      const request = toRequest(input);
      return (
        await apiRequest<Output>(request.path, {
          method: request.method,
          body: request.body,
          token,
          ...(request.baseUrl ? { baseUrl: request.baseUrl } : {}),
        })
      ).data;
    },
    onSuccess: () =>
      Promise.all(
        resources.map((resource) =>
          queryClient.invalidateQueries({ queryKey: ["admin", resource] })
        )
      ),
  });
}

export function useKpis(range: { from: string; to?: string | undefined }, realtime: boolean) {
  return useAdminGet<KpiResponse>("kpi", "/dashboard/kpi", {
    from: range.from,
    to: range.to,
    realtime: realtime || undefined,
  });
}

export function useLiveMetrics(
  enabled: boolean,
  onTick?: (tick: { events: number; orders: number; revenueCents: number }) => void
) {
  const { token } = useToken();
  const queryClient = useQueryClient();
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    if (!enabled || !token) return;
    let disconnect = () => undefined as void;
    let cancelled = false;
    void import("socket.io-client").then(({ io }) => {
      if (cancelled) return;
      const socket = io(config.socketUrl, {
        path: "/ws/socket.io",
        transports: ["websocket"],
        auth: { token },
      });
      socket.on("connect", () => socket.emit("analytics:subscribe"));
      socket.on(
        "analytics:tick",
        (tick: { events: number; orders: number; revenueCents: number }) => {
          tickRef.current?.(tick);
          void queryClient.invalidateQueries({ queryKey: ["admin", "kpi"] });
        }
      );
      disconnect = () => {
        socket.emit("analytics:unsubscribe");
        socket.disconnect();
      };
    });
    return () => {
      cancelled = true;
      disconnect();
    };
  }, [enabled, token, queryClient]);
}

export async function downloadAuthed(path: string, filename: string, token: string): Promise<void> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("No se pudo descargar el archivo");
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}
